"""
Parvidya — Flask Backend (Production-Ready)
=========================================
Stack:
  • Python + Flask
  • MongoDB (primary) with local JSON fallback
  • LangChain + OpenAI GPT-4o / GPT-4o-mini
  • LangChain InMemoryVectorStore (per syllabus, session-scoped)
  • Vercel-compatible (read-only FS except /tmp)

Run locally:  python app.py
API base:     http://localhost:5001/api/...
"""

import os, json, re, uuid, hashlib, random, base64, shutil, smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from pathlib import Path
from functools import wraps
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

# ── LangChain ────────────────────────────────────────────────────────────────
try:
    from langchain_openai import ChatOpenAI, OpenAIEmbeddings
    from langchain_core.documents import Document
    from langchain_core.prompts import PromptTemplate
    from langchain_core.vectorstores import InMemoryVectorStore
    from langchain_core.messages import HumanMessage, SystemMessage
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    try:
        from langchain.chains import ConversationalRetrievalChain
        from langchain.memory import ConversationBufferMemory
    except ImportError:
        from langchain_classic.chains import ConversationalRetrievalChain
        from langchain_classic.memory import ConversationBufferMemory
    LANGCHAIN_OK = True
except ImportError as _lc_err:
    LANGCHAIN_OK = False
    print(f"[WARN] LangChain not available: {_lc_err}")

try:
    import openai as _oai
    OPENAI_OK = True
except ImportError:
    OPENAI_OK = False

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL   = os.getenv("OPENAI_MODEL", "gpt-4o")
OPENAI_MINI    = os.getenv("OPENAI_MINI_MODEL", "gpt-4o-mini")

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE      = Path(__file__).parent.parent
IS_VERCEL = os.environ.get("VERCEL") == "1"

TMP_ROOT  = Path("/tmp") if IS_VERCEL else BASE
DATA_F    = (TMP_ROOT / "platform_data.json") if IS_VERCEL else (BASE / "data" / "platform_data.json")
UPL_DIR   = (TMP_ROOT / "uploads")            if IS_VERCEL else (BASE / "uploads")
DB_DIR    = (TMP_ROOT / "study_db")           if IS_VERCEL else (BASE / "study_db")

EXAMS_DIR = DB_DIR / "exams"
EVAL_DIR  = DB_DIR / "evaluations"
BULK_DIR  = DB_DIR / "bulk_evaluations"

for _d in [DATA_F.parent, UPL_DIR, DB_DIR, EXAMS_DIR, EVAL_DIR, BULK_DIR]:
    _d.mkdir(parents=True, exist_ok=True)

ALLOWED = {"pdf","txt","md","mp3","mp4","wav","m4a","jpg","jpeg","png","webp"}

# ── Flask ─────────────────────────────────────────────────────────────────────
app = Flask(__name__, static_folder="dist", static_url_path="")
CORS(app, resources={r"/api/*": {"origins": "*"}})
app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024

@app.route("/api/uploads/<path:filename>")
def download_upload(filename):
    return send_from_directory(UPL_DIR, filename)

# ── In-memory session caches ──────────────────────────────────────────────────
TOKENS:                     Dict[str, str] = {}
syllabi_registry:           Dict[str, dict] = {}
qa_chains:                  Dict[str, Any]  = {}
vector_stores:              Dict[str, Any]  = {}
memories:                   Dict[str, Any]  = {}
exams_registry:             Dict[str, dict] = {}
evaluations_registry:       Dict[str, dict] = {}
bulk_evaluations_registry:  Dict[str, dict] = {}

# ── Registry file paths ───────────────────────────────────────────────────────
SYLLABI_REG_F = DB_DIR / "syllabi_registry.json"
EXAMS_REG_F   = DB_DIR / "exams_registry.json"
EVALS_REG_F   = DB_DIR / "evaluations_registry.json"
BULK_REG_F    = DB_DIR / "bulk_evaluations_registry.json"

def _save_json(path, obj):
    Path(path).write_text(json.dumps(obj, indent=2, default=str), encoding="utf-8")

def _load_json(path, default=None):
    p = Path(path)
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            pass
    return default if default is not None else {}

# ══════════════════════════════════════════════════════════════════════════════
#  MONGODB — Primary persistence layer
# ══════════════════════════════════════════════════════════════════════════════
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

# Quote credentials if embedded in URI
if MONGO_URI and "://" in MONGO_URI and "@" in MONGO_URI:
    try:
        from urllib.parse import quote_plus
        prefix, rest = MONGO_URI.split("://", 1)
        creds, cluster = rest.split("@", 1)
        if ":" in creds:
            user, pw = creds.split(":", 1)
            MONGO_URI = f"{prefix}://{quote_plus(user)}:{quote_plus(pw)}@{cluster}"
    except Exception as _uri_err:
        print(f"[MONGO] URI credential quoting skipped: {_uri_err}")

MONGO_OK = False
mongo_db = None

try:
    import pymongo, certifi
    mongo_client = pymongo.MongoClient(
        MONGO_URI,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=10000,
        tlsCAFile=certifi.where()
    )
    mongo_client.server_info()                  # Raises if unreachable
    mongo_db = mongo_client["vidyai"]
    MONGO_OK = True
    print("[INIT] ✅ MongoDB connected.")
except Exception as _mongo_err:
    print(f"[INIT] ⚠️  MongoDB unavailable — using JSON fallback: {_mongo_err}")

# ── MongoDB collection names ───────────────────────────────────────────────────
M_PLATFORM        = "platform_data"
M_SYLLABI         = "syllabi"
M_EXAMS           = "exams"
M_EVALS           = "evaluations"
M_BULK            = "bulk_evals"
M_SESSIONS        = "sessions"
M_PRACTICE_HIST   = "practice_history"

# ── MongoDB helpers ────────────────────────────────────────────────────────────
def _mongo_save(col: str, data, key: str = "registry_data"):
    """Upsert a document in a MongoDB collection."""
    if not MONGO_OK:
        return
    try:
        mongo_db[col].update_one({"_key": key}, {"$set": {"data": data, "_key": key}}, upsert=True)
    except Exception as e:
        print(f"[MONGO] Save error ({col}/{key}): {e}")

def _mongo_load(col: str, default=None, key: str = "registry_data"):
    """Load a document from a MongoDB collection."""
    if not MONGO_OK:
        return default
    try:
        doc = mongo_db[col].find_one({"_key": key})
        return doc["data"] if doc else default
    except Exception as e:
        print(f"[MONGO] Load error ({col}/{key}): {e}")
        return default

def _mongo_insert(col: str, doc: dict):
    """Insert a single document, stripping _id to avoid conflicts."""
    if not MONGO_OK:
        return
    try:
        doc.pop("_id", None)
        mongo_db[col].insert_one(doc)
    except Exception as e:
        print(f"[MONGO] Insert error ({col}): {e}")

def _mongo_find(col: str, query: dict) -> list:
    """Return all matching documents (without Mongo _id)."""
    if not MONGO_OK:
        return []
    try:
        return [{k: v for k, v in d.items() if k != "_id"} for d in mongo_db[col].find(query)]
    except Exception as e:
        print(f"[MONGO] Find error ({col}): {e}")
        return []

def _mongo_find_one(col: str, query: dict) -> Optional[dict]:
    """Return first matching document (without Mongo _id)."""
    if not MONGO_OK:
        return None
    try:
        d = mongo_db[col].find_one(query)
        if d:
            d.pop("_id", None)
        return d
    except Exception as e:
        print(f"[MONGO] FindOne error ({col}): {e}")
        return None

def _mongo_update(col: str, query: dict, update: dict, upsert: bool = False):
    """Run an update operation."""
    if not MONGO_OK:
        return
    try:
        mongo_db[col].update_one(query, update, upsert=upsert)
    except Exception as e:
        print(f"[MONGO] Update error ({col}): {e}")

def _mongo_delete(col: str, query: dict):
    if not MONGO_OK:
        return
    try:
        mongo_db[col].delete_one(query)
    except Exception as e:
        print(f"[MONGO] Delete error ({col}): {e}")

# ── Registry save/load with dual-write ────────────────────────────────────────
def _save_syllabi():
    _mongo_save(M_SYLLABI,  syllabi_registry)
    if not IS_VERCEL:
        _save_json(SYLLABI_REG_F, syllabi_registry)

def _save_exams():
    _mongo_save(M_EXAMS,    exams_registry)
    if not IS_VERCEL:
        _save_json(EXAMS_REG_F, exams_registry)

def _save_evals():
    _mongo_save(M_EVALS,    evaluations_registry)
    if not IS_VERCEL:
        _save_json(EVALS_REG_F, evaluations_registry)

def _save_bulk():
    _mongo_save(M_BULK,     bulk_evaluations_registry)
    if not IS_VERCEL:
        _save_json(BULK_REG_F, bulk_evaluations_registry)

def _boot_load():
    """On startup: load registries from MongoDB first, fall back to JSON."""
    global syllabi_registry, exams_registry, evaluations_registry, bulk_evaluations_registry

    def _load(col, file, default={}):
        data = _mongo_load(col)
        if data is None:
            data = _load_json(file, default)
            if data and MONGO_OK:
                print(f"[BOOT] Migrating {file.name} → MongoDB/{col}")
                _mongo_save(col, data)
        return data or {}

    syllabi_registry           = _load(M_SYLLABI, SYLLABI_REG_F)
    exams_registry             = _load(M_EXAMS,   EXAMS_REG_F)
    evaluations_registry       = _load(M_EVALS,   EVALS_REG_F)
    bulk_evaluations_registry  = _load(M_BULK,    BULK_REG_F)

    counts = {
        "syllabi":     len(syllabi_registry),
        "exams":       len(exams_registry),
        "evaluations": len(evaluations_registry),
    }
    print(f"[BOOT] Registry loaded: {counts}")

# ── Utility helpers ────────────────────────────────────────────────────────────
def _hash(pw: str)  -> str: return hashlib.sha256(pw.encode()).hexdigest()
def _uid()          -> str: return "u" + uuid.uuid4().hex[:8]
def _now()          -> str: return datetime.utcnow().isoformat()
def _allowed(fn)    -> bool: return "." in fn and fn.rsplit(".", 1)[1].lower() in ALLOWED
def _safe(u: dict)  -> dict: return {k: v for k, v in u.items() if k not in ("pw_hash", "_id")}
def _grade(p: float)-> str:
    return "A+" if p>=90 else "A" if p>=80 else "B" if p>=70 else "C" if p>=60 else "D" if p>=50 else "F"
def _normalize(t)   -> str: return re.sub(r"\s+", " ", str(t or "").strip().lower())

def _strip_answer_prefix(text: str) -> str:
    return re.sub(r"^(?:ans(?:wer)?|response|student\s*ans(?:wer)?)\s*[:\-]\s*", "", str(text or "").strip(), flags=re.IGNORECASE).strip()

def _coerce_mcq_answer(student_answer: str, options: Dict[str, str]) -> str:
    s = _normalize(_strip_answer_prefix(student_answer))
    if not s:
        return ""
    m = re.match(r"^(?:option\s*)?[\(\[\{]?\s*([a-d])\s*[\)\]\}]?$", s, flags=re.IGNORECASE)
    if m:
        return m.group(1).upper()
    for k, v in (options or {}).items():
        if _normalize(v) == s:
            return str(k).strip().upper()
    return student_answer.strip()

def _question_valid_answers(q: dict) -> List[str]:
    vals = q.get("valid_answers", [])
    if not vals:
        ans = str(q.get("answer", "")).strip()
        if ans:
            vals = [x.strip() for x in re.split(r"[,\n;/|]", ans) if x.strip()]
    return [str(v).strip() for v in vals if str(v).strip()]

def _objective_is_correct(q: dict, student_answer: str) -> bool:
    options = q.get("options") or {}
    student = _coerce_mcq_answer(student_answer, options)
    student_norm = _normalize(student)
    valid_raw = _question_valid_answers(q)
    valid_norm = set(_normalize(v) for v in valid_raw if str(v).strip())

    # Expand valid_norm: if a valid answer is a letter key (e.g. "A"),
    # also add the option text (e.g. "5"); if it is option text, also add the key.
    for ans in list(valid_raw):
        key = str(ans).strip().upper()
        if key in options:
            valid_norm.add(_normalize(options[key]))
            valid_norm.add(_normalize(key))
        else:
            # answer stored as text — find its matching option letter
            for k, v in options.items():
                if _normalize(v) == _normalize(ans):
                    valid_norm.add(_normalize(k))

    ans_field = str(q.get("answer", "")).strip()
    if ans_field:
        valid_norm.add(_normalize(ans_field))
        key = ans_field.upper()
        if key in options:
            # answer is a letter key → also accept the text value
            valid_norm.add(_normalize(options[key]))
        else:
            # answer is text → also accept the corresponding letter key
            for k, v in options.items():
                if _normalize(v) == _normalize(ans_field):
                    valid_norm.add(_normalize(k))

    # Extra bridge: if student submitted a letter, also compare its text to valid_norm
    student_upper = student.strip().upper()
    if student_upper in options:
        valid_norm.add(_normalize(options[student_upper]))

    return bool(student_norm and student_norm in valid_norm)
def _dtype(ext: str)-> str:
    return {"pdf":"PDF","txt":"Text","md":"Text","mp3":"Audio","wav":"Audio",
            "m4a":"Audio","mp4":"Video","jpg":"Image","jpeg":"Image","png":"Image"}.get(ext, "File")

# ── Default database seed ──────────────────────────────────────────────────────
def _default_db() -> dict:
    return {
        "users": [
            {"id":"u1","name":"Alex Johnson","email":"student@vidyai.in",
             "pw_hash":_hash("password"),"role":"student","institution":"Demo School",
             "roll_number":"101","joined":_now()[:10],"docs":0,"status":"active"},
            {"id":"u2","name":"Dr. Priya Sharma","email":"teacher@vidyai.in",
             "pw_hash":_hash("password"),"role":"teacher","institution":"Demo School",
             "joined":_now()[:10],"docs":0,"status":"active"},
            {"id":"u3","name":"Rajesh Kumar","email":"admin@vidyai.in",
             "pw_hash":_hash("password"),"role":"school_admin","institution":"Demo School",
             "joined":_now()[:10],"docs":0,"status":"active"},
            {"id":"u4","name":"Meena Iyer","email":"parent@vidyai.in",
             "pw_hash":_hash("password"),"role":"parent","institution":"",
             "joined":_now()[:10],"docs":0,"status":"active"},
        ],
        "documents": [],
        "activity": [],
        "settings": {
            "model":                  OPENAI_MODEL,
            "max_uploads_per_user":   20,
            "max_uploads_student":    5,
            "max_uploads_teacher":    30,
            "max_flashcards_default": 10,
            "max_questions_per_paper":30,
            "student_self_register":  True,
            "tutor_approval_required":False,
            "show_answer_explanations":True,
            "otp_required_for_signup": True,
            "email_reports_enabled":   True,
        }
    }

# ── DB load / save with MongoDB primary + JSON fallback ───────────────────────
def db_load() -> dict:
    # 1. MongoDB is the source of truth in production
    if MONGO_OK:
        data = _mongo_load(M_PLATFORM, key="main_db")
        if data:
            return data

    # 2. JSON file fallback (dev / offline)
    if DATA_F.exists():
        try:
            d = json.loads(DATA_F.read_text())
            if MONGO_OK:
                print("[MIGRATE] JSON → MongoDB sync")
                _mongo_save(M_PLATFORM, d, key="main_db")
            return d
        except Exception:
            pass

    # 3. Bootstrap with seed data
    print("[WARN] Seeding empty database")
    d = _default_db()
    if MONGO_OK:
        _mongo_save(M_PLATFORM, d, key="main_db")
    return d

def db_save(d: dict):
    if MONGO_OK:
        _mongo_save(M_PLATFORM, d, key="main_db")
    if not IS_VERCEL:
        try:
            DATA_F.write_text(json.dumps(d, indent=2, default=str))
        except Exception as e:
            print(f"[DB] JSON write failed: {e}")

def db_log(db: dict, uid: str, action: str, detail: str):
    db["activity"].insert(0, {
        "id": uuid.uuid4().hex[:6], "user_id": uid,
        "action": action, "detail": detail, "ts": _now()
    })
    db["activity"] = db["activity"][:200]

# ── Email helper ───────────────────────────────────────────────────────────────
def send_email_report(to_email: str, subject: str, results: list) -> bool:
    host   = os.getenv("SMTP_HOST")
    port   = int(os.getenv("SMTP_PORT", 587))
    user   = os.getenv("SMTP_USER")
    passwd = os.getenv("SMTP_PASS")
    sender = os.getenv("SMTP_FROM", user)

    if not all([host, user, passwd]):
        print("[SMTP] Missing credentials — skipping email.")
        return False

    try:
        msg = MIMEMultipart()
        msg["From"], msg["To"], msg["Subject"] = sender, to_email, subject
        rows = "".join(
            f"<li><b>{r.get('question','')}</b><br/>"
            f"Score: {r.get('evaluation',{}).get('score',0)}/10<br/>"
            f"Feedback: {r.get('evaluation',{}).get('feedback','N/A')}</li>"
            for r in results
        )
        html = f"<h2>Your AI Practice Results — VidyAI</h2><ul>{rows}</ul><p>Keep it up! — Parvidya Team</p>"
        msg.attach(MIMEText(html, "html"))
        with smtplib.SMTP(host, port) as s:
            s.starttls(); s.login(user, passwd); s.send_message(msg)
        return True
    except Exception as e:
        print(f"[SMTP] {e}")
        return False

# ══════════════════════════════════════════════════════════════════════════════
#  AI / LANGCHAIN HELPERS
# ══════════════════════════════════════════════════════════════════════════════
def _get_llm(temperature: float = 0.3, mini: bool = False):
    model = OPENAI_MINI if mini else OPENAI_MODEL
    return ChatOpenAI(model_name=model, temperature=temperature, openai_api_key=OPENAI_API_KEY)

def _get_emb():
    return OpenAIEmbeddings(openai_api_key=OPENAI_API_KEY)

def _clean_json(raw: str):
    """Strip markdown fences and parse JSON."""
    clean = re.sub(r"```(?:json)?|```", "", raw).strip()
    # Strip leading text before first [ or {
    m = re.search(r"[\[\{]", clean)
    if m:
        clean = clean[m.start():]
    return json.loads(clean)

def _llm_text(prompt: str, temperature: float = 0.3, mini: bool = False) -> str:
    if not LANGCHAIN_OK or not OPENAI_API_KEY:
        return "(AI unavailable — check OPENAI_API_KEY)"
    return _get_llm(temperature=temperature, mini=mini).invoke(prompt).content

def _llm_json(prompt: str, temperature: float = 0.2, mini: bool = False):
    raw = _llm_text(prompt, temperature=temperature, mini=mini)
    try:
        return _clean_json(raw)
    except Exception:
        # Second attempt: find array or object in the response
        for pat in [r"\[.*\]", r"\{.*\}"]:
            m = re.search(pat, raw, re.DOTALL)
            if m:
                try:
                    return json.loads(m.group())
                except Exception:
                    pass
        print(f"[LLM JSON parse fail] raw snippet: {raw[:200]}")
        return {"error": "Could not parse AI response as JSON", "raw": raw[:500]}

def _load_vs(did: str):
    """Retrieve InMemoryVectorStore from session cache or re-index from disk."""
    if did in vector_stores:
        return vector_stores[did]
    db  = db_load()
    doc = next((d for d in db.get("documents", []) if d["id"] == did), None)
    if doc and doc.get("path") and Path(doc["path"]).exists():
        _index_doc(Path(doc["path"]), did, doc["ext"])
        return vector_stores.get(did)
    return None

def _index_doc(path: Path, did: str, ext: str):
    """Parse file → chunk → embed → InMemoryVectorStore.  Returns (chunk_count, chapters)."""
    if not LANGCHAIN_OK or not OPENAI_API_KEY:
        return 0, []
    try:
        ext_l = ext.lower()
        if ext_l == "pdf":
            import pypdf
            reader = pypdf.PdfReader(str(path))
            docs = [Document(page_content=p.extract_text(), metadata={"source": str(path), "page": i})
                    for i, p in enumerate(reader.pages) if p.extract_text()]
        elif ext_l in {"txt", "md"}:
            docs = [Document(page_content=path.read_text(encoding="utf-8"), metadata={"source": str(path)})]
        elif ext_l in {"mp3", "mp4", "wav", "m4a", "ogg"}:
            client = _oai.OpenAI(api_key=OPENAI_API_KEY)
            with open(path, "rb") as f:
                transcript = client.audio.transcriptions.create(model="whisper-1", file=f, response_format="text")
            docs = [Document(page_content=transcript, metadata={"source": str(path), "type": "transcript"})]
        else:
            return 0, []

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000, chunk_overlap=150, separators=["\n\n", "\n", ".", " "]
        )
        chunks = splitter.split_documents(docs)
        vs = InMemoryVectorStore.from_documents(chunks, _get_emb())
        vector_stores[did] = vs
        chapters = _extract_chapters(docs)
        return len(chunks), chapters
    except Exception as e:
        print(f"[INDEX] {did}: {e}")
        return 0, []

def _extract_chapters(docs: list) -> list:
    try:
        sample = "\n\n".join(d.page_content for d in docs[:6])[:3000]
        prompt = CHAPTER_EXTRACT_PROMPT.replace("{context}", sample)
        result = _llm_json(prompt, temperature=0.1, mini=True)
        if isinstance(result, list):
            return [str(c).strip() for c in result if str(c).strip()]
    except Exception as e:
        print(f"[CHAPTERS] {e}")
    return []

def _get_chain(syllabus_id: str):
    """Build or retrieve a ConversationalRetrievalChain for a syllabus."""
    if syllabus_id in qa_chains:
        return qa_chains[syllabus_id]

    vs = _load_vs(syllabus_id)
    if not vs:
        # Virtual chain for curriculum-hub syllabi without real documents
        class _VirtualChain:
            def __init__(self, sid): self.sid = sid
            def __call__(self, inputs):
                q    = inputs.get("question", "")
                name = syllabi_registry.get(self.sid, {}).get("name", "Curriculum")
                ans  = _llm_text(
                    f"You are an AI tutor for {name}. Answer helpfully: {q}", mini=True
                )
                return {"answer": ans, "source_documents": []}
        return _VirtualChain(syllabus_id)

    retriever = vs.as_retriever(search_type="mmr", search_kwargs={"k": 5})
    if syllabus_id not in memories:
        memories[syllabus_id] = ConversationBufferMemory(
            memory_key="chat_history", return_messages=True, output_key="answer"
        )
    kwargs = {}
    if STUDY_PROMPT:
        kwargs["combine_docs_chain_kwargs"] = {"prompt": STUDY_PROMPT}
    chain = ConversationalRetrievalChain.from_llm(
        llm=_get_llm(), retriever=retriever,
        memory=memories[syllabus_id], return_source_documents=True,
        verbose=False, **kwargs
    )
    qa_chains[syllabus_id] = chain
    return chain

def _evaluate_answers(exam: dict, submitted: Dict[int, str], roll_no: str = "") -> dict:
    """Grade submitted answers against an exam's answer key."""
    evals, total_awarded, total_possible = [], 0.0, 0.0
    for q in exam.get("questions", []):
        qid    = int(q["id"])
        qtype  = q.get("type", "objective")
        max_m  = float(q.get("weightage", q.get("marks", 1)))
        student = str(submitted.get(qid, "")).strip()
        total_possible += max_m

        if qtype == "objective":
            correct = _objective_is_correct(q, student)
            awarded = max_m if correct else 0.0
            total_awarded += awarded
            evals.append({
                "question_id": qid, "type": "objective", "student_answer": student,
                "valid_answers": q.get("valid_answers", []), "is_correct": correct,
                "awarded_marks": awarded, "max_marks": max_m,
                "feedback": "Correct ✓" if correct else "Incorrect ✗"
            })
        else:
            prompt = SUBJECTIVE_GRADING_PROMPT.format(
                question=q.get("question", ""), max_marks=max_m,
                valid_answers=json.dumps(q.get("valid_answers", [])),
                key_points=json.dumps(q.get("answer_key_points", [])),
                rubric=q.get("evaluation_rubric", ""), student_answer=student
            )
            try:
                grade = _llm_json(prompt, temperature=0)
            except Exception:
                grade = {}
            awarded = max(0.0, min(max_m, float(grade.get("awarded_marks", 0))))
            total_awarded += awarded
            evals.append({
                "question_id": qid, "type": "subjective", "student_answer": student,
                "valid_answers": q.get("valid_answers", []),
                "answer_key_points": q.get("answer_key_points", []),
                "awarded_marks": awarded, "max_marks": max_m,
                "feedback": grade.get("feedback", ""),
                "missing_points": grade.get("missing_points", []),
                "strengths": grade.get("strengths", []),
                "confidence": grade.get("confidence", None),
            })

    pct = round((total_awarded / total_possible) * 100, 2) if total_possible else 0.0
    improvement = ""
    if any(e.get("type") == "subjective" for e in evals) and pct < 90.0:
        try:
            fb = " | ".join(e.get("feedback", "") for e in evals if e.get("type") == "subjective")
            improvement = _llm_text(
                f"Based on this feedback: '{fb}', give one short encouraging sentence about what the student needs to improve.",
                mini=True
            ).strip()
        except Exception:
            improvement = "Keep practising subjective responses."
    elif pct >= 90.0:
        improvement = "Excellent work! Maintain this standard."

    return {
        "roll_no": roll_no, "total_possible": total_possible, "total_awarded": total_awarded,
        "percentage": pct, "grade": _grade(pct), "is_pass": pct >= 40.0,
        "improvement_prediction": improvement, "question_wise": evals
    }

def _build_ocr_prompt(exam_questions: list) -> str:
    """
    Build a layout-aware OCR prompt for GPT Vision.
    Accurately describes both layout patterns used by this app's question papers:
      - Objective (Q1–Q6 etc.): printed MCQ options A/B/C/D + "Answer: ____" line
      - Subjective (Q7+ etc.): no Answer: line — student writes in blank ruled space
    """
    obj_qs  = [q for q in exam_questions if q.get("type", "objective") == "objective"]
    subj_qs = [q for q in exam_questions if q.get("type", "objective") != "objective"]

    obj_ids  = ", ".join(str(q["id"]) for q in obj_qs)  if obj_qs  else "none"
    subj_ids = ", ".join(str(q["id"]) for q in subj_qs) if subj_qs else "none"

    # Per-question reference list with the exact question text so the model
    # can locate each question block on the page
    q_lines = []
    for q in sorted(exam_questions, key=lambda x: int(x.get("id", 0))):
        qtype = "MCQ" if q.get("type", "objective") == "objective" else "Written"
        q_lines.append(f"  Q{q['id']} [{qtype}]: {str(q.get('question', ''))[:90]}")
    question_ref = ("\nQuestion reference (DO NOT copy these as student answers):\n"
                    + "\n".join(q_lines)) if q_lines else ""

    obj_instruction = (
        "  • Objective / MCQ questions (numbers: {obj_ids}):\n"
        "    - These have four printed options (A B C D) followed by a blank line\n"
        "      labelled \"Answer: __________\".\n"
        "    - The student writes or circles ONE letter in that blank.\n"
        "    - Extract that single letter (A, B, C, or D) as the answer.\n"
    ).format(obj_ids=obj_ids)

    subj_instruction = (
        "  • Subjective / written questions (numbers: {subj_ids}):\n"
        "    - These have NO printed \"Answer:\" line.\n"
        "    - The student writes their response in the blank ruled space below the question.\n"
        "    - Extract ALL of the student's handwritten text in that space as the answer.\n"
        "    - Do NOT copy the printed question text itself — only the student's written response.\n"
    ).format(subj_ids=subj_ids)

    return (
        "You are reading a scanned STUDENT ANSWER SHEET.\n"
        "This sheet was generated by the VidyAI system and has two sections:\n\n"
        + obj_instruction + "\n"
        + subj_instruction + "\n"
        "General rules:\n"
        "  1. NEVER copy printed question text as an answer.\n"
        "  2. If a student left a question blank, omit it from the output entirely.\n"
        "  3. For MCQ: output only the letter (A/B/C/D), not the option text.\n"
        "  4. For written: output the student's full handwritten response verbatim.\n"
        + question_ref + "\n\n"
        "Return ONLY valid JSON — no markdown, no explanation:\n"
        + '{"answers": {"1": "A", "2": "C", "6": "A", "7": "In a right triangle...", "8": "Step 1..."}}' + "\n"
        "If no student answers are visible, return: {\"answers\": {}}"
    )

def _validate_ocr_answers(raw_answers: dict, exam_questions: list) -> Dict[int, str]:
    """
    Post-process raw OCR answers dict to reject noise:
    - Values that look like question text fragments (long sentences ending in ?)
    - Values that contain question-paper header phrases
    - Values that are garbled OCR of section headers or marks annotations
    - Keys that don't correspond to actual exam question IDs
    Valid question IDs from the exam; anything outside is noise.
    """
    valid_ids = {int(q.get("id", 0)) for q in exam_questions} if exam_questions else None

    NOISE_PATTERNS = re.compile(
        r"(?:section\s+[AB]|objective\s+questions?|subjective\s+questions?|"
        r"general\s+instructions?|total\s+marks|roll\s+number|student\s+name|"
        r"marks?\s+obtained|date:|answer\s+sheet|vidyai|cbse|icse|marks?\])",
        re.IGNORECASE
    )
    # MCQ answer: should be a single letter A-D (possibly with punctuation)
    MCQ_IDS = {int(q["id"]) for q in exam_questions
               if q.get("type", "objective") == "objective"} if exam_questions else set()

    result: Dict[int, str] = {}
    for k, v in raw_answers.items():
        try:
            qid = int(str(k).strip())
        except ValueError:
            continue
        val = str(v).strip()
        if not val:
            continue

        # Reject if question ID not in exam
        if valid_ids and qid not in valid_ids:
            continue

        # For MCQ questions: value must BE a single letter A-D (≤5 chars total).
        # If the OCR returned a long string for an MCQ, it grabbed question text
        # — reject it entirely rather than fish a letter out of garbage.
        if qid in MCQ_IDS:
            stripped = re.sub(r"[^A-Da-d]", "", val)
            if len(val.strip()) <= 5 and len(stripped) == 1:
                result[qid] = stripped.upper()
            # else: long string or no clear letter — skip (noise or blank)
            continue

        # For subjective: reject obvious noise
        if NOISE_PATTERNS.search(val):
            print(f"[OCR-VALIDATE] Rejected Q{qid} noise: {val[:60]}")
            continue
        if val.endswith("?") and len(val) > 40:
            print(f"[OCR-VALIDATE] Rejected Q{qid} question-text: {val[:60]}")
            continue
        if len(val) < 3:
            continue

        result[qid] = val

    return result


def _extract_answers(path: str, exam_questions: list = None):
    """Extract student answers from an answer sheet file."""
    exam_questions = exam_questions or []
    ext = Path(path).suffix.lower()

    if ext in {".txt", ".md"}:
        return _parse_answer_text(Path(path).read_text(encoding="utf-8", errors="ignore")), "parsed_text"

    if ext == ".pdf":
        # ── Detect whether this is a typed digital submission or a
        #    printed+handwritten scan. Key signal: if the extracted text
        #    contains blank "Answer: ___" lines, it's the printed question paper
        #    with no typed answers — skip text extraction and go straight to vision.
        raw_text = ""
        try:
            from langchain_community.document_loaders import PyPDFLoader
            pages = PyPDFLoader(path).load()
            raw_text = "\n".join(p.page_content for p in pages if p.page_content)
        except ImportError:
            try:
                import pypdf as _pypdf2
                _r2 = _pypdf2.PdfReader(path)
                raw_text = "\n".join((p.extract_text() or "") for p in _r2.pages)
            except Exception:
                pass
        except Exception:
            pass

        IS_BLANK_PAPER = bool(raw_text and re.search(
            r"Answer\s*:\s*_{3,}", raw_text, re.IGNORECASE
        ))

        # ── Path A: Typed/digital answer submission ───────────────────────────
        if raw_text.strip() and not IS_BLANK_PAPER:
            ans = _parse_answer_text(raw_text)
            if ans:
                return ans, "parsed_pdf"
            # Regex missed — let GPT parse the raw text
            try:
                client = _oai.OpenAI(api_key=OPENAI_API_KEY)
                gpt_resp = client.chat.completions.create(
                    model=OPENAI_MINI, temperature=0,
                    response_format={"type": "json_object"},
                    messages=[{"role": "user", "content": (
                        _build_ocr_prompt(exam_questions) +
                        "\n\nRaw text from the PDF (contains both question text and "
                        "student answers — extract ONLY the student answers):\n\n" +
                        raw_text[:5000]
                    )}]
                )
                raw_gpt = json.loads(gpt_resp.choices[0].message.content)
                gpt_ans = {int(k): str(v).strip() for k, v in raw_gpt.get("answers", {}).items()
                           if str(k).isdigit() and str(v).strip()}
                if gpt_ans:
                    return gpt_ans, "gpt_text_parse"
            except Exception as _gpt_txt_err:
                print(f"[PDF-TEXT-GPT] {_gpt_txt_err}")

        # ── Path B: Scanned / handwritten PDF ────────────────────────────────
        # Key insight: the page contains BOTH printed question-paper text AND
        # the student's handwriting. A single whole-page prompt causes GPT to
        # read the dominant printed text and miss the handwriting.
        #
        # Solution — two-stage extraction:
        #   Stage 1: Send the page image together with the printed text layer
        #            and ask GPT to report ONLY text that is NOT in the printed
        #            layer (i.e., pure handwritten additions).
        #   Stage 2: If Stage 1 returns nothing useful, fall back to per-question
        #            targeted extraction asking specifically about each answer blank.
        if IS_BLANK_PAPER:
            print("[PDF-OCR] Printed question paper detected — using handwriting-diff OCR")

        try:
            from pdf2image import convert_from_path
            import io as _io
            images = convert_from_path(path, dpi=300)
            combined: Dict[int, str] = {}
            client = _oai.OpenAI(api_key=OPENAI_API_KEY)

            for img in images:
                buf = _io.BytesIO()
                img.save(buf, format="PNG")
                img_b64 = base64.b64encode(buf.getvalue()).decode()

                # ── Stage 1: diff-based extraction ───────────────────────────
                # Provide the printed text so GPT knows what to IGNORE,
                # then asks only for content the student added by hand.
                printed_layer = raw_text[:4000] if raw_text.strip() else ""
                obj_qs  = [q for q in exam_questions if q.get("type","objective") == "objective"]
                subj_qs = [q for q in exam_questions if q.get("type","objective") != "objective"]
                obj_ids  = ", ".join(str(q["id"]) for q in obj_qs)  or "none"
                subj_ids = ", ".join(str(q["id"]) for q in subj_qs) or "none"

                q_ref = "\n".join(
                    f"Q{q['id']}: {str(q.get('question',''))[:70]}"
                    for q in sorted(exam_questions, key=lambda x: int(x.get("id",0)))
                ) if exam_questions else ""

                diff_prompt = (
                    "You are analysing a scanned student answer sheet.\n"
                    "The sheet is a PRINTED question paper that the student has filled in by hand.\n\n"
                    "PRINTED TEXT already on the paper (ignore all of this):\n"
                    "---\n" + (printed_layer if printed_layer else "(not available)") + "\n---\n\n"
                    "QUESTION REFERENCE:\n" + (q_ref if q_ref else "(not provided)") + "\n\n"
                    "YOUR TASK — find and read ONLY the student's handwritten additions:\n"
                    f"• Objective questions {obj_ids}: student circles or writes ONE letter (A/B/C/D) "
                    "in the blank after 'Answer:'. Read that letter.\n"
                    f"• Subjective questions {subj_ids}: student writes sentences in the blank space "
                    "below the question. Read that handwritten text.\n\n"
                    "CRITICAL: Do NOT return any text that appears in the PRINTED TEXT section above.\n"
                    "If a student left a question blank, omit it.\n\n"
                    "Return ONLY valid JSON:\n"
                    + '{"answers": {"1":"A","2":"B","7":"student wrote this","8":"student wrote this"}}' 
                )

                resp = client.chat.completions.create(
                    model=OPENAI_MODEL,
                    temperature=0,
                    response_format={"type": "json_object"},
                    messages=[{"role": "user", "content": [
                        {"type": "text",      "text": diff_prompt},
                        {"type": "image_url", "image_url": {
                            "url":    f"data:image/png;base64,{img_b64}",
                            "detail": "high"
                        }}
                    ]}]
                )
                stage1 = json.loads(resp.choices[0].message.content)
                page_ans = _validate_ocr_answers(stage1.get("answers", {}), exam_questions)
                print(f"[PDF-OCR] Stage-1 extracted: {list(page_ans.keys())}")

                # ── Stage 2: per-question targeted pass for any missing Qs ──
                answered = set(page_ans.keys())
                missing  = [q for q in exam_questions if int(q.get("id",0)) not in answered]

                if missing:
                    missing_lines = "\n".join(
                        f"Q{q['id']} [{'MCQ' if q.get('type','objective')=='objective' else 'Written'}]: "
                        f"{str(q.get('question',''))[:70]}"
                        for q in missing
                    )
                    targeted_prompt = (
                        "You are reading a scanned handwritten exam answer sheet.\n\n"
                        "I need you to find the student's handwritten answer for EACH of these "
                        "specific questions. Look carefully — the answers may be small, faint, "
                        "or written in cursive.\n\n"
                        "Questions to find answers for:\n" + missing_lines + "\n\n"
                        "For MCQ questions: look for a circled or written letter A, B, C, or D "
                        "in the blank line labelled 'Answer:' below the options.\n"
                        "For written questions: look for handwritten sentences in the blank "
                        "space below the question text.\n\n"
                        "If genuinely blank/unanswered, omit that question.\n"
                        "Return ONLY valid JSON: {\"answers\": {\"7\": \"...\", \"8\": \"...\"}}"
                    )
                    resp2 = client.chat.completions.create(
                        model=OPENAI_MODEL,
                        temperature=0,
                        response_format={"type": "json_object"},
                        messages=[{"role": "user", "content": [
                            {"type": "text",      "text": targeted_prompt},
                            {"type": "image_url", "image_url": {
                                "url":    f"data:image/png;base64,{img_b64}",
                                "detail": "high"
                            }}
                        ]}]
                    )
                    stage2 = json.loads(resp2.choices[0].message.content)
                    stage2_ans = _validate_ocr_answers(stage2.get("answers", {}), exam_questions)
                    print(f"[PDF-OCR] Stage-2 filled in: {list(stage2_ans.keys())}")
                    page_ans.update(stage2_ans)

                combined.update(page_ans)

            if combined:
                return combined, "vision_ocr_pdf"

        except Exception as _pdf2img_err:
            print(f"[PDF-OCR] pdf2image failed: {_pdf2img_err}")

        # ── Path C: pdf2image unavailable — text-only GPT fallback ───────────
        if raw_text.strip():
            try:
                client = _oai.OpenAI(api_key=OPENAI_API_KEY)
                resp = client.chat.completions.create(
                    model=OPENAI_MINI, temperature=0,
                    response_format={"type": "json_object"},
                    messages=[{"role": "user", "content": (
                        _build_ocr_prompt(exam_questions) +
                        "\n\nThe following raw text was extracted from the PDF. It is the PRINTED "
                        "question paper template — look for any student-typed answers that appear "
                        "AFTER each 'Answer:' label (ignore blank underscores):\n\n" +
                        raw_text[:4000]
                    )}]
                )
                raw = json.loads(resp.choices[0].message.content)
                ans = _validate_ocr_answers(raw.get("answers", {}), exam_questions)
                if ans:
                    return ans, "llm_text_extract"
            except Exception as _fb_err:
                print(f"[PDF-OCR] Text fallback failed: {_fb_err}")

        return {}, "pdf_unreadable"

    if ext in {".png", ".jpg", ".jpeg", ".webp"}:
        # For direct image uploads, use two-stage extraction (same as scanned PDF)
        try:
            import io as _io
            from PIL import Image as _PIL
            with open(path, "rb") as _f:
                img_b64 = base64.b64encode(_f.read()).decode()
            ext_clean = ext.replace(".", "") or "png"

            client = _oai.OpenAI(api_key=OPENAI_API_KEY)
            obj_qs  = [q for q in exam_questions if q.get("type","objective") == "objective"]
            subj_qs = [q for q in exam_questions if q.get("type","objective") != "objective"]
            obj_ids  = ", ".join(str(q["id"]) for q in obj_qs)  or "none"
            subj_ids = ", ".join(str(q["id"]) for q in subj_qs) or "none"
            q_ref = "\n".join(
                f"Q{q['id']}: {str(q.get('question',''))[:70]}"
                for q in sorted(exam_questions, key=lambda x: int(x.get("id",0)))
            ) if exam_questions else ""

            diff_prompt = (
                "You are analysing a scanned student answer sheet.\n"
                "The sheet is a printed question paper that the student has filled in by hand.\n\n"
                "QUESTION REFERENCE (printed text to ignore):\n" + (q_ref or "(not provided)") + "\n\n"
                "YOUR TASK: find ONLY the student's handwritten additions.\n"
                f"• Objective questions {obj_ids}: student circles/writes A/B/C/D in the 'Answer:' blank.\n"
                f"• Subjective questions {subj_ids}: student writes sentences in blank space below question.\n"
                "Do NOT return any printed question text. If blank, omit.\n"
                "Return ONLY valid JSON: {\"answers\": {\"1\":\"A\",\"7\":\"student wrote...\"}}"
            )
            resp = client.chat.completions.create(
                model=OPENAI_MODEL, temperature=0,
                response_format={"type": "json_object"},
                messages=[{"role": "user", "content": [
                    {"type": "text", "text": diff_prompt},
                    {"type": "image_url", "image_url": {
                        "url": f"data:image/{ext_clean};base64,{img_b64}", "detail": "high"
                    }}
                ]}]
            )
            raw = json.loads(resp.choices[0].message.content)
            ans = _validate_ocr_answers(raw.get("answers", {}), exam_questions)
            if ans:
                return ans, "vision_ocr"
        except Exception as _img_err:
            print(f"[IMG-OCR] {_img_err}")
        # Fallback to simple vision extract
        return _vision_extract(path, _build_ocr_prompt(exam_questions)), "vision_ocr"

    return {}, "unsupported_type"

def _parse_answer_text(text: str) -> Dict[int, str]:
    """
    Parse student answers from text in multiple formats:

    Format A — Objective with Answer: line (Section A of this app's papers):
        Q1. What is pi?
        A) 3.14  B) 3.15  C) 3.16  D) 3.17
        Answer: A

    Format B — Subjective with written response (Section B, no Answer: line):
        Q7. Explain the Pythagorean theorem.
        In a right-angled triangle, the square of the hypotenuse equals...

    Format C — Inline (Q1: A  or  1. A):
        Q1: A
        1. A
    """
    answers: Dict[int, str] = {}
    lines = [ln.rstrip() for ln in text.splitlines()]

    # Compiled patterns
    Q_NUM      = re.compile(r"^Q(?:uestion)?\s*(\d+)[\.\s]|^(\d+)\s*[\)\.\-]", re.IGNORECASE)
    ANS_LABEL  = re.compile(r"^(?:ans(?:wer)?|response|solution)\s*[:\-]\s*(.*)", re.IGNORECASE)
    OPTION_ROW = re.compile(r"^[A-D]\s*[\):\.]", re.IGNORECASE)   # "A) 3.14  B) 3.15 ..."
    BLANK_LINE = re.compile(r"^[_\-\s]*$")
    INLINE_PAT = re.compile(r"^Q?(\d+)\s*[\.\)\-:]\s*(.+)", re.IGNORECASE)

    # ── Pass 1: fast inline check ─────────────────────────────────────────────
    # Only matches SHORT answer values that look like answers, not question text.
    # Criteria: value must be ≤60 chars, must NOT end with "?", must NOT contain
    # "[N mark" (mark annotations), must NOT start with a capital question word.
    QUESTION_WORDS = re.compile(
        r"^(?:what|which|why|how|when|where|explain|describe|define|"
        r"calculate|find|solve|prove|show|discuss|evaluate|compare|list)",
        re.IGNORECASE
    )
    for ln in lines:
        s = ln.strip()
        if not s:
            continue
        m = INLINE_PAT.match(s)
        if m:
            val = m.group(2).strip()
            if BLANK_LINE.match(val):
                continue
            # Reject if it looks like question text
            if val.endswith("?"):
                continue
            if "[" in val and "mark" in val.lower():
                continue
            if len(val) > 80:
                continue
            if QUESTION_WORDS.match(val):
                continue
            answers[int(m.group(1))] = val

    # ── Pass 2: block-aware walk ──────────────────────────────────────────────
    # State machine: track current question number and accumulate written lines
    current_qnum: Optional[int] = None
    written_lines: list = []          # accumulates subjective answer lines
    in_mcq_block: bool = False        # True while inside an MCQ options block

    def _flush(qnum, wlines):
        """Commit accumulated subjective answer lines for qnum."""
        if qnum is None or qnum in answers:
            return
        text_val = " ".join(wlines).strip()
        text_val = re.sub(r"\s+", " ", text_val)
        if text_val and not BLANK_LINE.match(text_val):
            answers[qnum] = text_val

    for ln in lines:
        s = ln.strip()

        # New question heading?
        mq = Q_NUM.match(s)
        if mq:
            # Flush previous subjective block first
            _flush(current_qnum, written_lines)
            written_lines = []
            qn = mq.group(1) or mq.group(2)
            current_qnum = int(qn) if qn else current_qnum
            in_mcq_block = False
            continue

        # MCQ option row (A) 3.14  B) 3.15 ...) — skip, not an answer
        if OPTION_ROW.match(s):
            in_mcq_block = True
            continue

        # Answer: label line
        ma = ANS_LABEL.match(s)
        if ma:
            val = ma.group(1).strip()
            if not BLANK_LINE.match(val) and val:
                if current_qnum is not None and current_qnum not in answers:
                    answers[current_qnum] = val
            # Reset — Answer: line closes this block regardless
            written_lines = []
            in_mcq_block = False
            continue

        # Empty / underscore-only line
        if not s or BLANK_LINE.match(s):
            continue

        # Remaining non-empty line — could be subjective written answer
        # Only accumulate if: not in MCQ block, not a header/instruction line
        SKIP_PAT = re.compile(
            r"^(?:section|general\s+instructions?|date|student\s+name|"
            r"roll\s+number|marks|class|about:blank|[0-9]{1,2}/[0-9]{1,2}/[0-9]{4})",
            re.IGNORECASE
        )
        if not in_mcq_block and current_qnum is not None and not SKIP_PAT.match(s):
            # Skip if it looks like a question (ends with ? or starts with capitalised instruction)
            if not s.endswith("?") and len(s) > 2:
                written_lines.append(s)

    # Flush last block
    _flush(current_qnum, written_lines)

    return answers

def _vision_extract(image_path: str, prompt: str = None) -> Dict[int, str]:
    client = _oai.OpenAI(api_key=OPENAI_API_KEY)
    ext    = Path(image_path).suffix.lower().replace(".", "") or "png"
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    if not prompt:
        prompt = ('Extract student answers from this answer sheet. '
                  'Return JSON only: {"answers":{"1":"...","2":"..."}}. '
                  'Omit unreadable questions. Never copy printed question text.')
    resp = client.chat.completions.create(
        model=OPENAI_MINI, temperature=0,
        response_format={"type": "json_object"},
        messages=[{"role": "user", "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:image/{ext};base64,{b64}"}}
        ]}]
    )
    raw = json.loads(resp.choices[0].message.content)
    return {int(k): str(v).strip() for k, v in raw.get("answers", {}).items()
            if str(k).isdigit() and str(v).strip()}

def _run_audit(exam: dict, evaluation: dict) -> dict:
    diffs, obj_ok, subj_ok = [], 0, 0
    for item in evaluation.get("question_wise", []):
        qid = item.get("question_id")
        q   = next((x for x in exam.get("questions", []) if int(x.get("id", -1)) == int(qid)), None)
        if not q:
            continue
        if item.get("type") == "objective":
            obj_ok += 1
            valid  = [_normalize(a) for a in q.get("valid_answers", [])]
            exp    = float(q.get("weightage", 1)) if _normalize(item.get("student_answer", "")) in valid else 0.0
            if abs(float(item.get("awarded_marks", 0)) - exp) > 1e-6:
                diffs.append({"question_id": qid, "kind": "objective_mismatch",
                               "existing": item.get("awarded_marks", 0), "expected": exp})
        else:
            subj_ok += 1
            max_m = float(q.get("weightage", 1))
            prompt = SUBJECTIVE_GRADING_PROMPT.format(
                question=q.get("question", ""), max_marks=max_m,
                valid_answers=json.dumps(q.get("valid_answers", [])),
                key_points=json.dumps(q.get("answer_key_points", [])),
                rubric=q.get("evaluation_rubric", ""),
                student_answer=item.get("student_answer", "")
            )
            try:
                regrade = _llm_json(prompt, temperature=0)
            except Exception:
                regrade = {}
            exp   = max(0.0, min(max_m, float(regrade.get("awarded_marks", 0))))
            delta = abs(exp - float(item.get("awarded_marks", 0)))
            if delta > 0.5:
                diffs.append({"question_id": qid, "kind": "subjective_variance",
                               "existing": item.get("awarded_marks", 0),
                               "regraded": exp, "delta": round(delta, 2)})
    total = obj_ok + subj_ok
    return {
        "objective_checked": obj_ok, "subjective_checked": subj_ok, "total_checked": total,
        "inconsistencies": diffs,
        "consistency_score": 100.0 if total == 0 else round(((total - len(diffs)) / total) * 100, 2)
    }

# ══════════════════════════════════════════════════════════════════════════════
#  PROMPTS
# ══════════════════════════════════════════════════════════════════════════════
STUDY_PROMPT = None
if LANGCHAIN_OK:
    STUDY_PROMPT = PromptTemplate(
        input_variables=["context", "chat_history", "question"],
        template="""You are a patient tutor helping a student understand complex concepts.
Style: ELI5 explanations • 1–2 real-world examples • analogies where possible • end with a 1-sentence summary.
Use ONLY information from the uploaded materials. If the answer isn't there, say so honestly.

--- Materials ---
{context}

--- Chat History ---
{chat_history}

Student Question: {question}

Tutor Answer:"""
    )

CHAPTER_EXTRACT_PROMPT = """You are analysing a study document.
Extract all chapter titles, unit names, or major topic headings from the content below.
Return ONLY a valid JSON array of strings — no markdown, no explanation.
Keep each item 2–6 words. Return 3–12 items.

Content:
{context}

JSON array only:"""

MIXED_QUESTION_GEN_PROMPT = """You are an expert exam paper setter.
Generate exactly {total_count} exam questions from the context only.
Output EXACTLY valid JSON — no markdown.
objective_count={objective_count}, subjective_count={subjective_count}
Difficulty: easy={easy_count}, medium={medium_count}, hard={hard_count}

Each question object must have:
  id (1-based int), type ("objective"|"subjective"), difficulty ("easy"|"medium"|"hard"),
  weightage (number), question (string)
Objective extras: options ({{A,B,C,D}}), valid_answers ([letters]), explanation (string)
Subjective extras: options=null, valid_answers ([2-5 paraphrases]), answer_key_points ([strings]), evaluation_rubric (string)

Topic: {topic}
Context:
{context}
JSON only:"""

REGIONAL_MIXED_QUESTION_GEN_PROMPT = """You are an expert exam paper setter.
Generate exactly {total_count} exam questions. Write EVERYTHING in '{language}'.
Output EXACTLY valid JSON — no markdown.
objective_count={objective_count}, subjective_count={subjective_count}
Difficulty: easy={easy_count}, medium={medium_count}, hard={hard_count}
Same structure as standard question prompt but all text in {language}.
Topic: {topic}
Context: {context}
JSON only:"""

SUBJECTIVE_GRADING_PROMPT = """You are a strict but fair examiner.
Grade the student's answer. Return JSON only with keys:
awarded_marks (0 to {max_marks}), feedback (string), missing_points ([strings]), strengths ([strings]), confidence (0-1)

Question: {question}
Max marks: {max_marks}
Valid answers: {valid_answers}
Key points: {key_points}
Rubric: {rubric}
Student answer: {student_answer}"""

SUMMARISE_PROMPT = """You are an expert Indian school educator. Summarise the provided context in EXACTLY 10 clear, numbered lines.
Each line should be one complete educational point. Include a brief real-world or relatable example after each point where useful.
Do NOT use bullet symbols — only numbered lines.
Do NOT include any preamble or heading — output ONLY the 10 numbered lines.

Context: {context}

Output format (strictly):
1. [Complete educational point with example if helpful]
2. [Complete educational point with example if helpful]
3. [Complete educational point with example if helpful]
4. [Complete educational point with example if helpful]
5. [Complete educational point with example if helpful]
6. [Complete educational point with example if helpful]
7. [Complete educational point with example if helpful]
8. [Complete educational point with example if helpful]
9. [Complete educational point with example if helpful]
10. [Complete educational point with example if helpful]"""

REGIONAL_SUMMARISE_PROMPT = """You are an expert educator. Summarise the provided context in EXACTLY 10 clear numbered lines in {language}.
Do NOT include any preamble — output ONLY 10 numbered lines in {language}.

Context: {context}

10 numbered lines in {language}:"""

FLASHCARDS_PROMPT = """Generate exactly {count} high-quality flashcards from the context below.
Each flashcard must cover a key concept, definition, formula, or fact from the content.
Vary the question style: some definitions, some "explain why", some examples.

Context:
{context}

Return EXACTLY a valid JSON array — no markdown, no preamble:
[{{"question": "...", "answer": "..."}}, ...]"""

REGIONAL_FLASHCARDS_PROMPT = """Generate exactly {count} high-quality flashcards in {language} from the context below.
Return EXACTLY a valid JSON array — no markdown:
[{{"question": "...", "answer": "..."}}]

Context:
{context}"""

MIXED_PRACTICE_GEN_PROMPT = """You are a high-quality academic practice generator.
Generate exactly {total_count} distinct practice questions from the context.
objective_count: {objective_count}, subjective_count: {subjective_count}, difficulty: {difficulty}

Return EXACTLY a valid JSON array. Do NOT generate blank questions.
Structure:
[
  {{"question":"...", "answer":"...", "type":"objective", "options":{{"A":"...","B":"...","C":"...","D":"..."}}}},
  {{"question":"...", "answer":"...", "type":"subjective", "options":null}}
]

Context: {context}
Topic: {topic}
JSON array only:"""

PRACTICE_EVALUATION_PROMPT = """You are an expert academic tutor.
Evaluate the student answer against the model answer for the given question.
For objective questions, a matching answer (case-insensitive) scores 10.
For subjective questions, evaluate based on accuracy, completeness, and clarity.
Return EXACTLY valid JSON: {{"score":0-10, "feedback":"...", "improvements":"...", "is_correct":true/false}}

Question: {question}
Model Answer: {model_answer}
Student Answer: {student_answer}"""

PRACTICE_REPORT_PROMPT = """You are an expert academic counsellor.
Analyse this practice session and return EXACTLY valid JSON:
{{"total_marks":n, "obtained_marks":n, "percentage":n, "overall_feedback":"...",
  "learning_gaps":[{{"topic":"...","gap":"...","recommendation":"..."}}],
  "predicted_grade":"A/B/C/D/F", "strengths":["..."]}}

Session data: {session_data}"""

VIDEO_EXPLAINER_PROMPT = """You are a warm British primary school teacher explaining: {topic}.
Return a JSON ARRAY of scene objects (7 scenes: INTRO, CONCEPT, EXAMPLE_1, EXAMPLE_2, TRY_IT, KEY_TAKEAWAYS, SUMMARY).
Each object: {{"segment":"...","text":"2-4 spoken sentences","visual":"actual content not a description","visual_type":"title|worked_example|bullet_list|fact_box|summary_box"}}
British English only. Return ONLY valid JSON array. Context: {context}"""

# ══════════════════════════════════════════════════════════════════════════════
#  CURRICULUM METADATA
# ══════════════════════════════════════════════════════════════════════════════
def _build_curriculum() -> dict:
    boards = {
        "National (NCERT)": ["CBSE"],
        "Andhra Pradesh": ["BSEAP"],
        "Bihar": ["BSEB", "CBSE"],
        "Delhi": ["CBSE"],
        "Gujarat": ["GSEB"],
        "Karnataka": ["KSEEB"],
        "Kerala": ["KBPE"],
        "Maharashtra": ["MSBSHSE"],
        "Odisha": ["BSE Odisha"],
        "Punjab": ["PSEB"],
        "Rajasthan": ["RBSE"],
        "Tamil Nadu": ["TNBSE"],
        "Uttar Pradesh": ["UPMSP"],
        "West Bengal": ["WBBSE"],
    }
    data: dict = {}
    for state, bds in boards.items():
        data[state] = {}
        for board in bds:
            data[state][board] = {}
            for i in range(1, 13):
                if i <= 5:
                    subs = ["Mathematics", "Environmental Studies", "English", "Local Language"]
                elif i <= 8:
                    subs = ["Mathematics", "Science", "Social Science", "English", "Local Language", "Hindi"]
                elif i <= 10:
                    subs = ["Mathematics", "Science", "Social Science", "English", "Local Language", "Hindi", "Sanskrit"]
                else:
                    subs = ["Physics", "Chemistry", "Biology", "Mathematics", "Computer Science",
                            "English", "History", "Geography", "Economics", "Accountancy",
                            "Business Studies", "Local Language"]
                data[state][board][f"Class {i}"] = subs
    return data

CURRICULUM_DATA = _build_curriculum()

# Hardcoded NCERT chapter database (reliable, no LLM needed for known combinations)
CHAPTERS_DB: Dict[tuple, list] = {
    ("class6","science"):  ["Ch 1: Food: Where Does it Come From?","Ch 2: Components of Food","Ch 3: Fibre to Fabric","Ch 4: Sorting Materials","Ch 5: Separation of Substances","Ch 6: Changes Around Us","Ch 7: Getting to Know Plants","Ch 8: Body Movements","Ch 9: Living Organisms","Ch 10: Motion and Measurement","Ch 11: Light, Shadows and Reflections","Ch 12: Electricity and Circuits","Ch 13: Fun with Magnets","Ch 14: Water","Ch 15: Air Around Us","Ch 16: Garbage In, Garbage Out"],
    ("class7","science"):  ["Ch 1: Nutrition in Plants","Ch 2: Nutrition in Animals","Ch 3: Fibre to Fabric","Ch 4: Heat","Ch 5: Acids, Bases and Salts","Ch 6: Physical and Chemical Changes","Ch 7: Weather, Climate and Adaptations","Ch 8: Winds, Storms and Cyclones","Ch 9: Soil","Ch 10: Respiration in Organisms","Ch 11: Transportation in Animals and Plants","Ch 12: Reproduction in Plants","Ch 13: Motion and Time","Ch 14: Electric Current","Ch 15: Light","Ch 16: Water: A Precious Resource","Ch 17: Forests: Our Lifeline","Ch 18: Wastewater Story"],
    ("class8","science"):  ["Ch 1: Crop Production","Ch 2: Microorganisms","Ch 3: Synthetic Fibres","Ch 4: Metals and Non-metals","Ch 5: Coal and Petroleum","Ch 6: Combustion and Flame","Ch 7: Conservation of Plants","Ch 8: Cell Structure","Ch 9: Reproduction in Animals","Ch 10: Adolescence","Ch 11: Force and Pressure","Ch 12: Friction","Ch 13: Sound","Ch 14: Chemical Effects of Electricity","Ch 15: Natural Phenomena","Ch 16: Light","Ch 17: Stars and Solar System","Ch 18: Pollution"],
    ("class9","science"):  ["Ch 1: Matter in Our Surroundings","Ch 2: Is Matter Pure?","Ch 3: Atoms and Molecules","Ch 4: Structure of the Atom","Ch 5: Fundamental Unit of Life","Ch 6: Tissues","Ch 7: Diversity in Living Organisms","Ch 8: Motion","Ch 9: Force and Laws of Motion","Ch 10: Gravitation","Ch 11: Work and Energy","Ch 12: Sound","Ch 13: Why Do We Fall Ill?","Ch 14: Natural Resources","Ch 15: Improvement in Food Resources"],
    ("class10","science"): ["Ch 1: Chemical Reactions","Ch 2: Acids, Bases and Salts","Ch 3: Metals and Non-metals","Ch 4: Carbon and its Compounds","Ch 5: Periodic Classification","Ch 6: Life Processes","Ch 7: Control and Coordination","Ch 8: Reproduction","Ch 9: Heredity and Evolution","Ch 10: Light — Reflection and Refraction","Ch 11: Human Eye","Ch 12: Electricity","Ch 13: Magnetic Effects","Ch 14: Sources of Energy","Ch 15: Our Environment","Ch 16: Sustainable Management"],
    ("class11","physics"): ["Ch 1: Physical World","Ch 2: Units and Measurements","Ch 3: Motion in a Straight Line","Ch 4: Motion in a Plane","Ch 5: Laws of Motion","Ch 6: Work, Energy and Power","Ch 7: System of Particles","Ch 8: Gravitation","Ch 9: Mechanical Properties of Solids","Ch 10: Mechanical Properties of Fluids","Ch 11: Thermal Properties","Ch 12: Thermodynamics","Ch 13: Kinetic Theory","Ch 14: Oscillations","Ch 15: Waves"],
    ("class12","physics"): ["Ch 1: Electric Charges and Fields","Ch 2: Electrostatic Potential","Ch 3: Current Electricity","Ch 4: Moving Charges and Magnetism","Ch 5: Magnetism and Matter","Ch 6: Electromagnetic Induction","Ch 7: Alternating Current","Ch 8: Electromagnetic Waves","Ch 9: Ray Optics","Ch 10: Wave Optics","Ch 11: Dual Nature of Radiation","Ch 12: Atoms","Ch 13: Nuclei","Ch 14: Semiconductor Electronics"],
    ("class11","chemistry"):["Ch 1: Basic Concepts of Chemistry","Ch 2: Structure of Atom","Ch 3: Classification of Elements","Ch 4: Chemical Bonding","Ch 5: States of Matter","Ch 6: Thermodynamics","Ch 7: Equilibrium","Ch 8: Redox Reactions","Ch 9: Hydrogen","Ch 10: s-Block Elements","Ch 11: p-Block Elements","Ch 12: Organic Chemistry","Ch 13: Hydrocarbons","Ch 14: Environmental Chemistry"],
    ("class12","chemistry"):["Ch 1: The Solid State","Ch 2: Solutions","Ch 3: Electrochemistry","Ch 4: Chemical Kinetics","Ch 5: Surface Chemistry","Ch 6: General Principles of Isolation","Ch 7: p-Block Elements","Ch 8: d-and f-Block Elements","Ch 9: Coordination Compounds","Ch 10: Haloalkanes and Haloarenes","Ch 11: Alcohols, Phenols and Ethers","Ch 12: Aldehydes and Ketones","Ch 13: Amines","Ch 14: Biomolecules","Ch 15: Polymers","Ch 16: Chemistry in Everyday Life"],
    ("class11","biology"):  ["Ch 1: The Living World","Ch 2: Biological Classification","Ch 3: Plant Kingdom","Ch 4: Animal Kingdom","Ch 5: Morphology of Flowering Plants","Ch 6: Anatomy of Flowering Plants","Ch 7: Structural Organisation","Ch 8: Cell — Unit of Life","Ch 9: Biomolecules","Ch 10: Cell Cycle","Ch 11: Transport in Plants","Ch 12: Mineral Nutrition","Ch 13: Photosynthesis","Ch 14: Respiration in Plants","Ch 15: Plant Growth","Ch 16: Digestion and Absorption","Ch 17: Breathing and Exchange","Ch 18: Body Fluids","Ch 19: Excretory Products","Ch 20: Locomotion","Ch 21: Neural Control","Ch 22: Chemical Coordination"],
    ("class12","biology"):  ["Ch 1: Reproduction in Organisms","Ch 2: Sexual Reproduction in Flowering Plants","Ch 3: Human Reproduction","Ch 4: Reproductive Health","Ch 5: Principles of Inheritance","Ch 6: Molecular Basis of Inheritance","Ch 7: Evolution","Ch 8: Human Health and Disease","Ch 9: Food Production","Ch 10: Microbes in Human Welfare","Ch 11: Biotechnology Principles","Ch 12: Biotechnology Applications","Ch 13: Organisms and Populations","Ch 14: Ecosystem","Ch 15: Biodiversity","Ch 16: Environmental Issues"],
    ("class6","mathematics"):["Ch 1: Knowing Our Numbers","Ch 2: Whole Numbers","Ch 3: Playing with Numbers","Ch 4: Basic Geometrical Ideas","Ch 5: Elementary Shapes","Ch 6: Integers","Ch 7: Fractions","Ch 8: Decimals","Ch 9: Data Handling","Ch 10: Mensuration","Ch 11: Algebra","Ch 12: Ratio and Proportion","Ch 13: Symmetry","Ch 14: Practical Geometry"],
    ("class7","mathematics"):["Ch 1: Integers","Ch 2: Fractions and Decimals","Ch 3: Data Handling","Ch 4: Simple Equations","Ch 5: Lines and Angles","Ch 6: Triangles","Ch 7: Congruence of Triangles","Ch 8: Comparing Quantities","Ch 9: Rational Numbers","Ch 10: Practical Geometry","Ch 11: Perimeter and Area","Ch 12: Algebraic Expressions","Ch 13: Exponents and Powers","Ch 14: Symmetry","Ch 15: Visualising Solid Shapes"],
    ("class8","mathematics"):["Ch 1: Rational Numbers","Ch 2: Linear Equations","Ch 3: Quadrilaterals","Ch 4: Practical Geometry","Ch 5: Data Handling","Ch 6: Squares and Square Roots","Ch 7: Cubes and Cube Roots","Ch 8: Comparing Quantities","Ch 9: Algebraic Expressions","Ch 10: Visualising Solid Shapes","Ch 11: Mensuration","Ch 12: Exponents and Powers","Ch 13: Direct and Inverse Proportions","Ch 14: Factorisation","Ch 15: Introduction to Graphs","Ch 16: Playing with Numbers"],
    ("class9","mathematics"):["Ch 1: Number Systems","Ch 2: Polynomials","Ch 3: Coordinate Geometry","Ch 4: Linear Equations in Two Variables","Ch 5: Euclid's Geometry","Ch 6: Lines and Angles","Ch 7: Triangles","Ch 8: Quadrilaterals","Ch 9: Areas of Parallelograms","Ch 10: Circles","Ch 11: Constructions","Ch 12: Heron's Formula","Ch 13: Surface Areas and Volumes","Ch 14: Statistics","Ch 15: Probability"],
    ("class10","mathematics"):["Ch 1: Real Numbers","Ch 2: Polynomials","Ch 3: Pair of Linear Equations","Ch 4: Quadratic Equations","Ch 5: Arithmetic Progressions","Ch 6: Triangles","Ch 7: Coordinate Geometry","Ch 8: Introduction to Trigonometry","Ch 9: Applications of Trigonometry","Ch 10: Circles","Ch 11: Constructions","Ch 12: Areas Related to Circles","Ch 13: Surface Areas and Volumes","Ch 14: Statistics","Ch 15: Probability"],
    ("class11","mathematics"):["Ch 1: Sets","Ch 2: Relations and Functions","Ch 3: Trigonometric Functions","Ch 4: Mathematical Induction","Ch 5: Complex Numbers","Ch 6: Linear Inequalities","Ch 7: Permutations and Combinations","Ch 8: Binomial Theorem","Ch 9: Sequences and Series","Ch 10: Straight Lines","Ch 11: Conic Sections","Ch 12: 3D Geometry","Ch 13: Limits and Derivatives","Ch 14: Mathematical Reasoning","Ch 15: Statistics","Ch 16: Probability"],
    ("class12","mathematics"):["Ch 1: Relations and Functions","Ch 2: Inverse Trigonometric Functions","Ch 3: Matrices","Ch 4: Determinants","Ch 5: Continuity and Differentiability","Ch 6: Application of Derivatives","Ch 7: Integrals","Ch 8: Application of Integrals","Ch 9: Differential Equations","Ch 10: Vector Algebra","Ch 11: Three Dimensional Geometry","Ch 12: Linear Programming","Ch 13: Probability"],
    ("class10","social science"):["History Ch 1: Rise of Nationalism in Europe","History Ch 2: Nationalism in India","History Ch 3: Making of a Global World","History Ch 4: Age of Industrialisation","History Ch 5: Print Culture","Geography Ch 1: Resources and Development","Geography Ch 2: Forest and Wildlife","Geography Ch 3: Water Resources","Geography Ch 4: Agriculture","Geography Ch 5: Minerals and Energy","Geography Ch 6: Manufacturing Industries","Geography Ch 7: Lifelines of National Economy","Political Science Ch 1: Power Sharing","Political Science Ch 2: Federalism","Political Science Ch 3: Democracy and Diversity","Economics Ch 1: Development","Economics Ch 2: Sectors of Indian Economy","Economics Ch 3: Money and Credit","Economics Ch 4: Globalisation"],
    ("class10","english"):["First Flight Ch 1: A Letter to God","First Flight Ch 2: Nelson Mandela","First Flight Ch 3: Two Stories About Flying","First Flight Ch 4: Diary of Anne Frank","First Flight Ch 5: The Hundred Dresses I","First Flight Ch 6: The Hundred Dresses II","First Flight Ch 7: Glimpses of India","First Flight Ch 8: Mijbil the Otter","First Flight Ch 9: Madam Rides the Bus","First Flight Ch 10: Sermon at Benares","First Flight Ch 11: The Proposal","Footprints Ch 1: Triumph of Surgery","Footprints Ch 2: The Thief's Story","Footprints Ch 3: Midnight Visitor","Footprints Ch 4: A Question of Trust","Footprints Ch 5: Footprints Without Feet"],
}

NCERT_PDF_URLS: Dict[tuple, str] = {
    ("class6","science"):     "https://ncert.nic.in/textbook/pdf/hesc1dd.pdf",
    ("class7","science"):     "https://ncert.nic.in/textbook/pdf/hesc2dd.pdf",
    ("class8","science"):     "https://ncert.nic.in/textbook/pdf/hesc3dd.pdf",
    ("class9","science"):     "https://ncert.nic.in/textbook/pdf/iesc1dd.pdf",
    ("class10","science"):    "https://ncert.nic.in/textbook/pdf/jesc101.pdf",
    ("class11","physics"):    "https://ncert.nic.in/textbook/pdf/leph101.pdf",
    ("class12","physics"):    "https://ncert.nic.in/textbook/pdf/leph201.pdf",
    ("class11","chemistry"):  "https://ncert.nic.in/textbook/pdf/lech101.pdf",
    ("class12","chemistry"):  "https://ncert.nic.in/textbook/pdf/lech201.pdf",
    ("class11","biology"):    "https://ncert.nic.in/textbook/pdf/lebo101.pdf",
    ("class12","biology"):    "https://ncert.nic.in/textbook/pdf/lebo201.pdf",
    ("class6","mathematics"): "https://ncert.nic.in/textbook/pdf/hemh1dd.pdf",
    ("class7","mathematics"): "https://ncert.nic.in/textbook/pdf/hemh2dd.pdf",
    ("class8","mathematics"): "https://ncert.nic.in/textbook/pdf/hemh3dd.pdf",
    ("class9","mathematics"): "https://ncert.nic.in/textbook/pdf/iemh1dd.pdf",
    ("class10","mathematics"):"https://ncert.nic.in/textbook/pdf/jemh101.pdf",
    ("class11","mathematics"):"https://ncert.nic.in/textbook/pdf/lemh101.pdf",
    ("class12","mathematics"):"https://ncert.nic.in/textbook/pdf/lemh201.pdf",
    ("class6","social science"):"https://ncert.nic.in/textbook/pdf/hess1dd.pdf",
    ("class9","social science"):"https://ncert.nic.in/textbook/pdf/iess1dd.pdf",
    ("class10","social science"):"https://ncert.nic.in/textbook/pdf/jess101.pdf",
    ("class9","english"):     "https://ncert.nic.in/textbook/pdf/ieen1dd.pdf",
    ("class10","english"):    "https://ncert.nic.in/textbook/pdf/jeff101.pdf",
    ("class9","hindi"):       "https://ncert.nic.in/textbook/pdf/iehn1dd.pdf",
    ("class10","hindi"):      "https://ncert.nic.in/textbook/pdf/jhks101.pdf",
    ("class11","economics"):  "https://ncert.nic.in/textbook/pdf/leec101.pdf",
    ("class12","economics"):  "https://ncert.nic.in/textbook/pdf/leec201.pdf",
    ("class12","accountancy"):"https://ncert.nic.in/textbook/pdf/leac201.pdf",
    ("class11","computer science"):"https://ncert.nic.in/textbook/pdf/lecs101.pdf",
    ("class12","computer science"):"https://ncert.nic.in/textbook/pdf/lecs201.pdf",
}

# ══════════════════════════════════════════════════════════════════════════════
#  FLASK MIDDLEWARE
# ══════════════════════════════════════════════════════════════════════════════
@app.before_request
def _log_request():
    if request.path.startswith("/api/"):
        print(f"[API] {request.method} {request.path}")

@app.errorhandler(404)
def _404(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": "API route not found", "path": request.path}), 404
    try:
        return send_from_directory(app.static_folder, "index.html")
    except Exception:
        return jsonify({"error": "Not found"}), 404

@app.errorhandler(Exception)
def _500(e):
    import traceback
    print(f"[ERROR] {e}\n{traceback.format_exc()}")
    if request.path.startswith("/api/"):
        return jsonify({"error": "Internal server error", "message": str(e)}), 500
    return f"<h1>500 Internal Server Error</h1><p>{e}</p>", 500

# ══════════════════════════════════════════════════════════════════════════════
#  AUTH DECORATOR — role isolation + session expiry
# ══════════════════════════════════════════════════════════════════════════════
SESSION_TTL_DAYS = int(os.getenv("SESSION_TTL_DAYS", 30))

def auth(roles=None):
    """
    Decorator that:
    1. Validates Bearer token (memory → MongoDB session lookup)
    2. Checks session TTL (SESSION_TTL_DAYS, default 30 days)
    3. Confirms user still exists and is not suspended
    4. Enforces role-based access control
    5. Attaches request.user for downstream use
    """
    def dec(fn):
        @wraps(fn)
        def wrap(*a, **kw):
            tok = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
            if not tok:
                return jsonify({"error": "Unauthorized — no token provided"}), 401

            uid = TOKENS.get(tok)

            # Session lookup in MongoDB if not cached in memory
            if not uid and MONGO_OK:
                session = _mongo_find_one(M_SESSIONS, {"token": tok})
                if session:
                    # Check session TTL
                    created = session.get("created_at", "")
                    if created:
                        try:
                            from datetime import timezone
                            age_days = (datetime.utcnow() - datetime.fromisoformat(created)).days
                            if age_days > SESSION_TTL_DAYS:
                                # Session expired — clean up
                                _mongo_delete(M_SESSIONS, {"token": tok})
                                return jsonify({"error": "Session expired. Please sign in again."}), 401
                        except Exception:
                            pass
                    uid = session["user_id"]
                    TOKENS[tok] = uid

            if not uid:
                return jsonify({"error": "Unauthorized — invalid or expired token"}), 401

            db = db_load()
            u  = next((x for x in db["users"] if x["id"] == uid), None)
            if not u:
                TOKENS.pop(tok, None)
                return jsonify({"error": "User not found"}), 401
            if u.get("status") == "suspended":
                TOKENS.pop(tok, None)
                return jsonify({"error": "Account suspended. Contact administrator."}), 403
            if roles and u["role"] not in roles:
                print(f"[AUTH] Forbidden: user {uid} role={u['role']} tried endpoint requiring {roles}")
                return jsonify({"error": "Forbidden — insufficient permissions"}), 403

            request.user = u
            return fn(*a, **kw)
        return wrap
    return dec

# ══════════════════════════════════════════════════════════════════════════════
#  AUTH ENDPOINTS  — OTP, role-isolation, full security
# ══════════════════════════════════════════════════════════════════════════════

# ── OTP store (in-memory + MongoDB) ──────────────────────────────────────────
# Format: {email: {"otp": "123456", "expires": epoch_seconds, "attempts": int}}
_otp_store: Dict[str, dict] = {}
M_OTP = "otp_store"

import time as _time

def _generate_otp() -> str:
    return str(random.randint(100000, 999999))

def _store_otp(email: str, otp: str, ttl_secs: int = 600):
    """Store OTP with expiry. Dual-writes to memory and MongoDB."""
    record = {"otp": otp, "expires": _time.time() + ttl_secs, "attempts": 0}
    _otp_store[email] = record
    if MONGO_OK:
        try:
            mongo_db[M_OTP].update_one(
                {"email": email},
                {"$set": {**record, "email": email}},
                upsert=True
            )
        except Exception as e:
            print(f"[OTP] MongoDB write error: {e}")

def _get_otp_record(email: str) -> Optional[dict]:
    rec = _otp_store.get(email)
    if rec:
        return rec
    if MONGO_OK:
        try:
            d = mongo_db[M_OTP].find_one({"email": email})
            if d:
                d.pop("_id", None)
                _otp_store[email] = d
                return d
        except Exception:
            pass
    return None

def _verify_otp(email: str, submitted: str) -> tuple:
    """Returns (ok: bool, error_msg: str)"""
    rec = _get_otp_record(email)
    if not rec:
        return False, "OTP not found. Please request a new one."
    if _time.time() > rec.get("expires", 0):
        _otp_store.pop(email, None)
        return False, "OTP expired. Please request a new one."
    if rec.get("attempts", 0) >= 5:
        _otp_store.pop(email, None)
        return False, "Too many incorrect attempts. Please request a new OTP."
    if rec["otp"] != submitted.strip():
        rec["attempts"] = rec.get("attempts", 0) + 1
        _otp_store[email] = rec
        return False, f"Incorrect OTP. {5 - rec['attempts']} attempt(s) remaining."
    # Valid — clean up
    _otp_store.pop(email, None)
    if MONGO_OK:
        try: mongo_db[M_OTP].delete_one({"email": email})
        except Exception: pass
    return True, ""

def _send_otp_email(to_email: str, otp: str, context: str = "registration") -> bool:
    """Send OTP via SMTP. Returns True on success, False if SMTP not configured."""
    host   = os.getenv("SMTP_HOST")
    port   = int(os.getenv("SMTP_PORT", 587))
    user   = os.getenv("SMTP_USER")
    passwd = os.getenv("SMTP_PASS")
    sender = os.getenv("SMTP_FROM", user)

    if not all([host, user, passwd]):
        print(f"[OTP] Dev mode — OTP for {to_email}: {otp}")
        return False   # Caller handles dev mode

    try:
        html = f"""
<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px">
  <div style="text-align:center;margin-bottom:28px">
    <div style="font-size:48px">🔐</div>
    <h2 style="color:#1e293b;margin:8px 0 4px">Your VidyAI OTP</h2>
    <p style="color:#64748b;font-size:14px">For {context}</p>
  </div>
  <div style="background:#f1f5f9;border-radius:12px;padding:28px;text-align:center;margin-bottom:24px">
    <div style="font-size:42px;font-weight:900;letter-spacing:12px;color:#1e293b;font-family:monospace">{otp}</div>
    <p style="color:#64748b;font-size:13px;margin:12px 0 0">This OTP expires in <strong>10 minutes</strong></p>
  </div>
  <p style="font-size:13px;color:#94a3b8;text-align:center">
    If you did not request this OTP, please ignore this email.<br/>
    Do not share this OTP with anyone.
  </p>
  <div style="border-top:1px solid #e2e8f0;margin-top:24px;padding-top:16px;text-align:center">
    <span style="font-size:12px;color:#94a3b8">VidyAI — AI-Powered Education Platform</span>
  </div>
</div>"""
        msg = MIMEMultipart("alternative")
        msg["From"]    = sender
        msg["To"]      = to_email
        msg["Subject"] = f"VidyAI OTP: {otp} (expires in 10 minutes)"
        msg.attach(MIMEText(html, "html", "utf-8"))
        with smtplib.SMTP(host, port) as s:
            s.starttls(); s.login(user, passwd); s.send_message(msg)
        return True
    except Exception as e:
        print(f"[OTP] SMTP error: {e}")
        return False

@app.post("/api/auth/send-otp")
def send_otp():
    """Send a 6-digit OTP to an email address for verification."""
    b     = request.json or {}
    email = b.get("email", "").strip().lower()
    if not email or "@" not in email:
        return jsonify({"error": "Valid email required"}), 400

    # Rate-limit: max 3 OTPs per email per 10 minutes
    rec = _get_otp_record(email)
    if rec and _time.time() < rec.get("expires", 0) - 540:  # sent within last 60s
        return jsonify({"error": "Please wait 60 seconds before requesting another OTP"}), 429

    otp     = _generate_otp()
    context = b.get("form", "registration")
    _store_otp(email, otp)

    sent = _send_otp_email(email, otp, context)

    if sent:
        print(f"[OTP] Sent to {email}")
    else:
        # Dev mode: log OTP to console
        print(f"[OTP] ⚠️  SMTP not configured. Dev OTP for {email}: {otp}")

    return jsonify({
        "ok":       True,
        "dev_mode": not sent,
        "message":  f"OTP sent to {email}" if sent else f"[Dev] OTP logged to server console: {otp}",
        "dev_otp":  otp if not sent else None,   # expose in dev mode only
    })

@app.post("/api/auth/login")
def login():
    b  = request.json or {}
    db = db_load()

    email    = b.get("email", "").strip().lower()
    password = b.get("password", "")
    req_role = b.get("role", "").strip()      # Role the user selected on login tab

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    u = next((x for x in db["users"] if x["email"] == email), None)

    # Unified error — do not reveal whether email exists
    if not u or u["pw_hash"] != _hash(password):
        return jsonify({"error": "Invalid email or password"}), 401

    if u.get("status") == "suspended":
        return jsonify({"error": "Your account has been suspended. Contact your administrator."}), 403

    # ── SECURITY: Role mismatch check ─────────────────────────────────────────
    # If the user selected a specific role tab, verify it matches their actual role.
    # Map UI role keys to DB role values
    ROLE_MAP = {
        "school":      "school_admin",
        "school_admin":"school_admin",
        "teacher":     "teacher",
        "tutor":       "tutor",
        "student":     "student",
        "parent":      "parent",
        "admin":       "admin",
    }
    if req_role and req_role in ROLE_MAP:
        expected = ROLE_MAP[req_role]
        if u["role"] != expected:
            # Log the attempt
            print(f"[SECURITY] Role mismatch login attempt: {email} is '{u['role']}' but tried '{expected}'")
            return jsonify({
                "error": f"This account is registered as '{u['role']}'. Please select the correct role tab."
            }), 403

    # Issue token
    tok = uuid.uuid4().hex
    TOKENS[tok] = u["id"]
    _mongo_insert(M_SESSIONS, {
        "token": tok, "user_id": u["id"],
        "role": u["role"], "created_at": _now(),
        "ip": request.remote_addr or ""
    })
    db_log(db, u["id"], "login", f"{u['name']} ({u['role']}) signed in")
    db_save(db)
    return jsonify({"token": tok, "user": _safe(u)})

@app.post("/api/auth/signup")
def signup():
    b     = request.json or {}
    name  = b.get("name", "").strip()
    email = b.get("email", "").strip().lower()
    pw    = b.get("password", "")
    role  = b.get("role", "student").strip()
    inst  = b.get("institution", "").strip()
    roll  = b.get("roll_number", "").strip()
    phone = b.get("phone", "").strip()
    otp   = b.get("otp", "").strip()

    # ── Input validation ──────────────────────────────────────────────────────
    if not name or not email or not pw:
        return jsonify({"error": "Name, email and password are required"}), 400
    if "@" not in email or "." not in email.split("@")[-1]:
        return jsonify({"error": "Enter a valid email address"}), 400
    if len(pw) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400
    if role not in ("student", "tutor", "teacher", "school_admin", "parent", "admin"):
        role = "student"

    # ── OTP verification (required for registration) ──────────────────────────
    if otp:
        ok, err = _verify_otp(email, otp)
        if not ok:
            return jsonify({"error": err}), 400
    else:
        return jsonify({"error": "OTP verification required. Please verify your email first."}), 400

    # ── Duplicate check ───────────────────────────────────────────────────────
    db = db_load()
    if any(x["email"] == email for x in db["users"]):
        return jsonify({"error": "An account with this email already exists"}), 409

    u = {
        "id": _uid(), "name": name, "email": email,
        "pw_hash": _hash(pw), "role": role,
        "institution": inst, "roll_number": roll, "phone": phone,
        "joined": _now()[:10], "docs": 0, "status": "active"
    }
    db["users"].append(u)
    db_log(db, u["id"], "signup", f"{name} registered as {role}")
    db_save(db)

    tok = uuid.uuid4().hex
    TOKENS[tok] = u["id"]
    _mongo_insert(M_SESSIONS, {
        "token": tok, "user_id": u["id"],
        "role": u["role"], "created_at": _now(),
        "ip": request.remote_addr or ""
    })
    return jsonify({"token": tok, "user": _safe(u)}), 201

@app.post("/api/auth/logout")
@auth()
def logout():
    tok = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
    TOKENS.pop(tok, None)
    _mongo_delete(M_SESSIONS, {"token": tok})
    return jsonify({"ok": True})

@app.get("/api/auth/me")
@auth()
def me():
    return jsonify({"user": _safe(request.user)})

# ══════════════════════════════════════════════════════════════════════════════
#  DOCUMENT UPLOAD / LIST / DELETE
# ══════════════════════════════════════════════════════════════════════════════
@app.post("/api/upload")
@auth()
def upload():
    u  = request.user
    db = db_load()

    # ── Per-role upload limit check ───────────────────────────────────────────
    settings   = db.get("settings", {})
    role_limit_key = f"max_uploads_{u['role']}"
    global_limit   = int(settings.get("max_uploads_per_user", 20))
    role_limit     = int(settings.get(role_limit_key, global_limit))
    user_docs      = [d for d in db.get("documents", []) if d["owner_id"] == u["id"]]
    if len(user_docs) >= role_limit:
        return jsonify({
            "error": f"Upload limit reached ({role_limit} files). "
                     f"Ask your school admin to increase the limit or delete existing uploads."
        }), 429

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    f = request.files["file"]
    if not f or not _allowed(f.filename):
        return jsonify({"error": "Unsupported file type"}), 400

    ext  = f.filename.rsplit(".", 1)[1].lower()
    fn   = secure_filename(f.filename)
    did  = uuid.uuid4().hex[:10]
    udir = UPL_DIR / u["id"]
    udir.mkdir(exist_ok=True)
    spath = udir / f"{did}.{ext}"
    f.save(str(spath))

    chunks, chapters = _index_doc(spath, did, ext)
    syl_name = request.form.get("syllabus_name", Path(fn).stem)

    db = db_load()
    doc = {
        "id": did, "owner_id": u["id"], "name": fn, "ext": ext,
        "type": _dtype(ext), "size": spath.stat().st_size,
        "path": str(spath), "uploaded_at": _now(),
        "chunks": chunks, "chapters": chapters
    }
    db["documents"].append(doc)
    db_log(db, u["id"], "upload", f"Uploaded {fn}")
    db_save(db)

    syllabi_registry[did] = {
        "id": did, "name": syl_name, "files": [fn],
        "chunks": chunks, "chapters": chapters,
        "owner_id": u["id"], "created_at": _now()
    }
    _save_syllabi()
    return jsonify({"doc": doc, "syllabus_id": did, "chunks": chunks, "chapters": chapters}), 201

@app.get("/api/documents")
@auth()
def list_docs():
    db = db_load()
    u  = request.user
    # Admin sees all documents from all users
    # Every other role sees ONLY their own documents — strict isolation
    if u["role"] in ("admin", "school_admin"):
        docs = db["documents"]
    else:
        docs = [d for d in db["documents"] if d["owner_id"] == u["id"]]
    return jsonify({"documents": docs})

@app.delete("/api/documents/<did>")
@auth()
def del_doc(did):
    db = db_load(); u = request.user
    doc = next((d for d in db["documents"] if d["id"] == did), None)
    if not doc:
        return jsonify({"error": "Not found"}), 404
    if doc["owner_id"] != u["id"] and u["role"] != "admin":
        return jsonify({"error": "Forbidden"}), 403
    try:
        Path(doc["path"]).unlink(missing_ok=True)
    except Exception:
        pass
    syllabi_registry.pop(did, None)
    qa_chains.pop(did, None)
    memories.pop(did, None)
    vector_stores.pop(did, None)
    _save_syllabi()
    db["documents"] = [d for d in db["documents"] if d["id"] != did]
    db_save(db)
    return jsonify({"ok": True})

# ══════════════════════════════════════════════════════════════════════════════
#  SYLLABI
# ══════════════════════════════════════════════════════════════════════════════
@app.get("/api/syllabi")
@auth()
def list_syllabi():
    u     = request.user
    items = list(syllabi_registry.values())

    if u["role"] in ("admin", "school_admin"):
        # Admin sees everything
        pass
    else:
        # STRICT isolation: each user sees ONLY their own uploaded syllabi.
        # gov_ syllabi (NCERT/state) are session-scoped — the user who loaded
        # them in the current session sees them; others do not.
        # This prevents Student A's uploads from appearing in Teacher B's lists.
        items = [
            s for s in items
            if s.get("owner_id") == u["id"]   # this user's own (uploaded or loaded)
        ]

    return jsonify({"syllabi": items})

@app.get("/api/syllabi/<syllabus_id>/chapters")
@auth()
def get_chapters(syllabus_id):
    s = syllabi_registry.get(syllabus_id)
    if not s:
        return jsonify({"error": "Syllabus not found"}), 404
    return jsonify({"syllabus_id": syllabus_id, "name": s.get("name"), "chapters": s.get("chapters", [])})

@app.post("/api/syllabi/register-virtual")
@auth()
def register_virtual():
    u    = request.user
    data = request.json or {}
    sid  = data.get("syllabus_id")
    name = data.get("name")
    chapters = data.get("chapters", [])
    if not sid or not name:
        return jsonify({"error": "Missing syllabus_id or name"}), 400
    # Always set / refresh owner_id — prevents a crafted request from
    # registering a syllabus under a shared/global key
    syllabi_registry[sid] = {
        "id": sid, "name": name, "chapters": chapters,
        "owner_id": u["id"], "created_at": _now(), "is_virtual": True
    }
    _save_syllabi()
    return jsonify({"success": True, "syllabus_id": sid})

@app.delete("/api/syllabi/<syllabus_id>")
@auth()
def delete_syllabus(syllabus_id):
    u = request.user
    s = syllabi_registry.get(syllabus_id)
    if not s:
        return jsonify({"error": "Not found"}), 404
    # Only the owner or admin can delete
    if s.get("owner_id") and s["owner_id"] != u["id"] and u["role"] not in ("admin", "school_admin"):
        return jsonify({"error": "Forbidden — you can only remove your own syllabi"}), 403
    syllabi_registry.pop(syllabus_id, None)
    qa_chains.pop(syllabus_id, None)
    memories.pop(syllabus_id, None)
    vector_stores.pop(syllabus_id, None)
    _save_syllabi()
    return jsonify({"success": True, "deleted": syllabus_id})

# ══════════════════════════════════════════════════════════════════════════════
#  CURRICULUM ENDPOINTS (Indian Board)
# ══════════════════════════════════════════════════════════════════════════════
@app.get("/api/curriculum/metadata")
@auth()
def get_curriculum_metadata():
    return jsonify({
        "metadata": CURRICULUM_DATA,
        "status": {
            "mongodb_connected":    MONGO_OK,
            "openai_configured":    bool(OPENAI_API_KEY),
            "langchain_available":  LANGCHAIN_OK,
            "persistence":          "mongodb" if MONGO_OK else "json_fallback",
            "model":                OPENAI_MODEL,
        }
    })

@app.post("/api/curriculum/load")
@auth()
def load_curriculum_book():
    b       = request.json or {}
    state   = b.get("state")
    board   = b.get("board")
    class_n = b.get("class") or b.get("year")
    subject = b.get("subject")
    u       = request.user

    if not all([state, board, class_n, subject]):
        return jsonify({"error": "state, board, class, and subject are required"}), 400

    # ── IMPORTANT: Embed user_id in the key so each user's curriculum hub
    #    entries are INDEPENDENT and never visible to other users.
    did = (
        f"gov_{u['id'][:6]}_"
        f"{board.lower().replace(' ','_')}_{class_n.replace(' ','').lower()}_"
        f"{subject.lower().replace(' ','_')}"
    )
    class_key = class_n.lower().replace(" ", "")
    subj_key  = subject.lower().strip()

    chapters = CHAPTERS_DB.get((class_key, subj_key))

    if not chapters:
        try:
            prompt = (f"List the EXACT chapter titles from the official '{board}' textbook for '{subject}' — {class_n} in '{state}', India.\n"
                      f"Return ONLY a valid JSON array of strings. Example: [\"Chapter 1: ...\", \"Chapter 2: ...\"]")
            result = _llm_json(prompt, temperature=0.1, mini=True)
            if isinstance(result, list) and result:
                chapters = [str(c).strip() for c in result]
        except Exception as e:
            print(f"[CHAPTERS LLM] {e}")

    if not chapters:
        chapters = [f"Chapter {i}: Topic {i}" for i in range(1, 8)]

    pdf_url = NCERT_PDF_URLS.get((class_key, subj_key), "")

    syllabi_registry[did] = {
        "id": did,
        "name": f"{board} {class_n} — {subject}",
        "files": [f"{subject}_textbook.pdf"],
        "chunks": 100, "chapters": chapters,
        "owner_id": u["id"],        # ← always scoped to this user
        "created_at": _now(),
        "pdf_url": pdf_url
    }
    _save_syllabi()
    return jsonify({
        "syllabus_id": did, "chapters": chapters,
        "name": syllabi_registry[did]["name"], "pdf_url": pdf_url
    })

@app.post("/api/curriculum/subjects")
@auth()
def get_curriculum_subjects():
    b = request.json or {}
    board   = b.get("board", "CBSE")
    class_n = b.get("class", "Class 10")
    # Find subjects for any state that has this board
    for state_data in CURRICULUM_DATA.values():
        if board in state_data and class_n in state_data[board]:
            return jsonify({"subjects": state_data[board][class_n]})
    # Fallback
    return jsonify({"subjects": ["Mathematics","Science","English","Social Science","Hindi"]})

@app.post("/api/curriculum/chapters")
@auth()
def get_curriculum_chapters():
    b = request.json or {}
    board   = b.get("board", "CBSE")
    class_n = b.get("class", "Class 10")
    subject = b.get("subject", "Mathematics")
    u       = request.user

    # User-scoped ID — prevents cross-user syllabus leakage
    did = (
        f"gov_{u['id'][:6]}_"
        f"{board.lower().replace(' ','_')}_{class_n.replace(' ','').lower()}_"
        f"{subject.lower().replace(' ','_')}"
    )
    class_key = class_n.lower().replace(" ", "")
    subj_key  = subject.lower().strip()

    chapters = CHAPTERS_DB.get((class_key, subj_key))
    if not chapters:
        try:
            result = _llm_json(
                f"List exact chapters for '{board}' '{subject}' {class_n} India. JSON array only.",
                temperature=0.1, mini=True
            )
            if isinstance(result, list):
                chapters = [str(c).strip() for c in result]
        except Exception:
            chapters = [f"Chapter {i}" for i in range(1, 8)]

    pdf_url = NCERT_PDF_URLS.get((class_key, subj_key), "")

    # Create or update in registry — always with this user as owner
    syllabi_registry[did] = {
        "id": did,
        "name": f"{board} {class_n} — {subject}",
        "chunks": 100, "chapters": chapters,
        "owner_id": u["id"], "created_at": _now(), "pdf_url": pdf_url
    }
    _save_syllabi()
    return jsonify({
        "syllabus_id": did,
        "name": syllabi_registry[did]["name"],
        "chapters": chapters,
        "pdf_url": pdf_url
    })

# ── UK Curriculum Endpoints ───────────────────────────────────────────────────
@app.post("/api/uk-curriculum/topics")
@auth()
def uk_topics():
    b = request.json or {}
    year = b.get("year", "Year 10"); subject = b.get("subject", "Mathematics")
    u    = request.user
    did  = f"uk_{year.lower().replace(' ','_')}_{subject.lower().replace(' ','_')}"
    try:
        result = _llm_json(f"List the main topics in the UK National Curriculum for '{subject}' — {year}. JSON array of strings only.", temperature=0.1, mini=True)
        topics = result if isinstance(result, list) else [f"Topic {i}" for i in range(1, 8)]
    except Exception:
        topics = [f"{subject} Topic {i}" for i in range(1, 8)]
    if did not in syllabi_registry:
        syllabi_registry[did] = {"id": did, "name": f"UK {year} — {subject}", "chapters": topics, "owner_id": u["id"], "created_at": _now()}
        _save_syllabi()
    return jsonify({"syllabus_id": did, "topics": topics})

@app.post("/api/uk-curriculum/<tool>")
@auth()
def uk_tool(tool):
    b = request.json or {}
    year = b.get("year","Year 10"); subject = b.get("subject","Mathematics")
    topics = b.get("topics", [])
    topic_str = ", ".join(topics) if topics else subject
    ctx = f"UK National Curriculum: {subject}, {year}. Topics: {topic_str}."
    return _run_tool(tool, ctx, topic_str, subject)

# ── Summarise / Flashcards / Questions / Audio ────────────────────────────────
@app.post("/api/summarise")
@auth()
def summarise_chapter():
    b = request.json or {}
    sid     = b.get("syllabus_id")
    topic   = b.get("topic")
    subject = b.get("subject", "").lower()
    if not sid or not topic:
        return jsonify({"error": "syllabus_id and topic required"}), 400
    vs  = _load_vs(sid)
    ctx = ""
    if vs:
        try:
            docs = vs.as_retriever(search_kwargs={"k": 8}).invoke(topic)
            ctx  = "\n\n".join(d.page_content for d in docs)
        except Exception:
            pass
    if not ctx:
        s_info = syllabi_registry.get(sid, {})
        ctx = (f"Provide a comprehensive 10-point explanation about '{topic}' from the "
               f"'{s_info.get('name', subject)}' curriculum. "
               f"Cover: introduction, core concepts, key facts, examples, applications, and summary.")
    regional_langs = ["odia","kannada","hindi","telugu","gujarati","marathi","bengali","punjabi","tamil","malayalam"]
    is_regional    = any(lang in subject for lang in regional_langs)
    prompt = (REGIONAL_SUMMARISE_PROMPT.replace("{language}", subject.title()).replace("{context}", ctx)
              if is_regional else SUMMARISE_PROMPT.replace("{context}", ctx))
    return jsonify({"summary": _llm_text(prompt)})

@app.post("/api/flashcards")
@auth()
def generate_flashcards():
    b = request.json or {}
    sid     = b.get("syllabus_id")
    topic   = b.get("topic")
    subject = b.get("subject", "").lower()
    count   = max(1, min(30, int(b.get("flashcard_count", b.get("count", 10)))))
    if not sid or not topic:
        return jsonify({"error": "syllabus_id and topic required"}), 400
    vs  = _load_vs(sid)
    ctx = ""
    if vs:
        try:
            docs = vs.as_retriever(search_kwargs={"k": 10}).invoke(topic)
            ctx  = "\n\n".join(d.page_content for d in docs)
        except Exception:
            pass
    if not ctx:
        s_info = syllabi_registry.get(sid, {})
        ctx = f"Educational content for '{topic}' from {s_info.get('name', subject)} curriculum."
    regional_langs = ["odia","kannada","hindi","telugu","gujarati","marathi","bengali","punjabi","tamil","malayalam"]
    is_regional    = any(lang in subject for lang in regional_langs)
    prompt = (REGIONAL_FLASHCARDS_PROMPT.replace("{language}", subject.title())
                                         .replace("{count}", str(count))
                                         .replace("{context}", ctx)
              if is_regional
              else FLASHCARDS_PROMPT.replace("{count}", str(count)).replace("{context}", ctx))
    cards = _llm_json(prompt)
    if not isinstance(cards, list):
        cards = []
    return jsonify({"flashcards": cards})

@app.post("/api/curriculum/<tool>")
@auth()
def curriculum_tool(tool):
    b = request.json or {}
    sid      = b.get("syllabus_id")
    subject  = b.get("subject", "")
    chapters = b.get("chapters", [])
    topic    = b.get("topic") or (", ".join(chapters[:3]) if chapters else subject)
    fc_count = int(b.get("flashcard_count", 10))
    if not sid:
        return jsonify({"error": "syllabus_id required"}), 400
    vs  = _load_vs(sid)
    ctx = ""
    if vs:
        try:
            docs = vs.as_retriever(search_kwargs={"k": 8}).invoke(topic or subject)
            ctx  = "\n\n".join(d.page_content for d in docs)
        except Exception:
            pass
    if not ctx:
        s = syllabi_registry.get(sid, {})
        ctx = (f"You are an expert on the Indian school curriculum. "
               f"Provide detailed educational content for '{topic or subject}' "
               f"from '{s.get('name', subject)}'. Cover all key concepts, examples, and facts.")
    return _run_tool(tool, ctx, topic or subject, subject, fc_count=fc_count)

AUDIO_LESSON_PROMPT = """You are an expert Indian school teacher creating an audio lesson about: {topic}
Subject: {subject}

Generate a structured audio lesson with 4-6 sections. Each section should be speakable (no symbols, no markdown).
Return ONLY a valid JSON object with this structure:
{{
  "summary": "A complete 4-5 sentence spoken summary of the entire topic, natural language, no bullet points or symbols",
  "sections": [
    {{"label": "Introduction", "text": "2-3 sentences introducing the topic in simple spoken language"}},
    {{"label": "Core Concept", "text": "3-4 sentences explaining the main concept clearly"}},
    {{"label": "Real-World Example", "text": "2-3 sentences with a relatable Indian example"}},
    {{"label": "Key Points", "text": "3-4 sentences summarising the most important points to remember"}},
    {{"label": "Exam Tips", "text": "2-3 sentences on what students should focus on for exams"}}
  ]
}}

Rules:
- All text must be plain spoken English — no bullet symbols (•), no asterisks, no markdown
- Each section text should be 2-4 natural spoken sentences
- Use simple vocabulary suitable for Class 6-12 students
- Include Indian context where relevant (NCERT examples, Indian scientists, Indian geography)

Context from textbook: {context}

Return ONLY the JSON object, no markdown:"""

def _run_tool(tool: str, ctx: str, topic: str, subject: str, fc_count: int = 10):
    """Shared dispatcher for summarise / flashcards / questions / audio / video."""

    if tool == "summarise":
        summary = _llm_text(SUMMARISE_PROMPT.replace("{context}", ctx))
        return jsonify({"summary": summary})

    if tool == "flashcards":
        cards = _llm_json(FLASHCARDS_PROMPT.replace("{count}", str(fc_count)).replace("{context}", ctx))
        return jsonify({"flashcards": cards if isinstance(cards, list) else []})

    if tool == "questions":
        prompt = (
            f"Generate 10 exam-ready practice questions about: {topic}.\n"
            f"Context: {ctx}\n"
            f"Mix objective (MCQ) and subjective types.\n"
            f"Return ONLY a valid JSON array: [{{\"question\":\"...\",\"answer\":\"...\",\"type\":\"objective|subjective\"}}]"
        )
        qs = _llm_json(prompt)
        return jsonify({"questions": qs if isinstance(qs, list) else []})

    if tool == "audio":
        # Audio tool: returns structured sections for individual play + full summary
        prompt = AUDIO_LESSON_PROMPT.format(topic=topic, subject=subject, context=ctx[:3000])
        try:
            result = _llm_json(prompt, temperature=0.4)
            if isinstance(result, dict):
                # Clean all text to remove symbols that break TTS
                import re
                def clean_tts(text):
                    if not text: return ""
                    # Remove bullet symbols, asterisks, hash, pipes
                    text = re.sub(r'[•\*#|→←↑↓]', '', text)
                    # Remove markdown bold/italic
                    text = re.sub(r'\*+', '', text)
                    # Remove numbered list markers at start of lines
                    text = re.sub(r'^\s*\d+[\.\)]\s*', '', text, flags=re.MULTILINE)
                    # Collapse extra whitespace
                    text = re.sub(r'\s+', ' ', text).strip()
                    return text

                summary = clean_tts(result.get("summary", ""))
                sections = []
                for s in result.get("sections", []):
                    sections.append({
                        "label": s.get("label", "Section"),
                        "text":  clean_tts(s.get("text", ""))
                    })

                # If no sections returned, build from summary paragraphs
                if not sections and summary:
                    sentences = [s.strip() for s in summary.split('.') if s.strip()]
                    chunk_size = max(2, len(sentences) // 4)
                    for i in range(0, len(sentences), chunk_size):
                        chunk = '. '.join(sentences[i:i+chunk_size]) + '.'
                        sections.append({"label": f"Part {i//chunk_size + 1}", "text": chunk})

                return jsonify({"summary": summary, "sections": sections})
        except Exception as e:
            print(f"[AUDIO] JSON parse failed, falling back to text: {e}")
            # Fallback: generate plain text and split into sections
            fallback_prompt = f"Explain {topic} for Indian school students in 5 clear spoken paragraphs. No bullet points, no symbols, only plain sentences. Context: {ctx[:2000]}"
            summary = _llm_text(fallback_prompt, temperature=0.4)
            # Clean and split into sections
            import re
            summary = re.sub(r'[•\*#|→←↑↓]', '', summary)
            summary = re.sub(r'\*+', '', summary)
            paragraphs = [p.strip() for p in summary.split('\n\n') if p.strip()]
            if not paragraphs:
                paragraphs = [summary]
            labels = ["Introduction", "Core Concept", "Examples", "Key Points", "Summary"]
            sections = [
                {"label": labels[min(i, len(labels)-1)], "text": para}
                for i, para in enumerate(paragraphs[:5])
            ]
            return jsonify({"summary": summary, "sections": sections})

    if tool == "video":
        prompt = VIDEO_EXPLAINER_PROMPT.replace("{topic}", topic).replace("{context}", ctx)
        script = _llm_json(prompt)
        return jsonify({"script": script if isinstance(script, list) else []})

    return jsonify({"error": f"Unknown tool: {tool}"}), 400

# ── Chat ──────────────────────────────────────────────────────────────────────
@app.post("/api/chat")
@auth()
def chat():
    b           = request.json or {}
    question    = b.get("message", b.get("question", "")).strip()
    syllabus_id = b.get("doc_id", b.get("syllabus_id", "")).strip()
    u           = request.user

    if not question:
        return jsonify({"error": "Empty message"}), 400

    if not LANGCHAIN_OK or not OPENAI_API_KEY:
        return jsonify({"answer": "(Demo) AI features require OPENAI_API_KEY.", "sources": []})

    if syllabus_id and syllabus_id in syllabi_registry:
        try:
            chain  = _get_chain(syllabus_id)
            result = chain({"question": question})
            sources = list({Path(d.metadata.get("source","")).name for d in result.get("source_documents",[])})
            return jsonify({
                "answer": result["answer"], "sources": sources,
                "syllabus_id": syllabus_id,
                "syllabus_name": syllabi_registry.get(syllabus_id, {}).get("name", "")
            })
        except Exception as e:
            print(f"[CHAT] Chain error: {e}")

    # Cross-syllabus global search
    if not syllabus_id:
        all_ctx, all_src = [], set()
        for sid, info in syllabi_registry.items():
            try:
                vs = _load_vs(sid)
                if vs and hasattr(vs, "similarity_search"):
                    docs = vs.similarity_search(question, k=2)
                    if docs:
                        all_ctx.append(f"--- {info.get('name','?')} ---\n" + "\n".join(d.page_content for d in docs))
                        for d in docs:
                            all_src.add(Path(d.metadata.get("source","")).name)
            except Exception:
                continue
        if all_ctx:
            prompt = f"Context from multiple sources:\n\n{chr(10).join(all_ctx)}\n\nQuestion: {question}\n\nAnswer based on the context:"
            return jsonify({"answer": _llm_text(prompt), "sources": list(all_src), "syllabus_id": "global"})

    # General fallback
    try:
        sys_msg = SystemMessage(content=f"You are a helpful AI study assistant. The user is a {u.get('role','student')}. Be helpful and educational.")
        res = _get_llm(mini=True).invoke([sys_msg, HumanMessage(content=question)])
        return jsonify({"answer": res.content, "sources": [], "syllabus_id": ""})
    except Exception as e:
        return jsonify({"error": f"AI error: {e}"}), 500

# ── Mentor / Video Session ────────────────────────────────────────────────────
@app.post("/api/mentor-session")
@auth()
def video_explanation():
    b   = request.json or {}
    sid = b.get("syllabus_id", "")
    topic = b.get("topic", "")
    if not sid or not topic:
        return jsonify({"error": "syllabus_id and topic required"}), 400
    vs  = _load_vs(sid)
    ctx = ""
    if vs:
        try:
            docs = vs.as_retriever(search_kwargs={"k": 5}).invoke(topic)
            ctx  = "\n\n".join(d.page_content for d in docs)
        except Exception:
            pass
    if not ctx:
        ctx = f"Educational content about {topic}."
    prompt = VIDEO_EXPLAINER_PROMPT.replace("{topic}", topic).replace("{context}", ctx)
    script = _llm_json(prompt)
    if not isinstance(script, list):
        return jsonify({"error": "Failed to generate video script"}), 500
    return jsonify({"script": script})

# ══════════════════════════════════════════════════════════════════════════════
#  QUESTION GENERATION
# ══════════════════════════════════════════════════════════════════════════════
@app.post("/api/generate-questions")
@auth()
def generate_questions():
    data = request.json or {}
    sid         = data.get("syllabus_id", "").strip()
    topic       = data.get("topic", "the uploaded material")
    chapters    = data.get("chapters", [])
    obj_count   = max(0, int(data.get("objective_count", data.get("count", 5))))
    subj_count  = max(0, int(data.get("subjective_count", 0)))
    obj_weight  = float(data.get("objective_weightage", data.get("marks", 1)))
    subj_weight = float(data.get("subjective_weightage", max(2.0, float(data.get("marks", 2)))))
    total       = obj_count + subj_count

    if not sid or sid not in syllabi_registry:
        return jsonify({"error": "Select a valid syllabus first"}), 400
    if total <= 0:
        return jsonify({"error": "Total questions must be > 0"}), 400

    # Difficulty distribution
    single_diff = (data.get("difficulty") or "").lower()
    if single_diff in ("easy", "medium", "hard"):
        easy_c   = total if single_diff == "easy"   else 0
        medium_c = total if single_diff == "medium" else 0
        hard_c   = total if single_diff == "hard"   else 0
    else:
        dist     = data.get("difficulty_distribution", {})
        easy_c   = max(0, round((int(dist.get("easy",   40)) / 100) * total))
        medium_c = max(0, round((int(dist.get("medium", 40)) / 100) * total))
        hard_c   = max(0, total - easy_c - medium_c)

    topic_str  = f"{topic} — chapters: {', '.join(chapters)}" if chapters else topic
    subject    = data.get("subject", "").lower()
    regional   = ["odia","kannada","hindi","telugu","gujarati","marathi","bengali","punjabi","tamil","malayalam"]
    is_regional= any(lang in subject for lang in regional)

    try:
        vs  = _load_vs(sid)
        ctx = ""
        if vs:
            docs = vs.as_retriever(search_kwargs={"k": 8}).invoke(topic_str)
            ctx  = "\n\n".join(d.page_content for d in docs)
        if not ctx:
            s_name = syllabi_registry.get(sid, {}).get("name", "General Knowledge")
            ctx    = f"Generate high-quality questions for '{s_name}' on: {topic_str}."

        base  = REGIONAL_MIXED_QUESTION_GEN_PROMPT.replace("{language}", subject.title()) if is_regional else MIXED_QUESTION_GEN_PROMPT
        prompt= base.replace("{context}", ctx).replace("{topic}", topic_str).format(
            total_count=total, objective_count=obj_count, subjective_count=subj_count,
            easy_count=easy_c, medium_count=medium_c, hard_count=hard_c
        )
        questions = _llm_json(prompt, temperature=0.2)
        if isinstance(questions, dict) and "questions" in questions:
            questions = questions["questions"]
        if not isinstance(questions, list):
            return jsonify({"error": "Question generation failed — unexpected AI response"}), 500
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": f"Server error: {e}"}), 500

    normalized = []
    for i, q in enumerate(questions, 1):
        qtype  = q.get("type", "objective")
        is_obj = (qtype == "objective")
        weight = obj_weight if is_obj else subj_weight
        try:
            weight = float(q.get("weightage", weight))
        except Exception:
            pass
        normalized.append({
            "id": i, "type": qtype,
            "difficulty": str(q.get("difficulty","medium")).title(),
            "marks": weight, "question": q.get("question",""),
            "options": q.get("options") if is_obj else None,
            "answer": (", ".join(q.get("valid_answers",[])) if is_obj
                       else q.get("valid_answers",[""])[0] if q.get("valid_answers") else ""),
            "explanation": q.get("explanation",""),
            "evaluation_criteria": q.get("evaluation_rubric") or ", ".join(q.get("answer_key_points",[]))
        })

    exam_id = uuid.uuid4().hex[:10]
    u       = request.user
    payload = {
        "exam_id": exam_id, "owner_id": u["id"], "created_at": _now(),
        "syllabus_id": sid, "syllabus_name": syllabi_registry[sid]["name"],
        "topic": topic_str, "chapters": chapters,
        "objective_count": obj_count, "subjective_count": subj_count,
        "questions": normalized,
        "total_marks": sum(float(q["marks"]) for q in normalized),
    }
    exams_registry[exam_id] = payload
    if not IS_VERCEL:
        _save_json(EXAMS_DIR / f"{exam_id}.json", payload)
    _save_exams()
    return jsonify({**payload})

# ── List / Get / Delete Exams ─────────────────────────────────────────────────
@app.get("/api/questions")
@auth()
def list_exams():
    u     = request.user
    exams = list(exams_registry.values())
    if u["role"] == "student":
        exams = [e.copy() for e in exams if e.get("owner_id") == u["id"]]
        for e in exams:
            e["questions"] = [{k: v for k, v in q.items() if k not in ("answer","valid_answers","explanation","answer_key_points","evaluation_rubric")} for q in e.get("questions", [])]
    elif u["role"] not in ("school_admin", "admin"):
        exams = [e for e in exams if e.get("owner_id") == u["id"]]
    return jsonify({"exams": exams})

@app.post("/api/exams/save")
@auth()
def save_exam():
    """Save a generated exam and return a stable Exam ID for evaluation."""
    data = request.json or {}
    u    = request.user

    questions   = data.get("questions", [])
    if not questions:
        return jsonify({"error": "questions list is required"}), 400

    exam_id = uuid.uuid4().hex[:10]

    # Normalise questions — ensure all required fields present
    normalised = []
    for i, q in enumerate(questions, 1):
        qtype   = q.get("type", "objective")
        is_obj  = qtype == "objective"
        marks   = float(q.get("marks", 1 if is_obj else 5))
        entry = {
            "id":          q.get("id", i),
            "type":        qtype,
            "difficulty":  q.get("difficulty", "Medium"),
            "marks":       marks,
            "weightage":   marks,
            "question":    q.get("question", ""),
            "options":     q.get("options") if is_obj else None,
            "answer":      q.get("answer", ""),
            "valid_answers": [q.get("answer", "")] if q.get("answer") else [],
            "explanation": q.get("explanation", ""),
            "answer_key_points":  [],
            "evaluation_rubric":  q.get("evaluation_criteria", ""),
        }
        normalised.append(entry)

    payload = {
        "exam_id":          exam_id,
        "owner_id":         u["id"],
        "created_at":       _now(),
        "syllabus_id":      data.get("syllabus_id", ""),
        "syllabus_name":    data.get("syllabus_name", "Custom Exam"),
        "topic":            data.get("topic", ""),
        "board":            data.get("board", ""),
        "class":            data.get("class", ""),
        "subject":          data.get("subject", ""),
        "school_name":      data.get("school_name", ""),
        "teacher_name":     data.get("teacher_name", ""),
        "exam_date":        data.get("exam_date", ""),
        "difficulty":       data.get("difficulty", "Mixed"),
        "objective_count":  len([q for q in normalised if q["type"] == "objective"]),
        "subjective_count": len([q for q in normalised if q["type"] != "objective"]),
        "questions":        normalised,
        "total_marks":      sum(float(q["marks"]) for q in normalised),
    }

    exams_registry[exam_id] = payload
    if not IS_VERCEL:
        _save_json(EXAMS_DIR / f"{exam_id}.json", payload)
    _save_exams()

    # Also persist to MongoDB directly for durability
    if MONGO_OK:
        try:
            mongo_db["exams_detail"].update_one(
                {"exam_id": exam_id},
                {"$set": payload},
                upsert=True
            )
        except Exception as e:
            print(f"[EXAMS] MongoDB detail write failed: {e}")

    print(f"[EXAMS] Saved exam {exam_id} — {len(normalised)} questions, {payload['total_marks']} marks")
    return jsonify({"ok": True, "exam_id": exam_id, "total_marks": payload["total_marks"],
                    "objective_count": payload["objective_count"],
                    "subjective_count": payload["subjective_count"]}), 201

@app.get("/api/exams/<exam_id>")
@auth()
def get_exam(exam_id):
    e = exams_registry.get(exam_id)
    if not e and not IS_VERCEL:
        p = EXAMS_DIR / f"{exam_id}.json"
        if p.exists():
            e = _load_json(p)
            if e:
                exams_registry[exam_id] = e
    if not e:
        return jsonify({"error": "Exam not found"}), 404
    return jsonify(e)

@app.delete("/api/exams/<exam_id>")
@auth(roles=["tutor","teacher","school_admin","admin"])
def delete_exam(exam_id):
    u = request.user
    if exam_id not in exams_registry:
        return jsonify({"error": "Not found"}), 404
    if u["role"] not in ("school_admin","admin") and exams_registry[exam_id].get("owner_id") != u["id"]:
        return jsonify({"error": "Forbidden"}), 403
    exams_registry.pop(exam_id, None)
    if not IS_VERCEL:
        p = EXAMS_DIR / f"{exam_id}.json"
        if p.exists():
            p.unlink()
    _save_exams()
    return jsonify({"ok": True})

@app.get("/api/exams/<exam_id>/analytics")
@auth(roles=["tutor","teacher","school_admin","admin"])
def get_exam_analytics(exam_id):
    evals = [v for v in evaluations_registry.values() if v.get("exam_id") == exam_id]
    if not evals:
        return jsonify({"error": "No evaluations found for this exam"}), 404
    total = len(evals)
    q_stats: Dict[int, dict] = {}
    for ev in evals:
        for i, qr in enumerate(ev.get("result", {}).get("question_wise", [])):
            if i not in q_stats:
                q_stats[i] = {"awarded": 0.0, "possible": 0.0}
            q_stats[i]["awarded"]  += float(qr.get("awarded_marks", 0))
            q_stats[i]["possible"] += float(qr.get("max_marks", 1))
    gaps = [{"index": i, "average": round((s["awarded"] / s["possible"]) * 100, 1)}
            for i, s in q_stats.items() if s["possible"] > 0 and (s["awarded"] / s["possible"]) < 0.5]
    top = sorted(evals, key=lambda e: e.get("result",{}).get("percentage",0), reverse=True)[:5]
    return jsonify({
        "total_evaluations": total,
        "class_average": round(sum(e.get("result",{}).get("percentage",0) for e in evals) / total, 2),
        "learning_gaps": gaps,
        "top_performers": [{"roll_no": e.get("result",{}).get("roll_no","N/A"),
                             "percentage": e.get("result",{}).get("percentage",0)} for e in top]
    })

# ══════════════════════════════════════════════════════════════════════════════
#  EVALUATION ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════
def _load_exam(exam_id: str) -> Optional[dict]:
    if exam_id in exams_registry:
        return exams_registry[exam_id]
    if not IS_VERCEL:
        p = EXAMS_DIR / f"{exam_id}.json"
        if p.exists():
            e = _load_json(p)
            if e:
                exams_registry[exam_id] = e
                return e
    return None

# ── Multi-student PDF splitter using GPT-4o vision ───────────────────────────
def _split_multi_student_pdf(pdf_path: str, exam_questions: list = None) -> list:
    """
    Use GPT-4o to extract each student's answers from a combined answer-sheet PDF.
    Returns a list of dicts: [{"student_name": "", "roll_no": "", "answers": {1: "...", ...}}]
    """
    import base64, io

    prompt = """This PDF contains answer sheets from MULTIPLE students.
For each student you can identify, extract:
1. Their name (from header or written at top)
2. Their roll number (if present)
3. Their answers in format Q<number>: <answer>

Return ONLY a valid JSON array like:
[
  {
    "student_name": "Ravi Kumar",
    "roll_no": "101",
    "raw_text": "Q1: B  Q2: photosynthesis  Q3: Newton's first law..."
  }
]

If you cannot identify separate students, return a single entry with student_name "Student 1".
Return ONLY the JSON array, nothing else."""

    try:
        # Convert PDF pages to images for vision API
        try:
            import pypdf
            reader = pypdf.PdfReader(pdf_path)
            # Extract all text first
            all_text = "\n\n--- PAGE BREAK ---\n\n".join(
                page.extract_text() for page in reader.pages if page.extract_text()
            )
        except Exception:
            all_text = ""

        if all_text:
            # Use text-based extraction first (cheaper)
            extract_prompt = f"""This is text extracted from a combined answer sheet PDF containing multiple students' answers.

Text content:
{all_text[:6000]}

{prompt}"""
            result = _llm_json(extract_prompt, temperature=0.1, mini=True)
            if isinstance(result, list) and result:
                return result

        # Fallback: vision-based extraction for scanned PDFs
        # Convert PDF pages to PNG images — GPT-4o-mini cannot read raw PDF bytes
        try:
            from pdf2image import convert_from_path
            import io as _io
            images = convert_from_path(pdf_path, dpi=200)
        except Exception as _conv_err:
            print(f"[MULTI-SPLIT] pdf2image unavailable: {_conv_err}")
            return [{"student_name": "Student 1", "roll_no": "1", "raw_text": ""}]

        client = _oai.OpenAI(api_key=OPENAI_API_KEY)
        all_raw_text_parts = []
        for img in images:
            buf = _io.BytesIO()
            img.save(buf, format="PNG")
            img_b64 = base64.b64encode(buf.getvalue()).decode()
            page_resp = client.chat.completions.create(
                model=OPENAI_MINI,
                temperature=0.1,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": (
                            "Extract all student names, roll numbers, and answers from this answer sheet page. "
                            "Format each answer as Q<number>: <answer>. Include a header line like: "
                            "Student: <name>  Roll: <number>  then the answers."
                        )},
                        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{img_b64}"}}
                    ]
                }]
            )
            all_raw_text_parts.append(page_resp.choices[0].message.content)

        combined_text = "\n\n--- PAGE BREAK ---\n\n".join(all_raw_text_parts)
        # Now ask GPT to structure the combined text into per-student JSON
        question_ctx = "\n".join(
            f"Q{q.get('id')}: {str(q.get('question',''))[:60]} [{q.get('type','objective')}]"
            for q in (exam_questions or [])
        )
        structure_resp = client.chat.completions.create(
            model=OPENAI_MINI,
            temperature=0.1,
            response_format={"type": "json_object"},
            messages=[{
                "role": "user",
                "content": f"{prompt}\n\nExam questions for context (extract ONLY student answers, NOT these questions):\n{question_ctx}\n\nExtracted text from all pages:\n{combined_text[:6000]}"
            }]
        )
        raw = structure_resp.choices[0].message.content
        parsed = _clean_json(raw)
        if isinstance(parsed, list) and parsed:
            return parsed
        if isinstance(parsed, dict):
            for k in ("students", "data", "results"):
                if isinstance(parsed.get(k), list):
                    return parsed[k]
        return [{"student_name": "Student 1", "roll_no": "", "raw_text": combined_text}]

    except Exception as e:
        print(f"[MULTI-SPLIT] {e}")
        # Absolute fallback: treat as single student
        return [{"student_name": "Student 1", "roll_no": "1", "raw_text": ""}]

def _parse_raw_answers(raw_text: str) -> Dict[int, str]:
    """Parse Q1: answer  Q2: answer ... from raw text."""
    answers: Dict[int, str] = {}
    for line in raw_text.splitlines():
        line = line.strip()
        if not line:
            continue
        for pat in [r"Q(?:uestion)?\s*(\d+)\s*[:\-]\s*(.+)", r"(\d+)\s*[\)\.\-:]\s*(.+)"]:
            m = re.match(pat, line, flags=re.IGNORECASE)
            if m:
                answers[int(m.group(1))] = m.group(2).strip()
                break
    return answers

@app.post("/api/evaluate")
@auth()
def evaluate_sheet():
    """Single answer sheet evaluation."""
    u            = request.user
    exam_id      = request.form.get("exam_id")
    roll_no      = request.form.get("roll_no", "")
    student_name = request.form.get("student_name", "")
    parent_email = request.form.get("parent_email", "")

    if not exam_id:
        return jsonify({"error": "exam_id required"}), 400
    e = _load_exam(exam_id)
    if not e:
        return jsonify({"error": "Exam not found"}), 404
    if "answer_sheet" not in request.files:
        return jsonify({"error": "answer_sheet file required"}), 400

    f = request.files["answer_sheet"]
    if not f or not _allowed(f.filename):
        return jsonify({"error": "Unsupported file type"}), 400

    fn   = secure_filename(f.filename)
    path = UPL_DIR / f"{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}_{fn}"
    f.save(str(path))

    answers, mode = _extract_answers(str(path), exam_questions=e.get("questions", []))
    if not answers:
        return jsonify({"error": f"Could not extract answers (mode: {mode})"}), 400

    result  = _evaluate_answers(e, answers, roll_no)
    eval_id = uuid.uuid4().hex[:10]
    payload = {
        "evaluation_id": eval_id, "exam_id": exam_id, "created_at": _now(),
        "student_name": student_name, "roll_no": roll_no,
        "parent_email": parent_email, "file_name": fn,
        "extraction_mode": mode, "submitted_answers": answers, "result": result
    }
    evaluations_registry[eval_id] = payload
    if not IS_VERCEL:
        _save_json(EVAL_DIR / f"{eval_id}.json", payload)
    _save_evals()
    return jsonify(payload)


@app.post("/api/evaluate/multi-student")
@auth()
def evaluate_multi_student():
    """
    Evaluate a SINGLE PDF that contains multiple students' answer sheets.
    AI splits the PDF by student, extracts each student's answers, and evaluates each separately.
    Returns all evaluations in one response.
    """
    exam_id = request.form.get("exam_id")
    if not exam_id:
        return jsonify({"error": "exam_id required"}), 400
    e = _load_exam(exam_id)
    if not e:
        return jsonify({"error": "Exam not found"}), 404
    if "answer_sheet" not in request.files:
        return jsonify({"error": "answer_sheet (PDF) required"}), 400

    f = request.files["answer_sheet"]
    if not f or not _allowed(f.filename):
        return jsonify({"error": "Only PDF files supported for multi-student mode"}), 400

    fn   = secure_filename(f.filename)
    path = UPL_DIR / f"{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}_{fn}"
    f.save(str(path))

    print(f"[MULTI-EVAL] Starting multi-student extraction from {fn}")

    # Step 1: Split PDF into per-student sections
    student_sections = _split_multi_student_pdf(str(path), exam_questions=e.get("questions", []))
    print(f"[MULTI-EVAL] Detected {len(student_sections)} students")

    all_evaluations = []
    for idx, section in enumerate(student_sections):
        sname    = section.get("student_name") or f"Student {idx + 1}"
        roll     = section.get("roll_no") or str(idx + 1)
        raw_text = section.get("raw_text", "")

        # Step 2: Parse answers from this student's section
        answers = _parse_raw_answers(raw_text)
        if not answers:
            # Fallback: try vision on a temp text file
            tmp = UPL_DIR / f"student_{idx}_{uuid.uuid4().hex[:6]}.txt"
            tmp.write_text(raw_text, encoding="utf-8")
            answers, _ = _extract_answers(str(tmp), exam_questions=e.get("questions", []))
            try:
                tmp.unlink()
            except Exception:
                pass

        if not answers:
            print(f"[MULTI-EVAL] No answers extracted for {sname} — skipping")
            continue

        # Step 3: Evaluate
        result  = _evaluate_answers(e, answers, roll)
        eval_id = uuid.uuid4().hex[:10]
        payload = {
            "evaluation_id":   eval_id,
            "exam_id":         exam_id,
            "created_at":      _now(),
            "student_name":    sname,
            "roll_no":         roll,
            "parent_email":    section.get("parent_email", ""),
            "file_name":       fn,
            "extraction_mode": "multi_student_gpt4o",
            "submitted_answers": answers,
            "result":          result,
        }
        evaluations_registry[eval_id] = payload
        if not IS_VERCEL:
            _save_json(EVAL_DIR / f"{eval_id}.json", payload)
        all_evaluations.append(payload)

    _save_evals()

    # Class-level summary
    total_students = len(all_evaluations)
    avg_pct = round(
        sum(ev["result"].get("percentage", 0) for ev in all_evaluations) / max(total_students, 1),
        1
    )
    pass_count = sum(1 for ev in all_evaluations if ev["result"].get("is_pass"))

    return jsonify({
        "student_count":  total_students,
        "class_average":  avg_pct,
        "pass_count":     pass_count,
        "fail_count":     total_students - pass_count,
        "evaluations":    all_evaluations,
        "exam_id":        exam_id,
    })


@app.post("/api/evaluate/bulk")
@auth(roles=["tutor","teacher","school_admin"])
def bulk_evaluate():
    """Multiple separate files (one per student) in a ZIP or multi-file upload."""
    exam_id = request.form.get("exam_id")
    if not exam_id:
        return jsonify({"error": "exam_id required"}), 400
    e = _load_exam(exam_id)
    if not e:
        return jsonify({"error": "Exam not found"}), 404

    files   = request.files.getlist("answer_sheets")
    results, failures = [], []
    for f in files:
        if not f or not _allowed(f.filename):
            failures.append({"file": getattr(f,"filename","?"), "error": "unsupported_type"})
            continue
        fn   = secure_filename(f.filename)
        path = UPL_DIR / f"{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}_{fn}"
        f.save(str(path))
        answers, mode = _extract_answers(str(path), exam_questions=e.get("questions", []))
        if not answers:
            failures.append({"file": fn, "error": f"extract_failed ({mode})"}); continue
        m    = re.search(r"(\d+)", fn)
        roll = request.form.get(f"roll_no_{fn}", "") or (m.group(1) if m else fn)
        res  = _evaluate_answers(e, answers, roll)
        eid  = uuid.uuid4().hex[:10]
        p    = {
            "evaluation_id": eid, "exam_id": exam_id, "created_at": _now(),
            "student_name": request.form.get(f"name_{fn}", ""),
            "roll_no": roll, "file_name": fn,
            "extraction_mode": mode, "submitted_answers": answers, "result": res
        }
        evaluations_registry[eid] = p
        if not IS_VERCEL:
            _save_json(EVAL_DIR / f"{eid}.json", p)
        results.append({"evaluation_id": eid, "roll_no": roll,
                        "percentage": res.get("percentage",0), "is_pass": res.get("is_pass",False),
                        "total_awarded": res.get("total_awarded",0), "total_possible": res.get("total_possible",0)})
    _save_evals()
    bulk_id = uuid.uuid4().hex[:10]
    bp      = {"bulk_id": bulk_id, "exam_id": exam_id, "created_at": _now(),
               "total": len(results), "results": results, "failures": failures}
    bulk_evaluations_registry[bulk_id] = bp
    if not IS_VERCEL:
        _save_json(BULK_DIR / f"{bulk_id}.json", bp)
    _save_bulk()
    return jsonify(bp)


@app.get("/api/evaluations/<eval_id>")
@auth()
def get_evaluation(eval_id):
    ev = evaluations_registry.get(eval_id)
    if not ev and not IS_VERCEL:
        ev = _load_json(EVAL_DIR / f"{eval_id}.json")
        if ev:
            evaluations_registry[eval_id] = ev
    if not ev:
        return jsonify({"error": "Not found"}), 404
    return jsonify(ev)


@app.post("/api/evaluations/send-report")
@auth()
def send_evaluation_report():
    """
    Send a richly formatted HTML performance report to a parent's email.
    Accepts pre-rendered HTML from the frontend, or builds one from eval data.
    """
    data         = request.json or {}
    eval_id      = data.get("evaluation_id")
    parent_email = data.get("parent_email", "").strip()
    student_name = data.get("student_name", "Student")
    html_report  = data.get("html_report", "")  # pre-built by React
    exam_meta    = data.get("exam_meta") or {}

    if not parent_email:
        return jsonify({"error": "parent_email is required"}), 400

    # Build subject line
    subject_line = (
        f"Performance Report — {student_name} | "
        f"{exam_meta.get('subject', exam_meta.get('syllabus_name', 'Examination'))}"
    )

    # If no pre-built HTML, fetch eval and build a basic one
    if not html_report and eval_id:
        ev = evaluations_registry.get(eval_id)
        if ev:
            res = ev.get("result", {})
            pct = res.get("percentage", 0)
            html_report = f"""
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#1e293b;border-bottom:2px solid #1e293b;padding-bottom:10px">
    Academic Performance Report
  </h2>
  <p>Dear Parent/Guardian,</p>
  <p>Please find the performance details for <strong>{student_name}</strong>:</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    <tr><td style="padding:10px;background:#f8fafc;font-weight:700;border:1px solid #e2e8f0">Marks</td>
        <td style="padding:10px;border:1px solid #e2e8f0">{res.get('total_awarded',0)}/{res.get('total_possible',0)}</td></tr>
    <tr><td style="padding:10px;background:#f8fafc;font-weight:700;border:1px solid #e2e8f0">Percentage</td>
        <td style="padding:10px;border:1px solid #e2e8f0;font-weight:700;color:{'#065f46' if pct>=60 else '#991b1b'}">{pct}%</td></tr>
    <tr><td style="padding:10px;background:#f8fafc;font-weight:700;border:1px solid #e2e8f0">Result</td>
        <td style="padding:10px;border:1px solid #e2e8f0;font-weight:700;color:{'#065f46' if res.get('is_pass') else '#991b1b'}">{
          'PASS ✓' if res.get('is_pass') else 'FAIL ✗'}</td></tr>
  </table>
  {f'<p><strong>Teacher Note:</strong> {res.get("improvement_prediction","")}</p>' if res.get("improvement_prediction") else ''}
  <p style="color:#64748b;font-size:12px;margin-top:20px">Evaluated by Parvidya AI System · Exam ID: {ev.get('exam_id','')}</p>
</div>"""

    # Send via SMTP
    host   = os.getenv("SMTP_HOST")
    port   = int(os.getenv("SMTP_PORT", 587))
    user   = os.getenv("SMTP_USER")
    passwd = os.getenv("SMTP_PASS")
    sender = os.getenv("SMTP_FROM", user)

    if not all([host, user, passwd]):
        print(f"[EMAIL] SMTP not configured — would have sent to {parent_email}")
        # In dev mode, return success so UI can be tested
        return jsonify({
            "success":  True,
            "message":  f"[Dev mode] SMTP not configured. Report would be sent to {parent_email}.",
            "dev_mode": True
        })

    try:
        msg = MIMEMultipart("alternative")
        msg["From"]    = sender
        msg["To"]      = parent_email
        msg["Subject"] = subject_line
        msg.attach(MIMEText(html_report, "html", "utf-8"))

        with smtplib.SMTP(host, port) as s:
            s.starttls()
            s.login(user, passwd)
            s.send_message(msg)

        print(f"[EMAIL] Report sent to {parent_email} for {student_name}")
        return jsonify({"success": True, "message": f"Report successfully sent to {parent_email}"})

    except Exception as e:
        print(f"[EMAIL] Failed: {e}")
        return jsonify({"error": f"Email failed: {str(e)}. Check SMTP settings in .env"}), 500


@app.post("/api/evaluations/<eval_id>/audit")
@auth(roles=["tutor","teacher","school_admin"])
def audit_evaluation(eval_id):
    ev = evaluations_registry.get(eval_id) or _load_json(EVAL_DIR / f"{eval_id}.json", {})
    if not ev:
        return jsonify({"error": "Not found"}), 404
    ex = _load_exam(ev.get("exam_id",""))
    if not ex:
        return jsonify({"error": "Exam not found"}), 404
    audit = _run_audit(ex, ev.get("result", {}))
    ev["audit"] = {"run_at": _now(), **audit}
    evaluations_registry[eval_id] = ev
    if not IS_VERCEL:
        _save_json(EVAL_DIR / f"{eval_id}.json", ev)
    _save_evals()
    return jsonify({"evaluation_id": eval_id, "audit": ev["audit"]})

# ══════════════════════════════════════════════════════════════════════════════
#  PRACTICE MODE
# ══════════════════════════════════════════════════════════════════════════════
@app.post("/api/curriculum/practice/generate")
@auth()
def generate_practice():
    u    = request.user
    data = request.json or {}
    sid  = data.get("syllabus_id", "").strip()
    topic     = data.get("topic", "the material")
    obj_count = int(data.get("objective_count", 5))
    subj_count= int(data.get("subjective_count", 5))
    diff      = data.get("difficulty", "medium").lower()
    total     = obj_count + subj_count

    if not sid or sid not in syllabi_registry:
        return jsonify({"error": "Select a valid syllabus first"}), 400

    # Fetch previous questions from MongoDB to avoid repetition
    previous_qs: list = []
    if MONGO_OK:
        hist = _mongo_find_one(M_PRACTICE_HIST, {"user_id": u["id"], "syllabus_id": sid, "topic": topic})
        if hist:
            previous_qs = hist.get("asked_questions", [])

    vs  = _load_vs(sid)
    ctx = ""
    if vs:
        try:
            docs = vs.as_retriever(search_kwargs={"k": 5}).invoke(topic)
            ctx  = "\n\n".join(d.page_content for d in docs)
        except Exception:
            pass
    if not ctx:
        s = syllabi_registry.get(sid, {})
        ctx = f"Syllabus: {s.get('name','General')}. Topic: {topic}."

    exclusion = ""
    if previous_qs:
        exclusion = "\nDO NOT repeat these previously asked questions:\n" + "\n".join(f"- {q}" for q in previous_qs[-20:])

    prompt = MIXED_PRACTICE_GEN_PROMPT.format(
        total_count=total, objective_count=obj_count, subjective_count=subj_count,
        difficulty=diff, context=ctx, topic=topic
    ) + exclusion

    try:
        raw = _llm_json(prompt, temperature=0.7)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    # Normalise
    questions = raw if isinstance(raw, list) else raw.get("questions", []) if isinstance(raw, dict) else []
    valid_qs  = []
    for q in questions:
        if not isinstance(q, dict):
            continue
        q_text = q.get("question") or q.get("q") or q.get("text")
        a_text = q.get("answer") or q.get("a") or q.get("explanation")
        if not q_text or not a_text:
            continue
        if isinstance(a_text, list):
            a_text = "; ".join(a_text)
        valid_qs.append({
            "question": str(q_text).strip(),
            "answer":   str(a_text).strip(),
            "type":     q.get("type", "subjective"),
            "options":  q.get("options"),
        })

    if not valid_qs:
        return jsonify({"error": "AI returned empty or malformed questions. Please try again."}), 500

    # Strict type filtering
    if obj_count > 0 and subj_count == 0:
        valid_qs = [q for q in valid_qs if q["type"] == "objective"] or valid_qs
    elif subj_count > 0 and obj_count == 0:
        valid_qs = [q for q in valid_qs if q["type"] == "subjective"] or valid_qs

    # Persist question history to MongoDB
    if MONGO_OK and valid_qs:
        new_texts = [q["question"] for q in valid_qs]
        _mongo_update(M_PRACTICE_HIST,
                      {"user_id": u["id"], "syllabus_id": sid, "topic": topic},
                      {"$push": {"asked_questions": {"$each": new_texts}}},
                      upsert=True)

    return jsonify(valid_qs)

@app.post("/api/curriculum/practice/evaluate")
@auth()
def evaluate_practice():
    data = request.json or {}
    question  = data.get("question","")
    model_ans = data.get("model_answer","")
    stud_ans  = data.get("student_answer","")
    q_type    = data.get("type", "subjective")
    options   = data.get("options", {})

    # Deterministic check for objective questions
    if q_type == "objective":
        # Build a rich question dict so _objective_is_correct can bridge
        # letter keys ↔ option text (e.g. student picks "A", model stores "5").
        q_dict = {
            "options":       options or {},
            "answer":        model_ans,
            # Also populate valid_answers with both the raw value AND any
            # option text that matches, so all comparison paths are covered.
            "valid_answers": [model_ans],
        }
        is_correct = _objective_is_correct(q_dict, stud_ans)

        # Build a human-readable correct answer label (prefer "A (5)" style)
        correct_label = model_ans
        if options:
            # If model_ans is a letter key, show "A (text)"
            if model_ans.strip().upper() in options:
                correct_label = f"{model_ans.upper()} — {options[model_ans.strip().upper()]}"
            else:
                # If model_ans is option text, find its letter
                for k, v in options.items():
                    if _normalize(v) == _normalize(model_ans):
                        correct_label = f"{k} — {v}"
                        break

        if is_correct:
            return jsonify({
                "score": 10,
                "is_correct": True,
                "feedback": f"Correct! The answer is {correct_label}.",
                "improvements": ""
            })
        else:
            return jsonify({
                "score": 0,
                "is_correct": False,
                "feedback": f"Incorrect. The correct answer is {correct_label}.",
                "improvements": "Review this topic in your textbook."
            })

    try:
        prompt = PRACTICE_EVALUATION_PROMPT.replace("{question}", question).replace("{model_answer}", model_ans).replace("{student_answer}", stud_ans)
        result = _llm_json(prompt, temperature=0, mini=True)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.post("/api/curriculum/practice/report")
@auth()
def practice_report():
    data = request.json or {}
    attempts = data.get("attempts", [])
    if not attempts:
        return jsonify({"error": "attempts list required"}), 400
    try:
        prompt = PRACTICE_REPORT_PROMPT.replace("{session_data}", json.dumps(attempts, default=str))
        result = _llm_json(prompt, temperature=0.2, mini=True)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.post("/api/curriculum/practice/email-report")
@auth()
def email_practice_report():
    data    = request.json or {}
    email   = data.get("email")
    results = data.get("results", [])
    if not email:
        return jsonify({"error": "email required"}), 400
    ok = send_email_report(email, "Your AI Practice Results — VidyAI", results)
    if ok:
        return jsonify({"success": True, "message": f"Report sent to {email}"})
    return jsonify({"success": False, "message": "SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env"}), 500

# ══════════════════════════════════════════════════════════════════════════════
#  ADMIN ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════
@app.get("/api/admin/users")
@auth(roles=["admin","school_admin"])
def admin_list_users():
    """
    Return ALL registered users to admin / school_admin — no institution
    filtering whatsoever.  Every user who successfully signs up must
    appear here immediately, regardless of what institution they entered
    (or left blank) at registration time.
    """
    db          = db_load()
    u           = request.user
    role_filter = request.args.get("role")

    # Include every user except the caller themselves.
    # school_admin cannot see super-admin accounts to prevent privilege
    # escalation, but they see every student / teacher / parent / tutor.
    if u["role"] == "admin":
        users = [x for x in db["users"] if x["id"] != u["id"]]
    else:
        users = [
            x for x in db["users"]
            if x["id"] != u["id"]
            and x["role"] != "admin"   # hide super-admin from school_admin
        ]

    if role_filter:
        users = [x for x in users if x["role"] == role_filter]

    return jsonify({"users": [_safe(x) for x in users]})

@app.post("/api/admin/users")
@auth(roles=["admin"])
def admin_add_user():
    b = request.json or {}; db = db_load()
    email = b.get("email","").strip().lower()
    if any(x["email"] == email for x in db["users"]):
        return jsonify({"error": "Email exists"}), 409
    u = {"id":_uid(),"name":b.get("name",""),"email":email,
         "pw_hash":_hash(b.get("password","password123")),"role":b.get("role","student"),
         "institution":b.get("institution",""),"roll_number":"",
         "joined":_now()[:10],"docs":0,"status":"active"}
    db["users"].append(u); db_save(db)
    return jsonify({"user": _safe(u)}), 201

@app.patch("/api/admin/users/<uid>")
@auth(roles=["admin","school_admin"])
def admin_update_user(uid):
    db   = db_load()
    caller = request.user
    u    = next((x for x in db["users"] if x["id"] == uid), None)
    if not u:
        return jsonify({"error": "Not found"}), 404
    # school_admin cannot edit other school_admins or admins
    if caller["role"] == "school_admin" and u["role"] in ("admin","school_admin") and u["id"] != caller["id"]:
        return jsonify({"error": "Forbidden"}), 403
    b = request.json or {}
    for k in ("name","role","status","institution"):
        if k in b:
            u[k] = b[k]
    if "password" in b and b["password"]:
        if len(b["password"]) < 8:
            return jsonify({"error": "Password must be at least 8 characters"}), 400
        u["pw_hash"] = _hash(b["password"])
    db_save(db)
    return jsonify({"user": _safe(u)})

@app.delete("/api/admin/users/<uid>")
@auth(roles=["admin"])
def admin_delete_user(uid):
    db = db_load()
    db["users"] = [u for u in db["users"] if u["id"] != uid]
    db_save(db)
    return jsonify({"ok": True})

@app.get("/api/admin/stats")
@auth(roles=["admin","school_admin"])
def admin_stats():
    db = db_load()
    u  = request.user

    # Same rule as admin_list_users — show every user with no filtering
    if u["role"] == "admin":
        users = [x for x in db["users"] if x["id"] != u["id"]]
    else:
        users = [
            x for x in db["users"]
            if x["id"] != u["id"]
            and x["role"] != "admin"
        ]

    # Activity log: filter to only show actions by users this role should see
    visible_uid_set = {x["id"] for x in users} | {u["id"]}
    activity = [a for a in db.get("activity", []) if a.get("user_id") in visible_uid_set]

    storage_gb = sum(
        (Path(d["path"]).stat().st_size
         if d.get("path") and Path(d.get("path","")).exists() else 0)
        for d in db.get("documents", [])
        if u["role"] == "admin" or d.get("owner_id") in visible_uid_set
    ) / (1024 ** 3)

    # Exam/eval counts: scoped to visible users
    exam_count = len([e for e in exams_registry.values()
                      if u["role"] == "admin" or e.get("owner_id") in visible_uid_set])
    eval_count = len([e for e in evaluations_registry.values()
                      if u["role"] == "admin" or e.get("owner_id") in visible_uid_set])

    return jsonify({
        "teacher_count":  len([x for x in users if x["role"] in ("teacher","tutor")]),
        "student_count":  len([x for x in users if x["role"] == "student"]),
        "parent_count":   len([x for x in users if x["role"] == "parent"]),
        "exam_count":     exam_count,
        "eval_count":     eval_count,
        "syllabus_count": len(syllabi_registry),
        "storage_gb":     round(storage_gb, 3),
        "avg_score":      round(
            sum(v.get("result",{}).get("percentage",0) for v in evaluations_registry.values()) /
            max(len(evaluations_registry), 1), 1
        ),
        "activity":       activity[:20],
        "mongodb_status": "connected" if MONGO_OK else "fallback_json",
    })

@app.route("/api/admin/settings", methods=["GET","PATCH"])
@auth(roles=["admin","school_admin"])
def admin_settings():
    db = db_load()
    if "settings" not in db:
        db["settings"] = {}
    if request.method == "PATCH":
        incoming = request.json or {}
        # school_admin cannot change system-level model settings
        u = request.user
        if u["role"] == "school_admin":
            forbidden_keys = {"model"}
            incoming = {k: v for k, v in incoming.items() if k not in forbidden_keys}
        db["settings"].update(incoming)
        db_save(db)
    return jsonify({"settings": db["settings"]})

# ══════════════════════════════════════════════════════════════════════════════
#  SPA SERVING (React dist/)
# ══════════════════════════════════════════════════════════════════════════════
@app.route("/manifest.json")
def serve_manifest():
    try:
        return send_from_directory(app.static_folder, "manifest.json")
    except Exception:
        return jsonify({}), 200

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def spa(path):
    if app.static_folder:
        fp = Path(app.static_folder) / path
        if path and fp.exists():
            return send_from_directory(app.static_folder, path)
        idx = Path(app.static_folder) / "index.html"
        if idx.exists():
            return send_from_directory(app.static_folder, "index.html")
    return jsonify({"status": "VidyAI API running", "docs": "/api/"}), 200

# ══════════════════════════════════════════════════════════════════════════════
#  STARTUP
# ══════════════════════════════════════════════════════════════════════════════
_boot_load()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    lc   = "✓" if LANGCHAIN_OK   else "✗ (install langchain-openai)"
    oai  = f"✓ ({OPENAI_MODEL})" if OPENAI_API_KEY else "✗ (set OPENAI_API_KEY)"
    mdb  = "✓ MongoDB"           if MONGO_OK       else "⚠ JSON fallback"
    print(f"""
╔══════════════════════════════════════════╗
║  Parvidya Backend  →  http://localhost:{port}  ║
╠══════════════════════════════════════════╣
║  LangChain : {lc:<28}║
║  OpenAI    : {oai:<28}║
║  Database  : {mdb:<28}║
║  Vercel    : {'Yes' if IS_VERCEL else 'No':<28}║
╚══════════════════════════════════════════╝
Syllabi loaded : {len(syllabi_registry)}
Exams loaded   : {len(exams_registry)}
""")
    from flask import cli
    cli.show_server_banner = lambda *_: None
    app.run(host="0.0.0.0", port=port, debug=not IS_VERCEL)
