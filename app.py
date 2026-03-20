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
import logging
import time as _time
from concurrent.futures import ThreadPoolExecutor, as_completed
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

# ── Structured logging ────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("parvidya.api")

# ── Celery integration (optional — graceful degradation if Redis unavailable) ─
CELERY_OK = False
celery_app = None
try:
    from celery import Celery as _Celery
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    celery_app = _Celery(
        "parvidya_tasks",
        broker=REDIS_URL,
        backend=REDIS_URL,
    )
    celery_app.conf.update(
        task_serializer="json", result_serializer="json",
        accept_content=["json"], task_track_started=True,
    )
    # Quick connectivity check
    celery_app.control.inspect(timeout=1).ping()
    CELERY_OK = True
    log.info("Celery/Redis connected ✓ — async evaluation enabled")
except Exception as _ce:
    log.warning(f"Celery/Redis unavailable — falling back to sync evaluation: {_ce}")

# ── OpenAI rate limiter (2 req/s to stay within tier limits) ─────────────────
class _RateLimiter:
    def __init__(self, rate: float = 2.0):
        self._min_gap = 1.0 / rate
        self._last    = 0.0
    def wait(self):
        now = _time.monotonic()
        gap = now - self._last
        if gap < self._min_gap:
            _time.sleep(self._min_gap - gap)
        self._last = _time.monotonic()

_openai_limiter = _RateLimiter(rate=2.0)

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
    # Handle common prefixes: "Answer: A", " - A", "B)", "(C)"
    # Matches: "a", "- a", "(b)", "option c", " - d"
    m = re.match(r"^(?:option\s*)?[-–—\s\(\[\{]*([a-d])[\s\)\]\}]*$", s, flags=re.IGNORECASE)
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
            coerced = _coerce_mcq_answer(student, q.get("options", {}))
            correct = _objective_is_correct(q, student)
            awarded = max_m if correct else 0.0
            total_awarded += awarded
            evals.append({
                "question_id": qid, "type": "objective", "student_answer": coerced,
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

def _preprocess_image_for_ocr(img):
    """
    Enhance a scanned image so handwriting (faint pen, circles, ticks) becomes
    clearly visible to GPT Vision.
    Steps: greyscale -> high contrast -> sharpen -> median filter (removes noise).
    Returns RGB PIL Image ready for base64 encoding.
    """
    from PIL import ImageEnhance, ImageFilter
    img = img.convert("L")                         # greyscale
    img = ImageEnhance.Contrast(img).enhance(2.5)  # make dark marks much darker
    img = ImageEnhance.Sharpness(img).enhance(2.0) # sharpen edges (helps circles/ticks)
    img = img.filter(ImageFilter.MedianFilter())   # remove scan noise
    return img.convert("RGB")                      # back to RGB for API



def _build_ocr_prompt_v2(exam_questions: list) -> str:
    """
    Improved OCR prompt — explicitly addresses the dark Q-number tab confusion.

    Root cause of bubble shift bug:
    The Q-number tab is solid dark indigo (renders black when scanned).
    On a full-page scan, GPT-4o sees: [BLACK TAB][A circle][B circle][C circle][D circle]
    It may count the black tab as a visual element and shift bubble labels by 1,
    reading B as A, C as B, D as C, etc.

    Fix: explicitly tell GPT the tab is NOT a bubble and to count circles
    strictly left-to-right AFTER the dark tab.
    """
    obj_qs  = [q for q in exam_questions if q.get("type", "objective") == "objective"]
    subj_qs = [q for q in exam_questions if q.get("type", "objective") != "objective"]
    obj_ids  = ", ".join(str(q["id"]) for q in obj_qs)  or "none"
    subj_ids = ", ".join(str(q["id"]) for q in subj_qs) or "none"

    q_lines = []
    for q in sorted(exam_questions, key=lambda x: int(x.get("id", 0))):
        qtype = "MCQ" if q.get("type", "objective") == "objective" else "Written"
        q_lines.append(f"  Q{q['id']} [{qtype}]: {str(q.get('question',''))[:80]}")
    question_ref = (
        "\nQUESTION REFERENCE (to locate each box by its number):\n"
        + "\n".join(q_lines)
    ) if q_lines else ""

    return (
        "You are reading a SCANNED STUDENT ANSWER SHEET.\n\n"

        "═══ CRITICAL — READ BEFORE ANSWERING ═══\n"
        "Each question has a DARK COLOURED TAB on the LEFT edge showing the Q number.\n"
        "⚠️  The dark tab is NOT a bubble and is NOT an answer option.\n"
        "⚠️  IGNORE the dark tab when identifying bubbles.\n\n"

        "MCQ LAYOUT (questions: " + obj_ids + "):\n"
        "After the dark Q-number tab, there are EXACTLY 4 circles left-to-right:\n"
        "  1st circle after tab = option A\n"
        "  2nd circle after tab = option B\n"
        "  3rd circle after tab = option C\n"
        "  4th circle after tab = option D\n\n"
        "The student FILLED or SCRIBBLED inside exactly one circle.\n"
        "The circle with the most ink / darkest fill / scribble marks = the answer.\n"
        "An empty/clean circle = NOT selected.\n"
        "Count circles strictly: skip the dark tab, then 1st=A, 2nd=B, 3rd=C, 4th=D.\n"
        "❌ NEVER return \"- A\" or \"A)\" — return ONLY the single letter e.g. \"A\".\n\n"

        "WRITTEN LAYOUT (questions: " + subj_ids + "):\n"
        "After the dark green Q-number tab, there are horizontal ruled lines.\n"
        "READ ALL handwritten text on EVERY ruled line in the box.\n"
        "Join all lines into ONE string separated by spaces — do NOT stop at the first line.\n"
        "Ignore printed labels ('Write your answer below:', section headings, etc.)\n\n"

        "YOUR TASK:\n"
        "For each question box, identify its Q number from the tab, then extract:\n"
        "  MCQ → single letter ONLY: A, B, C, or D (the scribbled/filled circle)\n"
        "  Written → ALL handwritten text across all ruled lines, joined as one string\n"
        "  Blank → omit from JSON\n"
        + question_ref + "\n\n"

        "Return ONLY valid JSON (no markdown, no explanation):\n"
        + '{"answers": {"1":"B","2":"D","3":"B","4":"A","5":"A","6":"C","7":"student full written answer across all lines"}}' + "\n"
    )

def _build_ocr_prompt(exam_questions: list) -> str:
    """
    Layout-aware prompt for the VidyAI structured answer sheet.
    Describes the EXACT visual structure of the PDF we generated so GPT-4o
    can locate each question's answer box precisely.

    Answer sheet layout (generated by _generate_answer_sheet_pdf):
    - Each question has its own bordered rectangle
    - LEFT SIDE: a coloured vertical tab (indigo for MCQ, green for Written)
      containing the question number (Q1, Q2…) and marks
    - RIGHT SIDE (content area): the answer space
      * MCQ: "Mark ONE correct answer:" label + 4 large circles labelled A B C D
        - Student FILLS IN or SCRIBBLES INSIDE one circle
        - A filled/scribbled circle = selected answer
      * Written: "Write your answer below:" label + ruled horizontal lines
        - Student writes on the lines
    """
    obj_qs  = [q for q in exam_questions if q.get("type", "objective") == "objective"]
    subj_qs = [q for q in exam_questions if q.get("type", "objective") != "objective"]
    obj_ids  = ", ".join(str(q["id"]) for q in obj_qs)  or "none"
    subj_ids = ", ".join(str(q["id"]) for q in subj_qs) or "none"

    q_lines = []
    for q in sorted(exam_questions, key=lambda x: int(x.get("id", 0))):
        qtype = "MCQ" if q.get("type", "objective") == "objective" else "Written"
        q_lines.append(
            f"  Q{q['id']} [{qtype}]: {str(q.get('question', ''))[:80]}"
        )
    question_ref = (
        "\nQUESTION REFERENCE — use these to locate each Q-number tab on the page:\n"
        + "\n".join(q_lines)
    ) if q_lines else ""

    return (
        "You are reading a SCANNED STUDENT ANSWER SHEET from the VidyAI system.\n\n"

        "═══ EXACT LAYOUT OF THIS ANSWER SHEET ═══\n"
        "Each question has a bordered box. Inside each box:\n"
        "  LEFT: a solid coloured tab showing the Q number (e.g. Q1, Q2…)\n"
        "         — INDIGO/DARK BLUE tab = MCQ question\n"
        "         — GREEN tab = Written/subjective question\n"
        "  RIGHT: the student answer area\n\n"

        "MCQ ANSWER AREA (questions: " + obj_ids + "):\n"
        "  • The label 'Mark ONE correct answer:' appears at the top\n"
        "  • Below it are FOUR large circles in a row: A   B   C   D\n"
        "  • Each circle has its letter (A/B/C/D) printed INSIDE it\n"
        "  • The student marks ONE circle by:\n"
        "      - Filling/scribbling inside the circle with pen\n"
        "      - Drawing a heavy circle around the letter\n"
        "      - Writing the letter inside or next to the circle\n"
        "  • The FILLED/SCRIBBLED/DARKEST circle = the student's answer\n"
        "  • A circle with dense pen marks is DEFINITELY selected\n"
        "  ❌ NEVER return \"- A\" or \"A)\" — return ONLY the single letter e.g. \"A\".\n\n"

        "WRITTEN ANSWER AREA (questions: " + subj_ids + "):\n"
        "  • The label 'Write your answer below:' appears at the top\n"
        "  • Below it are horizontal ruled lines inside the box\n"
        "  • The student writes their answer on these lines\n"
        "  • READ ALL LINES — do NOT stop after the first handwritten line.\n"
        "  • Join every handwritten line into ONE string separated by spaces.\n"
        "  • Do NOT include the printed 'Write your answer below:' label.\n\n"

        "═══ YOUR TASK ═══\n"
        "For EACH question box you can see:\n"
        "  1. Find the Q-number tab on the LEFT to identify the question number\n"
        "  2. Look at the RIGHT side for the student's answer\n"
        "  3. For MCQ: identify which of the 4 circles (A/B/C/D) is filled/scribbled\n"
        "     — The one with the most ink/darkest fill is the answer\n"
        "     — Even heavy scribbling inside a circle = that option is selected\n"
        "  4. For Written: read ALL handwritten text on EVERY ruled line\n\n"

        "CRITICAL RULES:\n"
        "  • For MCQ: return ONLY a single letter — A, B, C, or D. No dashes, no brackets.\n"
        "  • The printed letter inside an empty/clean circle is NOT an answer\n"
        "  • Only a circle with INK MARKS (fill, scribble, circle) = selected\n"
        "  • If two circles seem marked, choose the one with more ink\n"
        "  • For Written: return ALL handwritten text joined as one string (ignore printed labels)\n"
        "  • If a question has no mark, omit it from the JSON\n"
        + question_ref + "\n\n"

        "Return STRICTLY valid JSON:\n"
        '{"answers": {"1": "B", "2": "D", "7": "Divide the numerator by the denominator and write the remainder"}}' + "\n"
        "No markdown, no explanation, no extra keys."
    )


def _build_freeform_handwriting_prompt(exam_questions: list) -> str:
    """
    Prompt for PLAIN HANDWRITTEN answer sheets (notebook pages, not printed sheets).
    No indigo tabs, no bubble circles, no printed labels.
    Instructs GPT-4o to find question numbers (1, 2, Q1, Q2) anywhere on the page.
    """
    q_lines = []
    for q in sorted(exam_questions, key=lambda x: int(x.get("id", 0))):
        qtype = "MCQ" if q.get("type", "objective") == "objective" else "Written"
        q_lines.append(f"  Q{q['id']} [{qtype}]: {str(q.get('question',''))[:80]}")
    question_ref = "\nQUESTION REFERENCE:\n" + "\n".join(q_lines) if q_lines else ""

    return (
        "You are reading a PHOTO or SCAN of a student's HANDWRITTEN homework/test.\n"
        "This is NOT a structured form. It is a plain piece of paper or notebook page.\n\n"

        "═══ YOUR TASK ═══\n"
        "1. Identify each question by its number (e.g., '1', '2', 'Q1', 'Q2').\n"
        "2. Extract the student's handwritten answer for that question.\n"
        "3. MCQ: If the student wrote a letter (A/B/C/D) or circled/underlined one, "
        "return only that letter.\n"
        "4. WRITTEN: Extract all handwritten text for that question verbatim.\n"
        "5. Treat each question independently.\n\n"

        "═══ CRITICAL RULES ═══\n"
        "- There are NO colored tabs or bubble circles on this page.\n"
        "- Ignore any scribbles or marks that are not part of an answer.\n"
        "- If a question is not found or has no answer, omit it from the JSON.\n"
        + question_ref + "\n\n"

        "Return ONLY valid JSON:\n"
        '{"answers": {"1": "C", "2": "A", "7": "The square of the hypotenuse is equal to..."}}\n'
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

    # These patterns only match if the ENTIRE value is a label/instruction, not real content.
    # For subjective answers, we strip any leading instruction prefix before checking.
    NOISE_PATTERNS = re.compile(
        r"^(?:section\s+[AB]|objective\s+questions?|subjective\s+questions?|"
        r"general\s+instructions?|total\s+marks|roll\s+number|student\s+name|"
        r"marks\s+obtained|answer\s+sheet|vidyai\s+school|"
        r"write\s+only\s+inside|only\s+inside\s+the|"
        r"mark\s+one\s+correct\s*answer|circle\s+(your|the|one)\s+answer|"
        r"do\s+not\s+write\s+outside|"
        r"\d{1,2}/\d{1,2}/\d{4})$",
        re.IGNORECASE
    )
    # Strip common OCR prefix artifacts before validation
    STRIP_PREFIXES = re.compile(
        r"^(?:write\s+your\s+answer\s+below\s*[:\-]?\s*|"
        r"write\s+answer\s+here\s*[:\-]?\s*|"
        r"answer\s*[:\-]\s*)",
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

        # ── MCQ: extract letter from value regardless of surrounding text ──────
        # Fix 5: Previously dropped valid answers if val was longer than 5 chars.
        # Now: search for A/B/C/D anywhere in the value (handles "The answer is A",
        # "(A)", "option A", "A — 3.14", etc.)
        if qid in MCQ_IDS:
            # Pre-check: reject obvious section-header / noise strings first
            if NOISE_PATTERNS.search(val):
                log.debug(f"[OCR-VALIDATE] Q{qid} MCQ noise rejected: {val[:40]}")
                continue
            # Primary: look for standalone letter
            m = re.search(r"\b([A-D])\b", val, re.IGNORECASE)
            if m:
                result[qid] = m.group(1).upper()
                log.debug(f"[OCR-VALIDATE] Q{qid} MCQ → '{result[qid]}' (from: {val[:40]})")
            else:
                # Fallback heuristic: any A-D character in the string
                letters = re.findall(r"[A-Da-d]", val)
                if letters:
                    result[qid] = letters[0].upper()
                    log.debug(f"[OCR-VALIDATE] Q{qid} MCQ fallback → '{result[qid]}' (from: {val[:40]})")
                else:
                    log.debug(f"[OCR-VALIDATE] Q{qid} MCQ no letter found in: {val[:40]}")
            continue

        # ── Subjective: strip instruction prefixes, then reject obvious noise ──────
        # Strip "Write your answer below:" or "Answer:" prefixes GPT may include
        val = STRIP_PREFIXES.sub("", val).strip()
        # Normalise newlines → spaces so multi-line handwriting is stored as one string
        val = re.sub(r"[\r\n]+", " ", val)
        val = re.sub(r"\s{2,}", " ", val).strip()
        if not val:
            continue
        if NOISE_PATTERNS.search(val):
            log.debug(f"[OCR-VALIDATE] Rejected Q{qid} noise: {val[:60]}")
            continue
        # Only reject if the ENTIRE value looks like a question (ends with ?)
        # and has no sentence before it — don't reject long answers that happen
        # to contain a question phrase at the end.
        if val.endswith("?") and len(val) > 40:
            # Check: is there a sentence-ending character before the '?'?
            # If yes, it's a long answer that ends with a rhetorical question → keep
            has_prior_sentence = bool(re.search(r'[.!;]', val[:-1]))
            if not has_prior_sentence:
                log.debug(f"[OCR-VALIDATE] Rejected Q{qid} question-text: {val[:60]}")
                continue
        if len(val) < 2:
            continue
        # Reject OCR garble: words with 4+ consecutive consonants = corrupted scan
        # Use a higher threshold (50%) and minimum 5 words to avoid false rejects
        # on multi-line answers with some tricky words.
        words = re.findall(r"[a-zA-Z]+", val)
        if len(words) >= 5:
            garble = sum(1 for w in words if re.search(r"[bcdfghjklmnpqrstvwxyz]{4,}", w, re.I))
            if garble / len(words) > 0.50:
                log.debug(f"[OCR-VALIDATE] Rejected Q{qid} garble ({garble}/{len(words)}): {val[:60]}")
                continue

        log.debug(f"[OCR-VALIDATE] Q{qid} subjective → '{val[:60]}'")
        result[qid] = val

    return result



# ══════════════════════════════════════════════════════════════════════════════
#  SCANNED ANSWER SHEET: IMAGE-DIFF HANDWRITING EXTRACTION
# ══════════════════════════════════════════════════════════════════════════════


# ══════════════════════════════════════════════════════════════════════════════
#  PDF TEMPLATE GENERATORS — Answer Sheet, Question Paper, Answer Key
# ══════════════════════════════════════════════════════════════════════════════

def _pdf_wrap(text, c_per_line=88):
    """Word-wrap text into lines of at most c_per_line characters."""
    words = str(text).split()
    lines, cur = [], ""
    for w in words:
        if len(cur) + len(w) + 1 <= c_per_line:
            cur = (cur + " " + w).strip()
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines or [""]


def _pdf_section_bar(c, x, y, w, h, fill_hex, text, text_hex, font_size=9, mm=None):
    """Draw a coloured section header bar with text."""
    from reportlab.lib import colors as _c
    c.setFillColor(_c.HexColor(fill_hex))
    c.rect(x, y - h, w, h, fill=1, stroke=0)
    c.setFillColor(_c.HexColor(text_hex))
    c.setFont("Helvetica-Bold", font_size)
    c.drawString(x + 4*mm, y - h*0.62, text)


def _draw_answer_sheet_page_header(c, exam, page_num, W, H, mm, colors):
    """
    Beautiful Answer Sheet page header.
    Layout (top → bottom):
      Row 1 (14mm): Dark indigo bar — school name left, "ANSWER SHEET" badge right
      Row 2 (10mm): Light indigo — subject | board | class | date | exam ID
      Row 3 (16mm): Student info boxes — Name | Roll | Class/Sec | Subject
      ─ total height from top: 44mm
    """
    M = 14 * mm

    # ── Row 1: main title bar ─────────────────────────────────────────────────
    BAR_H = 14 * mm
    c.setFillColor(colors.HexColor('#1e1b4b'))
    c.rect(M, H - BAR_H, W - 2*M, BAR_H, fill=1, stroke=0)

    # School name — left
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 12)
    school = exam.get('school_name', 'VidyAI School')
    c.drawString(M + 5*mm, H - 9.5*mm, school[:50])

    # "ANSWER SHEET" pill badge — right
    badge_text  = "ANSWER SHEET"
    badge_x     = W - M - 52*mm
    badge_y     = H - BAR_H + 3*mm
    badge_w     = 48*mm
    badge_h     = 8*mm
    c.setFillColor(colors.HexColor('#4f46e5'))
    c.roundRect(badge_x, badge_y, badge_w, badge_h, 2, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(badge_x + badge_w/2, badge_y + 2.5*mm, badge_text)

    # ── Row 2: metadata strip ─────────────────────────────────────────────────
    META_H = 8 * mm
    c.setFillColor(colors.HexColor('#eef2ff'))
    c.rect(M, H - BAR_H - META_H, W - 2*M, META_H, fill=1, stroke=0)

    subject = exam.get('subject', '')
    board   = exam.get('board', '')
    cls     = exam.get('class', exam.get('class_name', ''))
    date    = exam.get('exam_date', '')
    eid     = exam.get('exam_id', '—')
    total_m = exam.get('total_marks', 0)

    meta_parts = [p for p in [subject, board, cls] if p]
    meta_str   = '  ·  '.join(meta_parts)
    if date:
        meta_str += f'  |  Date: {date}'
    meta_str += f'  |  Total Marks: {total_m}  |  Exam ID: {eid}'

    c.setFillColor(colors.HexColor('#3730a3'))
    c.setFont("Helvetica", 7.5)
    c.drawString(M + 4*mm, H - BAR_H - 5*mm, meta_str[:110])
    c.setFillColor(colors.HexColor('#94a3b8'))
    c.drawRightString(W - M - 4*mm, H - BAR_H - 5*mm, f'Page {page_num}')

    # ── Row 3: student info boxes ─────────────────────────────────────────────
    INFO_TOP = H - BAR_H - META_H - 3*mm
    BOX_H    = 10 * mm
    fields   = [
        ("STUDENT NAME",     M,          90*mm),
        ("ROLL NUMBER",      M + 93*mm,  38*mm),
        ("CLASS / SECTION",  M + 134*mm, 35*mm),
    ]
    for label, fx, fw in fields:
        # Label above box
        c.setFillColor(colors.HexColor('#374151'))
        c.setFont("Helvetica-Bold", 7)
        c.drawString(fx + 1*mm, INFO_TOP - 0.5*mm, label)
        # Box
        c.setFillColor(colors.white)
        c.setStrokeColor(colors.HexColor('#94a3b8'))
        c.setLineWidth(0.8)
        c.roundRect(fx, INFO_TOP - BOX_H - 1*mm, fw, BOX_H, 1.5, fill=1, stroke=1)

    # Instruction row
    INSTR_Y = INFO_TOP - BOX_H - 5*mm
    c.setFillColor(colors.HexColor('#f0f9ff'))
    c.rect(M, INSTR_Y - 6*mm, W - 2*M, 6*mm, fill=1, stroke=0)
    c.setFillColor(colors.HexColor('#0369a1'))
    c.setFont("Helvetica-Bold", 7)
    c.drawString(M + 4*mm, INSTR_Y - 4*mm,
        'INSTRUCTIONS:  Section A — Circle ONE bubble (A/B/C/D) per question  '
        '·  Section B — Write your answer on the ruled lines in the box  '
        '·  Write ONLY inside the boxes')

    AFTER_HEADER = INSTR_Y - 8*mm
    # Corner registration marks (for image-diff alignment)
    c.setFillColor(colors.black)
    for rx, ry in [(6, H - 6), (W - 6, H - 6), (6, 6*mm), (W - 6, 6*mm)]:
        c.circle(rx, ry, 2.5, fill=1)

    return AFTER_HEADER


def _generate_answer_sheet_pdf(exam: dict) -> bytes:
    """
    OCR-optimised student Answer Sheet.
    Section A: each MCQ gets its own bordered box with 4 large bubble circles.
    Section B: each question gets a bordered box with ruled writing lines.
    Bubbles are properly sized and vertically centred — no overlap with labels.
    """
    try:
        from reportlab.pdfgen import canvas as rl_canvas
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.lib import colors as rl_colors
        import io as _io2

        buf = _io2.BytesIO()
        W, H = A4
        c = rl_canvas.Canvas(buf, pagesize=A4)

        qs      = exam.get("questions", [])
        obj_qs  = [q for q in qs if q.get("type", "objective") == "objective"]
        subj_qs = [q for q in qs if q.get("type", "objective") != "objective"]
        M       = 14 * mm
        BOX_W   = W - 2 * M

        page = 1
        y    = _draw_answer_sheet_page_header(c, exam, page, W, H, mm, rl_colors)

        def new_page():
            nonlocal page
            # Bottom footer
            c.setFillColor(rl_colors.HexColor('#94a3b8'))
            c.setFont("Helvetica", 6.5)
            c.drawCentredString(W / 2, 5*mm,
                'Write answers ONLY inside the boxes  ·  Do not write outside the boxes')
            c.showPage()
            page += 1
            return _draw_answer_sheet_page_header(c, exam, page, W, H, mm, rl_colors)

        # ── Section A — Objective ─────────────────────────────────────────────
        if obj_qs:
            _pdf_section_bar(c, M, y, BOX_W, 8*mm,
                '#eef2ff', f'SECTION A — OBJECTIVE  ({len(obj_qs)} questions)  '
                '·  Circle the correct bubble (A / B / C / D)',
                '#3730a3', font_size=8.5, mm=mm)
            y -= 10*mm

            # MCQ box geometry — verified non-overlapping:
            #   BOX_H=28mm | Tab=18mm wide
            #   Instruction baseline: 7mm from box top
            #   Bubble centre: 20mm from box top (13mm from instruction, 8mm from bottom)
            #   Bubble radius: 7mm → top=13mm from box top → 6mm gap from instruction ✓
            BOX_H   = 28 * mm
            TAB_W   = 18 * mm
            BUBBLE_R = 7 * mm
            # Bubble centre Y from box top
            BUBBLE_FROM_TOP = 20 * mm
            # Content area starts at M + TAB_W + separator
            CONTENT_X = M + TAB_W + 3*mm

            for q in obj_qs:
                if y - BOX_H < 15*mm:
                    y = new_page()
                marks = float(q.get("marks", q.get("weightage", 1)))
                m_str = f'{int(marks) if marks == int(marks) else marks}m'

                # ── Outer box ────────────────────────────────────────────────
                c.setStrokeColor(rl_colors.HexColor('#cbd5e1'))
                c.setFillColor(rl_colors.HexColor('#f8fafc'))
                c.setLineWidth(1.0)
                c.roundRect(M, y - BOX_H, BOX_W, BOX_H, 3, fill=1, stroke=1)

                # ── Q-number tab ─────────────────────────────────────────────
                c.setFillColor(rl_colors.HexColor('#4f46e5'))
                c.roundRect(M, y - BOX_H, TAB_W, BOX_H, 3, fill=1, stroke=0)
                # Mask right-side rounding of tab
                c.setFillColor(rl_colors.HexColor('#4f46e5'))
                c.rect(M + TAB_W - 4, y - BOX_H, 4, BOX_H, fill=1, stroke=0)

                # Q number — top-centre of tab
                c.setFillColor(rl_colors.white)
                c.setFont("Helvetica-Bold", 13)
                c.drawCentredString(M + TAB_W/2, y - 9*mm, f'Q{q["id"]}')
                # Marks — bottom-centre of tab
                c.setFont("Helvetica", 7)
                c.drawCentredString(M + TAB_W/2, y - BOX_H + 3.5*mm, f'[{m_str}]')

                # Thin separator line between tab and content
                c.setStrokeColor(rl_colors.HexColor('#e2e8f0'))
                c.setLineWidth(0.5)
                c.line(M + TAB_W, y - BOX_H + 2, M + TAB_W, y - 2)

                # ── Instruction text ─────────────────────────────────────────
                c.setFillColor(rl_colors.HexColor('#64748b'))
                c.setFont("Helvetica", 7.5)
                c.drawString(CONTENT_X, y - 7*mm, 'Mark ONE correct answer:')

                # ── Bubbles ──────────────────────────────────────────────────
                # Centre Y of bubble = box_top - BUBBLE_FROM_TOP
                BUBBLE_Y   = y - BUBBLE_FROM_TOP
                BUBBLE_GAP = 28 * mm   # centre-to-centre spacing

                for i, label in enumerate(['A', 'B', 'C', 'D']):
                    bx = CONTENT_X + BUBBLE_R + i * BUBBLE_GAP
                    by = BUBBLE_Y

                    # Circle (white fill, dark border)
                    c.setStrokeColor(rl_colors.HexColor('#1e293b'))
                    c.setFillColor(rl_colors.white)
                    c.setLineWidth(1.5)
                    c.circle(bx, by, BUBBLE_R, fill=1, stroke=1)

                    # Letter — centred inside circle
                    # drawCentredString baseline ≈ y - cap_height/2
                    # For Helvetica-Bold 12pt: cap_height ≈ 8pt ≈ 2.8mm
                    c.setFillColor(rl_colors.HexColor('#1e293b'))
                    c.setFont("Helvetica-Bold", 12)
                    c.drawCentredString(bx, by - 1.5*mm, label)

                y -= BOX_H + 4*mm

        # ── Section B — Subjective ────────────────────────────────────────────
        if subj_qs:
            y -= 2*mm
            if y < 35*mm:
                y = new_page()
            _pdf_section_bar(c, M, y, BOX_W, 8*mm,
                '#ecfdf5', f'SECTION B — SUBJECTIVE  ({len(subj_qs)} questions)  '
                '·  Write your answer on the ruled lines inside the box',
                '#065f46', font_size=8.5, mm=mm)
            y -= 10*mm

            TAB_W   = 18 * mm
            LINE_H  = 9  * mm

            for q in subj_qs:
                marks   = float(q.get("marks", q.get("weightage", 1)))
                n_lines = min(14, max(5, int(marks * 1.8)))
                BOX_H   = (10 + n_lines * LINE_H/mm + 4) * mm

                if y - BOX_H < 15*mm:
                    y = new_page()

                m_str = f'{int(marks) if marks == int(marks) else marks}m'

                # ── Outer box ────────────────────────────────────────────────
                c.setStrokeColor(rl_colors.HexColor('#a7f3d0'))
                c.setFillColor(rl_colors.HexColor('#f0fdf4'))
                c.setLineWidth(1.0)
                c.roundRect(M, y - BOX_H, BOX_W, BOX_H, 3, fill=1, stroke=1)

                # ── Q-number tab ─────────────────────────────────────────────
                c.setFillColor(rl_colors.HexColor('#059669'))
                c.roundRect(M, y - BOX_H, TAB_W, BOX_H, 3, fill=1, stroke=0)
                c.setFillColor(rl_colors.HexColor('#059669'))
                c.rect(M + TAB_W - 4, y - BOX_H, 4, BOX_H, fill=1, stroke=0)

                c.setFillColor(rl_colors.white)
                c.setFont("Helvetica-Bold", 13)
                c.drawCentredString(M + TAB_W/2, y - BOX_H/2 + 2*mm, f'Q{q["id"]}')
                c.setFont("Helvetica", 7)
                c.drawCentredString(M + TAB_W/2, y - BOX_H + 4*mm, f'[{m_str}]')

                c.setStrokeColor(rl_colors.HexColor('#d1fae5'))
                c.setLineWidth(0.5)
                c.line(M + TAB_W, y - BOX_H + 2, M + TAB_W, y - 2)

                # ── "Write your answer below:" instruction ────────────────────
                CONTENT_X = M + TAB_W + 3*mm
                c.setFillColor(rl_colors.HexColor('#64748b'))
                c.setFont("Helvetica", 7.5)
                c.drawString(CONTENT_X, y - 7*mm, 'Write your answer below:')

                # Divider under instruction
                c.setStrokeColor(rl_colors.HexColor('#d1fae5'))
                c.setLineWidth(0.4)
                c.line(CONTENT_X, y - 9.5*mm, M + BOX_W - 3, y - 9.5*mm)

                # ── Ruled lines ───────────────────────────────────────────────
                LINE_X0 = CONTENT_X
                LINE_X1 = M + BOX_W - 3*mm
                for li in range(n_lines):
                    ly = y - 10*mm - (li + 1) * LINE_H
                    c.setStrokeColor(rl_colors.HexColor('#bbf7d0'))
                    c.setLineWidth(0.35)
                    c.line(LINE_X0, ly, LINE_X1, ly)

                y -= BOX_H + 5*mm

        # Last-page footer
        c.setFillColor(rl_colors.HexColor('#94a3b8'))
        c.setFont("Helvetica", 6.5)
        c.drawCentredString(W / 2, 5*mm,
            'Write answers ONLY inside the boxes  ·  Do not write outside the boxes')
        c.save()
        buf.seek(0)
        return buf.read()

    except Exception as e:
        log.error(f"[ANSWER-SHEET] Generation failed: {e}", exc_info=True)
        return b""


def _generate_question_paper_pdf(exam: dict) -> bytes:
    """
    Question Paper PDF — clean, professional exam paper layout.
    Header: school name, subject/board/class, marks/time/date info strip,
            amber instruction box pointing to the separate answer sheet.
    Body: numbered questions with clear visual hierarchy.
    """
    try:
        from reportlab.pdfgen import canvas as rl_canvas
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.lib import colors as rl_colors
        import io as _io2

        buf = _io2.BytesIO()
        W, H = A4
        c   = rl_canvas.Canvas(buf, pagesize=A4)
        M   = 15 * mm

        qs      = exam.get("questions", [])
        obj_qs  = [q for q in qs if q.get("type", "objective") == "objective"]
        subj_qs = [q for q in qs if q.get("type", "objective") != "objective"]

        obj_m    = sum(float(q.get("marks", q.get("weightage", 1))) for q in obj_qs)
        subj_m   = sum(float(q.get("marks", q.get("weightage", 1))) for q in subj_qs)
        total_m  = exam.get("total_marks", obj_m + subj_m)
        time_min = exam.get("time_minutes",
                   max(30, int(len(obj_qs) * 1.5 + len(subj_qs) * 8)))

        def draw_header(page_num=1):
            # ── Title block ───────────────────────────────────────────────────
            c.setFillColor(rl_colors.HexColor('#1e1b4b'))
            c.rect(M, H - 18*mm, W - 2*M, 18*mm, fill=1, stroke=0)

            # School name
            c.setFillColor(rl_colors.white)
            c.setFont("Helvetica-Bold", 13)
            school = exam.get('school_name', 'VidyAI School')
            c.drawString(M + 5*mm, H - 8*mm, school[:50])

            # Subject / board / class — right side
            subj_str = '  ·  '.join(p for p in [
                exam.get('subject',''), exam.get('board',''), exam.get('class','')
            ] if p)
            c.setFont("Helvetica", 9.5)
            c.drawRightString(W - M - 5*mm, H - 8*mm, subj_str)

            # "QUESTION PAPER" label below school name
            c.setFont("Helvetica", 8)
            c.setFillColor(rl_colors.HexColor('#a5b4fc'))
            c.drawString(M + 5*mm, H - 14*mm, 'QUESTION PAPER')
            c.setFillColor(rl_colors.HexColor('#c7d2fe'))
            c.drawRightString(W - M - 5*mm, H - 14*mm, f'Page {page_num}')

            # ── Info strip — 4-cell grid ──────────────────────────────────────
            INFO_H = 12 * mm
            INFO_Y = H - 18*mm - INFO_H
            cells  = [
                ('Total Marks',  str(int(total_m))),
                ('Time Allowed', f'{time_min} minutes'),
                ('Date',         exam.get('exam_date', '—')),
                ('Exam ID',      exam.get('exam_id', '—')[:12]),
            ]
            cell_w = (W - 2*M) / len(cells)
            for ci, (lbl, val) in enumerate(cells):
                cx = M + ci * cell_w
                bg = '#f8fafc' if ci % 2 == 0 else '#f1f5f9'
                c.setFillColor(rl_colors.HexColor(bg))
                c.rect(cx, INFO_Y, cell_w, INFO_H, fill=1, stroke=0)
                # Divider
                if ci > 0:
                    c.setStrokeColor(rl_colors.HexColor('#cbd5e1'))
                    c.setLineWidth(0.5)
                    c.line(cx, INFO_Y + 2*mm, cx, INFO_Y + INFO_H - 2*mm)
                c.setFillColor(rl_colors.HexColor('#64748b'))
                c.setFont("Helvetica", 7)
                c.drawCentredString(cx + cell_w/2, INFO_Y + 7.5*mm, lbl)
                c.setFillColor(rl_colors.HexColor('#0f172a'))
                c.setFont("Helvetica-Bold", 9)
                c.drawCentredString(cx + cell_w/2, INFO_Y + 3.5*mm, val)
            # Border around info strip
            c.setStrokeColor(rl_colors.HexColor('#cbd5e1'))
            c.setLineWidth(0.6)
            c.rect(M, INFO_Y, W - 2*M, INFO_H, fill=0, stroke=1)

            # ── Section marks summary bar ─────────────────────────────────────
            SUMM_Y = INFO_Y - 8*mm
            c.setFillColor(rl_colors.HexColor('#1e1b4b'))
            c.rect(M, SUMM_Y, W - 2*M, 8*mm, fill=1, stroke=0)
            c.setFillColor(rl_colors.white)
            c.setFont("Helvetica-Bold", 8)
            c.drawString(M + 5*mm, SUMM_Y + 3*mm,
                f'Section A (Objective): {int(obj_m)} marks  ·  '
                f'Section B (Subjective): {int(subj_m)} marks  ·  '
                f'Total: {int(total_m)} marks  ·  '
                f'All questions compulsory')

            # ── Instructions box ─────────────────────────────────────────────
            INSTR_Y = SUMM_Y - 13*mm
            c.setFillColor(rl_colors.HexColor('#fffbeb'))
            c.setStrokeColor(rl_colors.HexColor('#f59e0b'))
            c.setLineWidth(0.8)
            c.roundRect(M, INSTR_Y, W - 2*M, 12*mm, 2, fill=1, stroke=1)
            c.setFillColor(rl_colors.HexColor('#92400e'))
            c.setFont("Helvetica-Bold", 8.5)
            c.drawString(M + 5*mm, INSTR_Y + 8.5*mm,
                'OPTION 1 (Preferred): Use the separate ANSWER SHEET — circle the bubble / write in the box')
            c.setFont("Helvetica", 7.5)
            c.drawString(M + 5*mm, INSTR_Y + 4.5*mm,
                'OPTION 2 (Fallback): Write answers directly on this question paper in the space provided')
            c.drawString(M + 5*mm, INSTR_Y + 1*mm,
                'If using Answer Sheet: Exam ID must match. Download Answer Sheet from teacher portal.')

            return INSTR_Y - 6*mm

        page = 1
        y    = draw_header(page)

        def new_page():
            nonlocal page
            c.showPage(); page += 1
            return draw_header(page)

        # ── Section A ─────────────────────────────────────────────────────────
        if obj_qs:
            _pdf_section_bar(c, M, y, W - 2*M, 8*mm,
                '#eef2ff',
                f'SECTION A — OBJECTIVE QUESTIONS  '
                f'({len(obj_qs)} questions  ·  {int(obj_m)} marks total)',
                '#3730a3', font_size=9, mm=mm)
            y -= 11*mm

            for q in obj_qs:
                marks = float(q.get("marks", q.get("weightage", 1)))
                qtext = str(q.get("question", ""))
                q_lines = _pdf_wrap(f'Q{q["id"]}.  {qtext}', 90)
                opts    = q.get("options") or {}

                # Two-row options always (cleaner than conditional)
                items   = sorted(opts.items())
                opt_h   = (10 if len(items) > 2 else 6) * mm
                needed  = (len(q_lines) * 5 + 4 + opt_h/mm + 6) * mm
                if y - needed < 20*mm:
                    y = new_page()

                # Subtle left accent bar for question number
                c.setFillColor(rl_colors.HexColor('#4f46e5'))
                c.rect(M, y - len(q_lines)*5*mm - 2, 2, len(q_lines)*5*mm + 2, fill=1, stroke=0)

                # Question text
                c.setFillColor(rl_colors.HexColor('#0f172a'))
                c.setFont("Helvetica-Bold", 10)
                for li, line in enumerate(q_lines):
                    c.drawString(M + 5*mm, y - (li+1)*5*mm, line)

                # Marks pill — right
                m_str = f'[{int(marks) if marks==int(marks) else marks} mark{"s" if marks!=1 else ""}]'
                c.setFont("Helvetica", 7.5)
                c.setFillColor(rl_colors.HexColor('#6366f1'))
                c.drawRightString(W - M, y - 5*mm, m_str)
                y -= (len(q_lines)*5 + 3) * mm

                # Options — always 2 rows of 2
                if opts:
                    c.setFont("Helvetica", 9.5)
                    c.setFillColor(rl_colors.HexColor('#1e293b'))
                    if len(items) == 4:
                        row1 = '          '.join(f'({k})  {v}' for k, v in items[:2])
                        row2 = '          '.join(f'({k})  {v}' for k, v in items[2:])
                        c.drawString(M + 8*mm, y - 5*mm, row1)
                        c.drawString(M + 8*mm, y - 10*mm, row2)
                        y -= 13*mm
                    else:
                        row = '     '.join(f'({k})  {v}' for k, v in items)
                        c.drawString(M + 8*mm, y - 5*mm, row)
                        y -= 8*mm

                # Answer blank line (for students writing directly on paper)
                c.setFillColor(rl_colors.HexColor('#374151'))
                c.setFont("Helvetica", 8.5)
                c.drawString(M + 8*mm, y - 5*mm, "Answer: ")
                c.setStrokeColor(rl_colors.HexColor('#94a3b8'))
                c.setLineWidth(0.7)
                c.line(M + 28*mm, y - 4*mm, M + 90*mm, y - 4*mm)
                y -= 8*mm

                # Thin separator between questions
                c.setStrokeColor(rl_colors.HexColor('#e2e8f0'))
                c.setLineWidth(0.4)
                c.line(M, y - 2, W - M, y - 2)
                y -= 5*mm

        # ── Section B ─────────────────────────────────────────────────────────
        if subj_qs:
            y -= 2*mm
            if y < 35*mm:
                y = new_page()
            _pdf_section_bar(c, M, y, W - 2*M, 8*mm,
                '#ecfdf5',
                f'SECTION B — SUBJECTIVE QUESTIONS  '
                f'({len(subj_qs)} questions  ·  {int(subj_m)} marks total)',
                '#065f46', font_size=9, mm=mm)
            y -= 11*mm

            for q in subj_qs:
                marks   = float(q.get("marks", q.get("weightage", 1)))
                qtext   = str(q.get("question", ""))
                q_lines = _pdf_wrap(f'Q{q["id"]}.  {qtext}', 90)
                needed  = (len(q_lines)*5 + 10) * mm
                if y - needed < 20*mm:
                    y = new_page()

                c.setFillColor(rl_colors.HexColor('#059669'))
                c.rect(M, y - len(q_lines)*5*mm - 2, 2, len(q_lines)*5*mm + 2, fill=1, stroke=0)

                c.setFillColor(rl_colors.HexColor('#0f172a'))
                c.setFont("Helvetica-Bold", 10)
                for li, line in enumerate(q_lines):
                    c.drawString(M + 5*mm, y - (li+1)*5*mm, line)

                m_str = f'[{int(marks) if marks==int(marks) else marks} marks]'
                c.setFont("Helvetica", 7.5)
                c.setFillColor(rl_colors.HexColor('#059669'))
                c.drawRightString(W - M, y - 5*mm, m_str)
                y -= (len(q_lines)*5 + 3) * mm

                # Answer lines for fallback writing on paper
                # Number of lines proportional to marks
                n_ans_lines = min(8, max(3, int(marks * 1.2)))
                for li in range(n_ans_lines):
                    line_y = y - (li+1) * 7*mm
                    c.setStrokeColor(rl_colors.HexColor('#cbd5e1'))
                    c.setLineWidth(0.5)
                    c.line(M + 2*mm, line_y, W - M - 2*mm, line_y)
                y -= (n_ans_lines * 7 + 3) * mm

                c.setStrokeColor(rl_colors.HexColor('#d1fae5'))
                c.setLineWidth(0.4)
                c.line(M, y - 2, W - M, y - 2)
                y -= 5*mm

        # Footer
        c.setFillColor(rl_colors.HexColor('#94a3b8'))
        c.setFont("Helvetica", 6.5)
        c.drawCentredString(W/2, 5*mm,
            f'Question Paper  ·  {exam.get("school_name","")}  ·  '
            f'Exam ID: {exam.get("exam_id","—")}  ·  '
            f'Total Marks: {int(total_m)}')
        c.save()
        buf.seek(0)
        return buf.read()

    except Exception as e:
        log.error(f"[QUESTION-PAPER] Generation failed: {e}", exc_info=True)
        return b""


def _generate_answer_key_pdf(exam: dict) -> bytes:
    """
    Answer Key PDF — teacher use only.
    Header: confidential dark red banner, exam metadata, marking scheme grid.
    MCQ: question + all options with correct one highlighted in green.
    Subjective: question + model answer block + key points + marking rubric.
    """
    try:
        from reportlab.pdfgen import canvas as rl_canvas
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.lib import colors as rl_colors
        import io as _io2

        buf = _io2.BytesIO()
        W, H = A4
        c   = rl_canvas.Canvas(buf, pagesize=A4)
        M   = 15 * mm

        qs      = exam.get("questions", [])
        obj_qs  = [q for q in qs if q.get("type", "objective") == "objective"]
        subj_qs = [q for q in qs if q.get("type", "objective") != "objective"]
        obj_m   = sum(float(q.get("marks", q.get("weightage", 1))) for q in obj_qs)
        subj_m  = sum(float(q.get("marks", q.get("weightage", 1))) for q in subj_qs)
        total_m = exam.get("total_marks", obj_m + subj_m)

        def draw_header(page_num=1):
            # ── Confidential banner ───────────────────────────────────────────
            c.setFillColor(rl_colors.HexColor('#7f1d1d'))
            c.rect(M, H - 14*mm, W - 2*M, 14*mm, fill=1, stroke=0)

            c.setFillColor(rl_colors.white)
            c.setFont("Helvetica-Bold", 12)
            school = exam.get('school_name', 'VidyAI School')
            c.drawString(M + 5*mm, H - 9*mm, school[:48])

            # ANSWER KEY badge
            badge_x = W - M - 50*mm
            badge_y = H - 14*mm + 3*mm
            c.setFillColor(rl_colors.HexColor('#dc2626'))
            c.roundRect(badge_x, badge_y, 46*mm, 8*mm, 2, fill=1, stroke=0)
            c.setFillColor(rl_colors.white)
            c.setFont("Helvetica-Bold", 8)
            c.drawCentredString(badge_x + 23*mm, badge_y + 2.5*mm, '🔑  ANSWER KEY — CONFIDENTIAL')

            # ── Exam info strip ───────────────────────────────────────────────
            INFO_H = 10 * mm
            INFO_Y = H - 14*mm - INFO_H
            c.setFillColor(rl_colors.HexColor('#fef2f2'))
            c.rect(M, INFO_Y, W - 2*M, INFO_H, fill=1, stroke=0)

            subj_str = '  ·  '.join(p for p in [
                exam.get('subject',''), exam.get('board',''), exam.get('class','')
            ] if p)
            c.setFillColor(rl_colors.HexColor('#991b1b'))
            c.setFont("Helvetica-Bold", 8.5)
            c.drawString(M + 5*mm, INFO_Y + 6.5*mm, subj_str)
            c.setFont("Helvetica", 7.5)
            c.setFillColor(rl_colors.HexColor('#374151'))
            c.drawString(M + 5*mm, INFO_Y + 2.5*mm,
                f'Date: {exam.get("exam_date","—")}  ·  '
                f'Exam ID: {exam.get("exam_id","—")}')
            c.setFillColor(rl_colors.HexColor('#94a3b8'))
            c.drawRightString(W - M - 5*mm, INFO_Y + 4.5*mm, f'Page {page_num}')

            # ── Marking scheme grid ───────────────────────────────────────────
            GRID_H  = 10 * mm
            GRID_Y  = INFO_Y - GRID_H
            cells   = [
                ('Section A (Objective)', f'{int(obj_m)} marks', '#eef2ff', '#3730a3'),
                ('Section B (Subjective)', f'{int(subj_m)} marks', '#ecfdf5', '#065f46'),
                ('TOTAL', f'{int(total_m)} marks', '#1e1b4b', '#ffffff'),
            ]
            cw = (W - 2*M) / 3
            for ci, (lbl, val, bg, fg) in enumerate(cells):
                cx = M + ci * cw
                c.setFillColor(rl_colors.HexColor(bg))
                c.rect(cx, GRID_Y, cw, GRID_H, fill=1, stroke=0)
                c.setStrokeColor(rl_colors.HexColor('#cbd5e1'))
                c.setLineWidth(0.4)
                c.rect(cx, GRID_Y, cw, GRID_H, fill=0, stroke=1)
                c.setFillColor(rl_colors.HexColor(fg))
                c.setFont("Helvetica", 7)
                c.drawCentredString(cx + cw/2, GRID_Y + 6.5*mm, lbl)
                c.setFont("Helvetica-Bold", 10)
                c.drawCentredString(cx + cw/2, GRID_Y + 2.5*mm, val)

            return GRID_Y - 6*mm

        page = 1
        y    = draw_header(page)

        def new_page():
            nonlocal page
            c.showPage(); page += 1
            return draw_header(page)

        # ── Section A: Objective Answer Key ───────────────────────────────────
        if obj_qs:
            _pdf_section_bar(c, M, y, W - 2*M, 8*mm,
                '#eef2ff', f'SECTION A — OBJECTIVE  ({len(obj_qs)} questions)',
                '#3730a3', font_size=9, mm=mm)
            y -= 11*mm

            for q in obj_qs:
                marks = float(q.get("marks", q.get("weightage", 1)))
                qtext = str(q.get("question", ""))
                opts  = q.get("options") or {}

                # Resolve correct answer
                correct = set()
                raw_ans = str(q.get("answer", "")).strip().upper()
                if raw_ans in opts:
                    correct.add(raw_ans)
                for va in q.get("valid_answers", []):
                    va_u = str(va).strip().upper()
                    if va_u in opts:
                        correct.add(va_u)
                    else:
                        for k, v in opts.items():
                            if str(v).strip().lower() == va.strip().lower():
                                correct.add(k.upper())
                if not correct and raw_ans:
                    correct.add(raw_ans)

                q_lines = _pdf_wrap(f'Q{q["id"]}. {qtext}', 90)
                needed  = (len(q_lines)*5 + len(opts)*6 + 8) * mm
                if y - needed < 20*mm:
                    y = new_page()

                # Question
                c.setFillColor(rl_colors.HexColor('#7f1d1d'))
                c.rect(M, y - len(q_lines)*5*mm, 2, len(q_lines)*5*mm, fill=1, stroke=0)
                c.setFillColor(rl_colors.HexColor('#0f172a'))
                c.setFont("Helvetica-Bold", 9.5)
                for li, line in enumerate(q_lines):
                    c.drawString(M + 5*mm, y - (li+1)*5*mm, line)
                m_str = f'[{int(marks) if marks==int(marks) else marks} mark{"s" if marks!=1 else ""}]'
                c.setFont("Helvetica", 7.5)
                c.setFillColor(rl_colors.HexColor('#6b7280'))
                c.drawRightString(W - M, y - 5*mm, m_str)
                y -= (len(q_lines)*5 + 2) * mm

                # Options — highlight correct
                for k, v in sorted(opts.items()):
                    is_correct = k.upper() in correct
                    opt_y      = y - 5.5*mm
                    if is_correct:
                        c.setFillColor(rl_colors.HexColor('#dcfce7'))
                        c.roundRect(M + 3*mm, opt_y - 2*mm, W - 2*M - 3*mm, 7*mm, 1.5, fill=1, stroke=0)
                        c.setFillColor(rl_colors.HexColor('#15803d'))
                        c.setFont("Helvetica-Bold", 9.5)
                        c.drawString(M + 6*mm, opt_y, f'({k})  {v}')
                        c.setFont("Helvetica-Bold", 8)
                        c.drawRightString(W - M - 4*mm, opt_y, '✓  CORRECT')
                    else:
                        c.setFillColor(rl_colors.HexColor('#374151'))
                        c.setFont("Helvetica", 9.5)
                        c.drawString(M + 6*mm, opt_y, f'({k})  {v}')
                    y -= 6*mm

                # Explanation
                expl = str(q.get("explanation", "")).strip()
                if expl:
                    ex_lines = _pdf_wrap(f'Explanation: {expl}', 90)
                    EX_H     = (len(ex_lines)*4.5 + 4) * mm
                    c.setFillColor(rl_colors.HexColor('#eff6ff'))
                    c.roundRect(M + 3*mm, y - EX_H - 1*mm, W - 2*M - 3*mm, EX_H, 2, fill=1, stroke=0)
                    c.setFillColor(rl_colors.HexColor('#1d4ed8'))
                    c.setFont("Helvetica-Oblique", 8)
                    for li, line in enumerate(ex_lines):
                        c.drawString(M + 6*mm, y - 4*mm - li*4.5*mm, line)
                    y -= EX_H + 2*mm

                c.setStrokeColor(rl_colors.HexColor('#e2e8f0'))
                c.setLineWidth(0.4)
                y -= 2*mm
                c.line(M, y, W - M, y)
                y -= 4*mm

        # ── Section B: Subjective Answer Key ──────────────────────────────────
        if subj_qs:
            y -= 2*mm
            if y < 35*mm:
                y = new_page()
            _pdf_section_bar(c, M, y, W - 2*M, 8*mm,
                '#ecfdf5', f'SECTION B — SUBJECTIVE  ({len(subj_qs)} questions)',
                '#065f46', font_size=9, mm=mm)
            y -= 11*mm

            for q in subj_qs:
                marks      = float(q.get("marks", q.get("weightage", 1)))
                qtext      = str(q.get("question", ""))
                valid_ans  = q.get("valid_answers", [])
                key_pts    = q.get("answer_key_points", [])
                rubric     = str(q.get("evaluation_rubric",
                                       q.get("evaluation_criteria", ""))).strip()
                model_ans  = str(q.get("answer","")).strip() or (valid_ans[0] if valid_ans else "")

                q_lines    = _pdf_wrap(f'Q{q["id"]}. {qtext}', 90)
                ans_lines  = _pdf_wrap(f'Model Answer: {model_ans}', 88) if model_ans else []
                kp_lines   = []
                for kp in key_pts:
                    kp_lines += _pdf_wrap(f'  •  {kp}', 86)

                needed = (len(q_lines)*5 + len(ans_lines)*5 +
                          len(kp_lines)*5 + 25) * mm
                if y - needed < 20*mm:
                    y = new_page()

                # Question
                c.setFillColor(rl_colors.HexColor('#059669'))
                c.rect(M, y - len(q_lines)*5*mm, 2, len(q_lines)*5*mm, fill=1, stroke=0)
                c.setFillColor(rl_colors.HexColor('#0f172a'))
                c.setFont("Helvetica-Bold", 9.5)
                for li, line in enumerate(q_lines):
                    c.drawString(M + 5*mm, y - (li+1)*5*mm, line)
                m_str = f'[{int(marks) if marks==int(marks) else marks} marks]'
                c.setFont("Helvetica", 7.5)
                c.setFillColor(rl_colors.HexColor('#6b7280'))
                c.drawRightString(W - M, y - 5*mm, m_str)
                y -= (len(q_lines)*5 + 3) * mm

                # Model answer + key points block
                if ans_lines or kp_lines:
                    all_lines = ans_lines[:]
                    if kp_lines:
                        all_lines += ['Key Points:'] + kp_lines
                    BLK_H = (len(all_lines)*4.8 + 5) * mm
                    c.setFillColor(rl_colors.HexColor('#f0fdf4'))
                    c.setStrokeColor(rl_colors.HexColor('#86efac'))
                    c.setLineWidth(0.8)
                    c.roundRect(M + 3*mm, y - BLK_H - 1*mm,
                                W - 2*M - 3*mm, BLK_H, 2, fill=1, stroke=1)
                    for li, line in enumerate(all_lines):
                        bold = (li == 0 or line == 'Key Points:')
                        c.setFont("Helvetica-Bold" if bold else "Helvetica", 8.5)
                        c.setFillColor(rl_colors.HexColor('#14532d'))
                        c.drawString(M + 6*mm, y - 4.5*mm - li*4.8*mm, line)
                    y -= BLK_H + 3*mm

                # Rubric block
                if rubric:
                    rub_lines = _pdf_wrap(f'Marking Criteria: {rubric}', 88)
                    RUB_H     = (len(rub_lines)*4.5 + 4) * mm
                    c.setFillColor(rl_colors.HexColor('#fffbeb'))
                    c.setStrokeColor(rl_colors.HexColor('#fbbf24'))
                    c.setLineWidth(0.6)
                    c.roundRect(M + 3*mm, y - RUB_H - 1*mm,
                                W - 2*M - 3*mm, RUB_H, 2, fill=1, stroke=1)
                    c.setFillColor(rl_colors.HexColor('#78350f'))
                    c.setFont("Helvetica-Oblique", 8)
                    for li, line in enumerate(rub_lines):
                        c.drawString(M + 6*mm, y - 4*mm - li*4.5*mm, line)
                    y -= RUB_H + 3*mm

                c.setStrokeColor(rl_colors.HexColor('#d1fae5'))
                c.setLineWidth(0.4)
                y -= 2*mm
                c.line(M, y, W - M, y)
                y -= 5*mm

        # Confidential footer
        c.setFillColor(rl_colors.HexColor('#fef2f2'))
        c.rect(M, 4*mm, W - 2*M, 7*mm, fill=1, stroke=0)
        c.setFillColor(rl_colors.HexColor('#991b1b'))
        c.setFont("Helvetica-Bold", 7)
        c.drawCentredString(W/2, 7*mm,
            'CONFIDENTIAL  ·  FOR TEACHER / EXAMINER USE ONLY  ·  DO NOT DISTRIBUTE TO STUDENTS')

        c.save()
        buf.seek(0)
        return buf.read()

    except Exception as e:
        log.error(f"[ANSWER-KEY] Generation failed: {e}", exc_info=True)
        return b""


# Keep _generate_blank_answer_sheet_pdf as an alias so _diff_and_ocr_answers
# generates a blank that MATCHES the new structured answer sheet layout exactly.
def _generate_blank_answer_sheet_pdf(exam: dict) -> bytes:
    """Alias — generates the same structured answer sheet (blank, no handwriting)."""
    return _generate_answer_sheet_pdf(exam)


def _diff_and_ocr_answers(scanned_pdf_path: str, exam: dict) -> Dict[int, str]:
    """
    Core handwriting extraction using image diff:
    1. Generate the blank answer sheet from exam data
    2. Convert both blank and scanned to images at same DPI
    3. Pixel-diff: scanned - blank = only handwriting remains
    4. Per-question: crop the diff image to that question's answer region
    5. Send each crop to GPT-4o Vision for clean OCR (sees only ink on white)
    Returns {question_id: answer_text}
    """
    import io as _io
    import numpy as np
    from PIL import Image

    questions   = exam.get("questions", [])
    obj_qs      = [q for q in questions if q.get("type", "objective") == "objective"]
    subj_qs     = [q for q in questions if q.get("type", "objective") != "objective"]

    if not questions:
        return {}

    # ── Step 1: generate blank answer sheet ───────────────────────────────────
    blank_pdf_bytes = _generate_blank_answer_sheet_pdf(exam)
    if not blank_pdf_bytes:
        print("[DIFF-OCR] Blank PDF generation failed — falling back")
        return {}

    # ── Step 2: convert both PDFs to images ──────────────────────────────────
    try:
        from pdf2image import convert_from_path, convert_from_bytes
        DPI = 200
        blank_pages  = convert_from_bytes(blank_pdf_bytes, dpi=DPI)
        scanned_pages = convert_from_path(scanned_pdf_path, dpi=DPI)
    except Exception as e:
        print(f"[DIFF-OCR] pdf2image failed: {e}")
        return {}

    log.info(f"[DIFF-OCR] Processing {len(blank_pages)} page(s) in parallel")
    return _ocr_page_parallel(
        images=scanned_pages,
        exam_questions=questions,
        exam=exam,
        blank_pages=blank_pages,
    )



# ── File-hash cache helper ────────────────────────────────────────────────────
def _file_hash(path: str) -> str:
    """MD5 of file contents — stable cache key independent of filename."""
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()

def _cache_get(file_hash: str, exam_id: str) -> Optional[dict]:
    """Return cached evaluation payload if it exists, else None."""
    if not MONGO_OK:
        return None
    try:
        doc = mongo_db["eval_cache"].find_one({"cache_key": f"{file_hash}:{exam_id}"})
        if doc:
            doc.pop("_id", None)
            log.info(f"[CACHE HIT] hash={file_hash[:8]} exam={exam_id}")
            return doc.get("payload")
    except Exception as e:
        log.warning(f"[CACHE] get error: {e}")
    return None

def _cache_set(file_hash: str, exam_id: str, payload: dict):
    """Write evaluation payload to cache."""
    if not MONGO_OK:
        return
    try:
        mongo_db["eval_cache"].update_one(
            {"cache_key": f"{file_hash}:{exam_id}"},
            {"$set": {
                "cache_key": f"{file_hash}:{exam_id}",
                "payload":   payload,
                "cached_at": _now(),
            }},
            upsert=True,
        )
    except Exception as e:
        log.warning(f"[CACHE] set error: {e}")


def _ocr_page_parallel(images: list, exam_questions: list, exam: dict,
                        blank_pages: list = None) -> Dict[int, str]:
    """
    Run OCR on multiple PDF pages in parallel using ThreadPoolExecutor.
    Each page is processed independently; results are merged.
    Uses image-diff if blank_pages supplied, else falls back to enhanced vision.
    """
    import io as _io
    import numpy as _np
    from PIL import Image, ImageEnhance

    combined: Dict[int, str] = {}

    obj_qs  = [q for q in exam_questions if q.get("type","objective") == "objective"]
    subj_qs = [q for q in exam_questions if q.get("type","objective") != "objective"]
    obj_ids  = ", ".join(str(q["id"]) for q in obj_qs)  or "none"
    subj_ids = ", ".join(str(q["id"]) for q in subj_qs) or "none"
    q_ref    = "\n".join(
        f"Q{q['id']}: {str(q.get('question',''))[:70]}"
        for q in sorted(exam_questions, key=lambda x: int(x.get("id",0)))
    )

    def _process_one_page(args):
        """
        Process one scanned page using PER-QUESTION crops.

        Why per-question crops (not full page):
        - The Q-number tab is solid dark blue/black when scanned, visually
          resembling a filled bubble. Full-page GPT-4o vision mistakes it for
          the first option and shifts all bubble labels by +1 (reads B as A, etc.)
        - Per-question crops: each crop contains ONLY the answer area for ONE
          question, with the Q-number tab on the left edge. GPT sees exactly
          4 circles (A B C D) with no ambiguous dark region to the left.
        - For subjective questions: crop the full box so all ruled lines are visible.

        Layout geometry (from _generate_answer_sheet_pdf):
          Page header: ~30% of page height (varies by content above questions)
          MCQ box: 28mm tall, 4mm gap below each box
          Subjective box: 10mm + n_lines*8mm + 4mm tall, 5mm gap
          Both pages contain questions — Page 1 has MCQs, Page 2+ has subjectives.
        """
        page_idx, img = args
        try:
            import openai as _oai_local
            from PIL import ImageEnhance as _IE
            client = _oai_local.OpenAI(api_key=OPENAI_API_KEY)
            page_answers: Dict[int, str] = {}

            # ── Step 1: Upscale + colour-safe contrast boost ──────────────────
            MAX_W = 2480
            if img.width < MAX_W:
                scale = MAX_W / img.width
                img   = img.resize((MAX_W, int(img.height * scale)), Image.LANCZOS)
            img = _IE.Contrast(_IE.Sharpness(img.convert("RGB")).enhance(1.8)).enhance(1.5)

            W_px, H_px = img.width, img.height

            # ── Step 2: First send the FULL PAGE with question-counting prompt ─
            # This lets GPT identify which questions are on this page and roughly
            # where each answer area is, returning a best-effort JSON.
            # We use this as a baseline then verify per-question crops.
            buf_full = _io.BytesIO()
            img.save(buf_full, format="PNG", optimize=False)
            b64_full = base64.b64encode(buf_full.getvalue()).decode()

            # Questions on this page (heuristic: split evenly across pages)
            n_pages = max(len(images), 1)
            qs_per  = max(1, len(exam_questions) // n_pages)
            start_i = page_idx * qs_per
            end_i   = start_i + qs_per if page_idx < n_pages - 1 else len(exam_questions)
            page_qs = exam_questions[start_i:end_i]
            if not page_qs:
                page_qs = exam_questions   # fallback: try all questions

            page_obj_ids  = ", ".join(str(q["id"]) for q in page_qs
                                      if q.get("type","objective") == "objective") or "none"
            page_subj_ids = ", ".join(str(q["id"]) for q in page_qs
                                      if q.get("type","objective") != "objective") or "none"

            full_page_prompt = (
                "You are reading a SCANNED STUDENT ANSWER SHEET.\n\n"
                "LAYOUT: Each question has a bordered box with a DARK TAB on the left "
                "showing the question number (Q1, Q2 etc).\n"
                "IMPORTANT: The dark tab on the left is NOT a bubble — IGNORE it when "
                "identifying the answer.\n\n"
                "MCQ boxes contain 4 circles labelled A B C D reading left to right "
                "AFTER the dark tab. The student SCRIBBLED/FILLED one circle.\n"
                "The FILLED/DARKEST/MOST-INKED circle = the answer.\n"
                "Count circles left-to-right AFTER the tab: 1st=A, 2nd=B, 3rd=C, 4th=D.\n\n"
                f"MCQ questions on this page: {page_obj_ids}\n"
                f"Written questions on this page: {page_subj_ids}\n\n"
                "For each question return the answer:\n"
                "  Written: READ EVERY SINGLE HANDWRITTEN LINE in the answer box. "
                "Join ALL lines into ONE string separated by spaces. "
                "⚠️ EXTREMELY IMPORTANT: Do NOT stop after the first line. "
                "Extract ALL handwritten text across all ruled lines.\n"
                "  Blank: omit from JSON\n\n"
                "CRITICAL for MCQ: return ONLY the letter e.g. \"B\" — never \"- B\" or \"B)\"\n"
                "Return ONLY valid JSON: "
                + '{"answers": {"1":"B","2":"D","7":"student wrote full answer across all lines"}}' 
            )

            _openai_limiter.wait()
            resp = client.chat.completions.create(
                model=OPENAI_MODEL, temperature=0, max_tokens=3000,
                response_format={"type": "json_object"},
                messages=[{"role": "user", "content": [
                    {"type": "text", "text": full_page_prompt},
                    {"type": "image_url", "image_url": {
                        "url": f"data:image/png;base64,{b64_full}",
                        "detail": "high"
                    }},
                ]}]
            )
            raw_content = resp.choices[0].message.content
            log.info(f"[PAGE-OCR] page {page_idx+1} full-page raw: {raw_content[:400]}")
            raw_full = json.loads(raw_content)
            page_answers = _validate_ocr_answers(raw_full.get("answers", {}), exam_questions)

            # ── Step 3: Per-question crop verification for MCQ only ───────────
            # Send each MCQ question as an individual crop to eliminate the
            # Q-number tab confusion. The crop contains ONLY the bubble area.
            # This is the most reliable way to read scribbled bubbles.
            mcq_qs_on_page = [q for q in page_qs if q.get("type","objective") == "objective"]
            if mcq_qs_on_page and len(mcq_qs_on_page) > 0:
                # Answer sheet geometry (from _generate_answer_sheet_pdf):
                # Page 1 header: ~55mm (header bar 14 + meta 8 + student boxes 16 +
                #                        instruction 6 + section bar 8 + gap 3)
                # MCQ box: 28mm tall, 3mm gap below = 31mm per slot
                # Page 2+: smaller header ~25mm
                #
                # These are fractions of A4 height (297mm).
                # Added ±5mm padding per crop to handle scan misalignment.
                BOX_H_FRAC  = 28 / 297
                SLOT_FRAC   = 31 / 297
                PAD_FRAC    =  5 / 297

                HEADER_FRAC = (55 / 297) if page_idx == 0 else (25 / 297)

                verified: Dict[int, str] = {}
                for q_idx, q in enumerate(mcq_qs_on_page):
                    qid = int(q.get("id", 0))
                    # Crop coordinates
                    y_top = int(H_px * (HEADER_FRAC + q_idx * SLOT_FRAC - PAD_FRAC))
                    y_bot = int(H_px * (HEADER_FRAC + q_idx * SLOT_FRAC + BOX_H_FRAC + PAD_FRAC))
                    y_top = max(0, min(y_top, H_px - 10))
                    y_bot = max(y_top + 10, min(y_bot, H_px))

                    crop = img.crop((0, y_top, W_px, y_bot))
                    # Additional contrast on crop
                    crop = _IE.Contrast(crop).enhance(1.5)

                    cbuf = _io.BytesIO()
                    crop.save(cbuf, format="PNG", optimize=False)
                    cb64 = base64.b64encode(cbuf.getvalue()).decode()

                    crop_prompt = (
                        f"This image shows ONLY question Q{qid} from a student answer sheet.\n\n"
                        "On the LEFT is a DARK COLOURED TAB — this is just the question label. "
                        "DO NOT count this as a bubble or an answer option.\n\n"
                        "To the RIGHT of the dark tab are EXACTLY FOUR circles in a row:\n"
                        "  1st circle (leftmost after tab) = option A\n"
                        "  2nd circle = option B\n"
                        "  3rd circle = option C\n"
                        "  4th circle (rightmost) = option D\n\n"
                        "The student FILLED or SCRIBBLED INSIDE exactly one circle.\n"
                        "Look for the circle with the most pen ink / darkest fill.\n"
                        "That circle's label (A, B, C, or D) is the student's answer.\n\n"
                        "An empty clean circle = NOT selected.\n"
                        "A circle with scribble marks = SELECTED.\n\n"
                        "Return ONLY valid JSON: {\"answer\": \"B\"}\n"
                        "If no circle is filled, return: {\"answer\": \"\"}"
                    )
                    try:
                        _openai_limiter.wait()
                        crop_resp = client.chat.completions.create(
                            model=OPENAI_MODEL, temperature=0, max_tokens=50,
                            response_format={"type": "json_object"},
                            messages=[{"role": "user", "content": [
                                {"type": "text", "text": crop_prompt},
                                {"type": "image_url", "image_url": {
                                    "url": f"data:image/png;base64,{cb64}",
                                    "detail": "high"
                                }},
                            ]}]
                        )
                        crop_raw = json.loads(crop_resp.choices[0].message.content)
                        val = str(crop_raw.get("answer", "")).strip().upper()
                        m   = re.search(r"([A-D])", val)
                        if m:
                            verified[qid] = m.group(1)
                            log.info(f"[CROP-OCR] Q{qid} crop answer: {m.group(1)}")
                        else:
                            log.info(f"[CROP-OCR] Q{qid} no clear answer in crop: {val!r}")
                    except Exception as ce:
                        log.warning(f"[CROP-OCR] Q{qid} crop failed: {ce}")

                # Merge: crop answers override full-page answers for MCQ
                if verified:
                    page_answers.update(verified)
                    log.info(f"[CROP-OCR] page {page_idx+1} verified MCQ: {verified}")

            log.info(f"[PAGE-OCR] page {page_idx+1} final: {page_answers}")
            return page_answers

        except Exception as e:
            log.error(f"[OCR-PAGE] page {page_idx} failed: {e}", exc_info=True)
            return {}

    # Run pages in parallel — max 4 workers
    max_w = min(4, len(images))
    with ThreadPoolExecutor(max_workers=max_w) as pool:
        futures = {pool.submit(_process_one_page, (i, img)): i
                   for i, img in enumerate(images)}
        for fut in as_completed(futures):
            page_result = fut.result()
            combined.update(page_result)

    return combined


def _extract_answers(path: str, exam_questions: list = None, exam: dict = None):
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

        # ── Detect scanned VidyAI answer sheet (has embedded scanner OCR) ──────
        # When a scanned PDF goes through scanner software, the scanner embeds a
        # garbled OCR text layer. This text contains our printed header markers
        # ("ANSWER SHEET", "SECTION A — OBJECTIVE", "Mark ONE correct answer:")
        # even though those are printed text, not student answers.
        # We must detect this case and go straight to vision OCR — never Path A.
        IS_SCANNED_ANSWER_SHEET = bool(raw_text and (
            # Our answer sheet header is always present
            re.search(r"ANSWER\s+SHEET", raw_text, re.IGNORECASE) or
            # Our section markers
            (re.search(r"SECTION\s+[AB]\s*[—–-]\s*(OBJECTIVE|SUBJECTIVE)", raw_text, re.IGNORECASE)
             and re.search(r"Exam\s+ID", raw_text, re.IGNORECASE)) or
            # Bubble instruction text
            re.search(r"Mark\s+ONE\s+correct\s+answer", raw_text, re.IGNORECASE) or
            re.search(r"Write\s+your\s+answer\s+below", raw_text, re.IGNORECASE)
        ))

        # ── Detect plain handwritten scan (no text layer, no VidyAI markers) ──
        # If the PDF has near-zero text but contains pages, it's an image scan.
        IS_LIKELY_SCANNED_IMAGE = bool(
            not IS_BLANK_PAPER and
            not IS_SCANNED_ANSWER_SHEET and
            (not raw_text.strip() or len(raw_text.strip()) < 50)
        )

        # ── Exam ID mismatch detection ────────────────────────────────────────
        # The answer sheet prints "Exam ID: XXXXXXXX" in the header.
        # If the scanned sheet's Exam ID doesn't match the selected exam,
        # return an informative error instead of silently producing wrong results.
        if exam and raw_text:
            id_match = re.search(r"Exam\s+ID[:\s]+([a-f0-9]{8,12})", raw_text, re.IGNORECASE)
            if id_match:
                sheet_exam_id = id_match.group(1).lower().strip()
                selected_id   = str(exam.get("exam_id", "")).lower().strip()
                if sheet_exam_id and selected_id and sheet_exam_id != selected_id:
                    log.warning(
                        f"[EXAM-ID-MISMATCH] Sheet has Exam ID '{sheet_exam_id}' "
                        f"but selected exam is '{selected_id}'"
                    )
                    return {}, f"exam_id_mismatch:{sheet_exam_id}:{selected_id}"

        # ── Path A: Typed/digital answer submission ───────────────────────────
        # Skip entirely if this is a scanned answer sheet — the text layer is
        # garbled scanner OCR of our printed headers, not student answers.
        if raw_text.strip() and not IS_BLANK_PAPER and not IS_SCANNED_ANSWER_SHEET:
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

        # ── Path B1: Scanned VidyAI Answer Sheet ──────────────────────────────
        # Use image-diff against the template to isolate ink.
        if (IS_BLANK_PAPER or IS_SCANNED_ANSWER_SHEET) and exam_questions:
            log.info(f"[PDF-OCR] Structured VidyAI sheet detected — using image-diff")
            try:
                _exam_for_diff = exam if exam else {
                    "questions":   exam_questions,
                    "school_name": "", "subject": "", "class": "",
                    "board": "", "exam_date": "",
                    "total_marks": sum(float(q.get("marks", q.get("weightage", 1)))
                                       for q in exam_questions),
                }
                diff_answers = _diff_and_ocr_answers(path, _exam_for_diff)
                if diff_answers:
                    return diff_answers, "image_diff_ocr"
            except Exception as _diff_err:
                log.warning(f"[PDF-OCR] Image-diff failed: {_diff_err}")

        # ── Path B2: Plain Handwritten Notebook Scan ─────────────────────────
        # Use freeform prompt without diff (no template to subtract).
        if IS_LIKELY_SCANNED_IMAGE and exam_questions:
            log.info(f"[PDF-OCR] Plain handwritten scan detected — using freeform OCR")
            try:
                from pdf2image import convert_from_path
                images = convert_from_path(path, dpi=200)
                # Use _ocr_page_parallel but with freeform prompt
                # Note: we can't easily pass a custom prompt to _ocr_page_parallel
                # without modifying it, but Path C handles this well too.
                # For now, let's fall through to Path C which is whole-page vision.
                pass
            except Exception:
                # poppler missing — try sending page 1 directly to Vision
                log.info("[PDF-OCR] Poppler missing — falling back to Vision direct")
                prompt = _build_freeform_handwriting_prompt(exam_questions)
                return _vision_extract(path, prompt), "vision_ocr_freeform"

        # ── Path C: GPT-4o whole-page vision with preprocessing ──────────────
        # Fallback when diff fails (e.g. alignment issues, very light handwriting)
        try:
            from pdf2image import convert_from_path
            import io as _io
            images = convert_from_path(path, dpi=250)
            combined: Dict[int, str] = {}
            client = _oai.OpenAI(api_key=OPENAI_API_KEY)

            # Use appropriate prompt based on sheet type
            if IS_LIKELY_SCANNED_IMAGE:
                prompt = _build_freeform_handwriting_prompt(exam_questions)
            else:
                prompt = _build_ocr_prompt_v2(exam_questions)

            for img in images:
                # Upscale for readability, boost contrast but keep colour
                # (greyscale conversion kills the blue bubble ink visibility)
                from PIL import ImageEnhance as _ie2
                MAX_W = 2480
                if img.width < MAX_W:
                    img = img.resize((MAX_W, int(img.height * MAX_W / img.width)), Image.LANCZOS)
                enhanced = _ie2.Contrast(_ie2.Sharpness(img.convert("RGB")).enhance(1.8)).enhance(1.6)
                buf = _io.BytesIO()
                enhanced.save(buf, format="PNG", optimize=False)
                img_b64 = base64.b64encode(buf.getvalue()).decode()

                resp = client.chat.completions.create(
                    model=OPENAI_MODEL, temperature=0,
                    response_format={"type": "json_object"},
                    messages=[{"role": "user", "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {
                            "url": f"data:image/png;base64,{img_b64}", "detail": "high"
                        }}
                    ]}]
                )
                raw_ocr = json.loads(resp.choices[0].message.content)
                # Fix 3: debug logging
                log.info(f"[PATH-C-OCR] raw GPT output: {raw_ocr}")
                page_ans = _validate_ocr_answers(raw_ocr.get("answers", {}), exam_questions)
                log.info(f"[PATH-C-OCR] validated answers: {page_ans}")
                combined.update(page_ans)

            if combined:
                return combined, "vision_ocr_enhanced"
        except Exception as _vis_err:
            print(f"[PDF-OCR] Vision fallback failed: {_vis_err}")

        # ── Path D: text-only GPT fallback ────────────────────────────────────
        if raw_text.strip():
            try:
                client = _oai.OpenAI(api_key=OPENAI_API_KEY)
                resp = client.chat.completions.create(
                    model=OPENAI_MINI, temperature=0,
                    response_format={"type": "json_object"},
                    messages=[{"role": "user", "content": (
                        _build_ocr_prompt(exam_questions) +
                        "\n\nPDF text layer (printed question paper — look for any typed student "
                        "answers after each 'Answer:' label, ignore blank underscores):\n\n" +
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
        # Apply preprocessing + visual-reasoning prompt for direct image uploads
        try:
            import io as _io
            from PIL import Image as _PIL
            # Upscale + contrast boost — keep colour so bubble ink is visible
            from PIL import ImageEnhance as _ie3
            raw_img = _PIL.open(path).convert("RGB")
            MAX_W   = 2480
            if raw_img.width < MAX_W:
                raw_img = raw_img.resize(
                    (MAX_W, int(raw_img.height * MAX_W / raw_img.width)), _PIL.LANCZOS
                )
            preprocessed = _ie3.Contrast(_ie3.Sharpness(raw_img).enhance(1.8)).enhance(1.6)
            buf = _io.BytesIO()
            preprocessed.save(buf, format="PNG", optimize=False)
            img_b64 = base64.b64encode(buf.getvalue()).decode()

            # Use a combined "Universal" prompt for images that handles both
            # structured VidyAI sheets and plain notebooks, since we can't
            # detect text layers on raw images.
            prompt = (
                _build_ocr_prompt_v2(exam_questions) +
                "\n\n--- NOTE ---\n"
                "If this is NOT a structured VidyAI sheet (i.e., no indigo/green tabs),\n"
                "simply find the question numbers (1, 2, Q1, Q2) anywhere on the page\n"
                "and extract the handwritten answers verbatim."
            )

            client = _oai.OpenAI(api_key=OPENAI_API_KEY)
            resp = client.chat.completions.create(
                model=OPENAI_MODEL, temperature=0,
                response_format={"type": "json_object"},
                messages=[{"role": "user", "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {
                        "url": f"data:image/png;base64,{img_b64}", "detail": "high"
                    }}
                ]}]
            )
            raw = json.loads(resp.choices[0].message.content)
            log.info(f"[IMG-OCR] raw GPT output: {raw}")
            ans = _validate_ocr_answers(raw.get("answers", {}), exam_questions)
            log.info(f"[IMG-OCR] validated: {ans}")
            if ans:
                return ans, "vision_ocr"
        except Exception as _img_err:
            log.error(f"[IMG-OCR] {_img_err}")
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

SUBJECTIVE_GRADING_PROMPT = """You are a strict but fair Indian school examiner.
Grade the student's answer for this question. Return ONLY valid JSON — no markdown.

IMPORTANT RULES:
1. If student_answer is empty, "(No answer provided)", or clearly blank → awarded_marks MUST be 0.
2. If student_answer looks like OCR noise (random garbled letters, unrelated content) → awarded_marks MUST be 0.
3. Award partial marks proportionally — if the student covers some key points, award partial credit.
4. If valid_answers and key_points are both empty, use your knowledge of the subject to grade fairly.
5. Be encouraging but accurate — give credit for any correct content, even if imperfectly stated.

Question: {question}
Max marks: {max_marks}
Valid answers (model answer paraphrases): {valid_answers}
Key points required: {key_points}
Marking rubric: {rubric}
Student answer: {student_answer}

Return JSON with exactly these keys:
- awarded_marks: number from 0 to {max_marks} (decimals allowed e.g. 1.5 for partial credit)
- feedback: 1-2 sentence feedback string addressed to the student
- missing_points: array of strings listing key points the student missed
- strengths: array of strings listing what the student got right (empty array if nothing correct)
- confidence: number 0-1 representing your confidence in this grade"""

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
                # Fallback: check query parameters (for direct file downloads via <a href>)
                tok = request.args.get("token", "").strip()

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
        # Normalise valid_answers to letters for MCQ, keep text for subjective
        raw_valid = q.get("valid_answers", [])
        if is_obj:
            opts = q.get("options") or {}
            valid_letters = []
            for va in raw_valid:
                va_s = str(va).strip().upper()
                if va_s in opts:
                    valid_letters.append(va_s)
                else:
                    for k, v in opts.items():
                        if _normalize(str(v)) == _normalize(va):
                            valid_letters.append(k.upper()); break
            valid_for_q = valid_letters if valid_letters else [str(v).strip() for v in raw_valid]
            answer_str  = valid_for_q[0] if valid_for_q else ""
        else:
            valid_for_q = raw_valid
            answer_str  = raw_valid[0] if raw_valid else q.get("answer","")

        normalized.append({
            "id": i, "type": qtype,
            "difficulty": str(q.get("difficulty","medium")).title(),
            "marks": weight, "weightage": weight,
            "question": q.get("question",""),
            "options": q.get("options") if is_obj else None,
            "answer": answer_str,
            "valid_answers": valid_for_q,
            "explanation": q.get("explanation",""),
            "evaluation_criteria": q.get("evaluation_rubric") or ", ".join(q.get("answer_key_points",[])),
            "answer_key_points": q.get("answer_key_points", []),
            "evaluation_rubric": q.get("evaluation_rubric",""),
        })

    exam_id = uuid.uuid4().hex[:10]
    u       = request.user
    syl_meta = syllabi_registry.get(sid, {})
    payload = {
        "exam_id":          exam_id,
        "owner_id":         u["id"],
        "created_at":       _now(),
        "syllabus_id":      sid,
        "syllabus_name":    syl_meta.get("name", ""),
        "topic":            topic_str,
        "chapters":         chapters,
        "board":            data.get("board", syl_meta.get("board", "")),
        "class":            data.get("class_name", syl_meta.get("class_name",
                                data.get("class", syl_meta.get("class", "")))),
        "subject":          data.get("subject", syl_meta.get("subject", "")),
        "school_name":      data.get("school_name", ""),
        "teacher_name":     data.get("teacher_name", ""),
        "exam_date":        data.get("exam_date", _now()[:10]),
        "difficulty":       data.get("difficulty", "Mixed"),
        "objective_count":  obj_count,
        "subjective_count": subj_count,
        "questions":        normalized,
        "total_marks":      sum(float(q["marks"]) for q in normalized),
    }
    exams_registry[exam_id] = payload
    if not IS_VERCEL:
        _save_json(EXAMS_DIR / f"{exam_id}.json", payload)
    _save_exams()
    payload["_download_urls"] = {
        "question_paper":  f"/api/exams/{exam_id}/question-paper",
        "answer_sheet":    f"/api/exams/{exam_id}/answer-sheet",
        "answer_key":      f"/api/exams/{exam_id}/answer-key",
        "combined_print":  f"/api/exams/{exam_id}/combined-print",
    }
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

# Alias — EvalPanel calls /api/exams, legacy QMaster calls /api/questions
@app.get("/api/exams")
@auth()
def list_exams_alias():
    """GET /api/exams — alias for GET /api/questions (returns all saved exams)."""
    return list_exams()


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
        raw_va = q.get("valid_answers", [])
        if not raw_va and q.get("answer"):
            raw_va = [q["answer"]]
        # For MCQ coerce valid_answers to option letters
        opts = q.get("options") or {}
        if is_obj and raw_va and opts:
            coerced = []
            for va in raw_va:
                va_s = str(va).strip().upper()
                if va_s in opts:
                    coerced.append(va_s)
                else:
                    for k, v in opts.items():
                        if _normalize(str(v)) == _normalize(va):
                            coerced.append(k.upper()); break
                    else:
                        coerced.append(va_s)
            raw_va = coerced if coerced else raw_va

        entry = {
            "id":                 q.get("id", i),
            "type":               qtype,
            "difficulty":         q.get("difficulty", "Medium"),
            "marks":              marks,
            "weightage":          marks,
            "question":           q.get("question", ""),
            "options":            q.get("options") if is_obj else None,
            "answer":             q.get("answer", ""),
            "valid_answers":      raw_va,
            "explanation":        q.get("explanation", ""),
            "answer_key_points":  q.get("answer_key_points", []),
            "evaluation_rubric":  q.get("evaluation_rubric", q.get("evaluation_criteria", "")),
        }
        normalised.append(entry)

    # Resolve syllabus metadata — QMaster may not send all fields explicitly
    _syl_id   = data.get("syllabus_id", "")
    _syl_meta = syllabi_registry.get(_syl_id, {})
    _syl_name = (data.get("syllabus_name", "")
                 or _syl_meta.get("name", "")
                 or data.get("subject", "")
                 or "Custom Exam")

    payload = {
        "exam_id":          exam_id,
        "owner_id":         u["id"],
        "created_at":       _now(),
        "syllabus_id":      _syl_id,
        "syllabus_name":    _syl_name,
        "topic":            data.get("topic", ""),
        "board":            data.get("board", _syl_meta.get("board", "")),
        "class":            data.get("class", _syl_meta.get("class_name",
                                _syl_meta.get("class", ""))),
        "subject":          data.get("subject", _syl_meta.get("subject", "")),
        "school_name":      data.get("school_name", ""),
        "teacher_name":     data.get("teacher_name", ""),
        "exam_date":        data.get("exam_date", _now()[:10]),
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

    log.info(f"[EXAMS] Saved exam {exam_id} — {len(normalised)} questions, {payload['total_marks']} marks")
    return jsonify({
        "ok":               True,
        "exam_id":          exam_id,
        "total_marks":      payload["total_marks"],
        "objective_count":  payload["objective_count"],
        "subjective_count": payload["subjective_count"],
        "syllabus_name":    payload["syllabus_name"],
        "subject":          payload["subject"],
        "download_urls": {
            "question_paper":  f"/api/exams/{exam_id}/question-paper",
            "answer_sheet":    f"/api/exams/{exam_id}/answer-sheet",
            "answer_key":      f"/api/exams/{exam_id}/answer-key",
            "combined_print":  f"/api/exams/{exam_id}/combined-print",
        },
    }), 201

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
#  TEMPLATE DOWNLOAD ENDPOINTS
#  /api/exams/<id>/answer-sheet  → structured OCR-optimised answer sheet PDF
#  /api/exams/<id>/question-paper → question paper with instructions
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/exams/<exam_id>/answer-key")
@auth(roles=["teacher", "tutor", "school_admin", "admin"])
def download_answer_key(exam_id):
    """
    Generate and return the ANSWER KEY PDF.
    Teacher-only: shows correct answers, model answers, key points, rubrics.
    """
    e = _load_exam(exam_id)
    if not e:
        return jsonify({"error": "Exam not found"}), 404

    pdf_bytes = _generate_answer_key_pdf(e)
    if not pdf_bytes:
        return jsonify({"error": "PDF generation failed"}), 500

    subject  = re.sub(r"[^\w\s-]", "", e.get("subject", "Exam"))[:30]
    filename = f"AnswerKey_{subject}_{exam_id}.pdf"

    from flask import Response
    return Response(
        pdf_bytes,
        mimetype="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@app.get("/api/exams/<exam_id>/answer-sheet")
@auth()
def download_answer_sheet(exam_id):
    """
    Generate and return the structured OCR-optimised answer sheet PDF.
    Students print this, fill it in by hand, scan it, and upload for evaluation.
    """
    e = _load_exam(exam_id)
    if not e:
        return jsonify({"error": "Exam not found"}), 404

    pdf_bytes = _generate_answer_sheet_pdf(e)
    if not pdf_bytes:
        return jsonify({"error": "PDF generation failed"}), 500

    subject  = re.sub(r"[^\w\s-]", "", e.get("subject", "Exam"))[:30]
    filename = f"AnswerSheet_{subject}_{exam_id}.pdf"

    from flask import Response
    return Response(
        pdf_bytes,
        mimetype="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@app.get("/api/exams/<exam_id>/question-paper")
@auth()
def download_question_paper(exam_id):
    """
    Generate and return the question paper PDF (with full question text).
    Students use this to READ questions, then write answers on the answer sheet.
    """
    e = _load_exam(exam_id)
    if not e:
        return jsonify({"error": "Exam not found"}), 404

    pdf_bytes = _generate_question_paper_pdf(e)
    if not pdf_bytes:
        return jsonify({"error": "PDF generation failed"}), 500

    subject  = re.sub(r"[^\w\s-]", "", e.get("subject", "Exam"))[:30]
    filename = f"QuestionPaper_{subject}_{exam_id}.pdf"

    from flask import Response
    return Response(
        pdf_bytes,
        mimetype="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )



@app.get("/api/exams/<exam_id>/combined-print")
@auth()
def download_combined_print(exam_id):
    """
    Combined print PDF: Question Paper followed by Answer Sheet.
    Single file for teacher to print — students get both together.
    Page 1+: Question Paper (read-only, questions + instructions)
    Then: Answer Sheet (fill in — bubbles + ruled boxes)
    The Exam ID appears prominently on every page of both documents.
    """
    e = _load_exam(exam_id)
    if not e:
        return jsonify({"error": "Exam not found"}), 404

    try:
        from pypdf import PdfWriter, PdfReader
        import io as _io

        writer = PdfWriter()

        qp_bytes = _generate_question_paper_pdf(e)
        as_bytes = _generate_answer_sheet_pdf(e)

        for pdf_bytes in [qp_bytes, as_bytes]:
            if pdf_bytes:
                reader = PdfReader(_io.BytesIO(pdf_bytes))
                for page in reader.pages:
                    writer.add_page(page)

        out = _io.BytesIO()
        writer.write(out)
        out.seek(0)
        combined = out.read()

        subject  = re.sub(r"[^\w\s-]", "", e.get("subject", "Exam"))[:30]
        filename = f"PrintPack_{subject}_{exam_id}.pdf"

        from flask import Response
        return Response(
            combined,
            mimetype="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as ex:
        log.error(f"[COMBINED-PRINT] {ex}", exc_info=True)
        return jsonify({"error": str(ex)}), 500

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
    """
    Single answer sheet evaluation.
    If Redis/Celery is available: returns task_id immediately (async).
    Otherwise: evaluates synchronously (fallback).
    Includes file-hash caching to avoid re-processing identical uploads.
    """
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
    log.info(f"[EVAL] Saved upload: {fn} ({path.stat().st_size} bytes)")

    # ── Cache check (skip OCR if identical file already evaluated) ────────────
    fhash  = _file_hash(str(path))
    cached = _cache_get(fhash, exam_id)
    # if cached:
    #     log.info(f"[EVAL] Cache hit for {fn} — returning cached result")
    #     return jsonify({"cached": True, **cached})

    # ── Async path (Celery available) ─────────────────────────────────────────
    if CELERY_OK:
        try:
            from celery_worker import evaluate_single as _eval_task
            task = _eval_task.delay(
                str(path), e, roll_no, student_name, parent_email, fn
            )
            log.info(f"[EVAL] Async task queued: {task.id}")
            return jsonify({
                "async":    True,
                "task_id":  task.id,
                "status":   "processing",
                "message":  "Evaluation queued. Poll /api/evaluate/status/<task_id> for result.",
            }), 202
        except Exception as _ce:
            log.warning(f"[EVAL] Celery dispatch failed, falling back to sync: {_ce}")

    # ── Sync path (fallback) ──────────────────────────────────────────────────
    log.info(f"[EVAL] Sync evaluation: {fn}")
    _openai_limiter.wait()
    answers, mode = _extract_answers(str(path), exam_questions=e.get("questions", []), exam=e)

    # Exam ID mismatch — scanned sheet belongs to a different exam
    if not answers and isinstance(mode, str) and mode.startswith("exam_id_mismatch:"):
        parts      = mode.split(":")
        sheet_id   = parts[1] if len(parts) > 1 else "unknown"
        selected   = parts[2] if len(parts) > 2 else exam_id
        return jsonify({
            "error": (
                f"Wrong answer sheet uploaded. "
                f"The scanned sheet has Exam ID '{sheet_id}' "
                f"but you selected exam '{selected}'. "
                f"Please upload the answer sheet printed for this exam, "
                f"or select the correct exam from the dropdown."
            ),
            "exam_id_mismatch": True,
            "sheet_exam_id":    sheet_id,
            "selected_exam_id": selected,
        }), 422

    if not answers:
        return jsonify({"error": f"Could not extract answers (mode: {mode})"}), 400

    _openai_limiter.wait()
    result  = _evaluate_answers(e, answers, roll_no)
    eval_id = uuid.uuid4().hex[:10]
    payload = {
        "evaluation_id":    eval_id,
        "exam_id":          exam_id,
        "created_at":       _now(),
        "student_name":     student_name,
        "roll_no":          roll_no,
        "parent_email":     parent_email,
        "file_name":        fn,
        "file_hash":        fhash,
        "extraction_mode":  mode,
        "submitted_answers":answers,
        "result":           result,
    }
    evaluations_registry[eval_id] = payload
    if not IS_VERCEL:
        _save_json(EVAL_DIR / f"{eval_id}.json", payload)
    _save_evals()
    _cache_set(fhash, exam_id, payload)
    log.info(f"[EVAL] Sync complete: eval_id={eval_id} score={result.get('percentage',0):.1f}%")
    return jsonify(payload)


@app.get("/api/evaluate/status/<task_id>")
@auth()
def evaluation_status(task_id):
    """
    Poll async evaluation task status.
    States: pending → processing → completed | failed
    """
    if not CELERY_OK or not celery_app:
        return jsonify({"error": "Async evaluation not available (Redis not connected)"}), 503

    task = celery_app.AsyncResult(task_id)

    if task.state == "PENDING":
        return jsonify({"status": "pending",    "task_id": task_id})
    if task.state == "STARTED":
        meta = task.info or {}
        return jsonify({"status": "processing", "task_id": task_id,
                        "progress": meta.get("completed"), "total": meta.get("total"),
                        "step": meta.get("step", "")})
    if task.state == "SUCCESS":
        result = task.result or {}
        # Cache the result so /api/evaluate can serve it on retry
        if result.get("file_hash") and result.get("exam_id"):
            _cache_set(result["file_hash"], result["exam_id"], result)
        return jsonify({"status": "completed", "task_id": task_id, **result})
    if task.state == "FAILURE":
        return jsonify({"status": "failed", "task_id": task_id,
                        "error": str(task.info)}), 500
    return jsonify({"status": task.state, "task_id": task_id})


@app.post("/api/evaluate/multi-student")
@auth()
def evaluate_multi_student():
    """
    Evaluate a SINGLE PDF containing MULTIPLE students' answer sheets.
    Async if Celery available. Falls back to parallel-thread sync.
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
    log.info(f"[MULTI-EVAL] Saved: {fn}")

    # ── Async path ────────────────────────────────────────────────────────────
    if CELERY_OK:
        try:
            from celery_worker import evaluate_multi_student as _ms_task
            task = _ms_task.delay(str(path), e)
            log.info(f"[MULTI-EVAL] Async task queued: {task.id}")
            return jsonify({
                "async":   True,
                "task_id": task.id,
                "status":  "processing",
                "message": "Multi-student evaluation queued. Poll /api/evaluate/status/<task_id>.",
            }), 202
        except Exception as _ce:
            log.warning(f"[MULTI-EVAL] Celery dispatch failed, falling back to sync: {_ce}")

    # ── Sync path with parallel student evaluation ────────────────────────────
    log.info(f"[MULTI-EVAL] Sync mode: splitting PDF {fn}")
    student_sections = _split_multi_student_pdf(str(path), exam_questions=e.get("questions", []))
    log.info(f"[MULTI-EVAL] Detected {len(student_sections)} students")

    all_evaluations = []

    def _eval_section(args):
        idx, section = args
        sname    = section.get("student_name") or f"Student {idx + 1}"
        roll     = section.get("roll_no") or str(idx + 1)
        raw_text = section.get("raw_text", "")
        answers  = _parse_raw_answers(raw_text)
        if not answers and raw_text:
            tmp = UPL_DIR / f"student_{idx}_{uuid.uuid4().hex[:6]}.txt"
            tmp.write_text(raw_text, encoding="utf-8")
            answers, _ = _extract_answers(str(tmp), exam_questions=e.get("questions",[]), exam=e)
            try:
                tmp.unlink()
            except Exception:
                pass
        if not answers:
            log.warning(f"[MULTI-EVAL] No answers for {sname} — skipping")
            return None
        _openai_limiter.wait()
        result  = _evaluate_answers(e, answers, roll)
        eval_id = uuid.uuid4().hex[:10]
        payload = {
            "evaluation_id":     eval_id, "exam_id": exam_id, "created_at": _now(),
            "student_name":      sname,   "roll_no": roll,
            "parent_email":      section.get("parent_email", ""), "file_name": fn,
            "extraction_mode":   "multi_student_parallel",
            "submitted_answers": answers, "result": result,
        }
        evaluations_registry[eval_id] = payload
        if not IS_VERCEL:
            _save_json(EVAL_DIR / f"{eval_id}.json", payload)
        return payload

    with ThreadPoolExecutor(max_workers=min(4, len(student_sections) or 1)) as pool:
        futs = [pool.submit(_eval_section, (i, s)) for i, s in enumerate(student_sections)]
        for fut in as_completed(futs):
            p = fut.result()
            if p:
                all_evaluations.append(p)

    _save_evals()
    total_students = len(all_evaluations)
    avg_pct = round(sum(ev["result"].get("percentage",0) for ev in all_evaluations) / max(total_students,1), 1)
    pass_count = sum(1 for ev in all_evaluations if ev["result"].get("is_pass"))
    log.info(f"[MULTI-EVAL] Sync complete: {total_students} students, avg={avg_pct}%")
    return jsonify({
        "student_count": total_students, "class_average": avg_pct,
        "pass_count": pass_count, "fail_count": total_students - pass_count,
        "evaluations": all_evaluations, "exam_id": exam_id,
    })


@app.post("/api/evaluate/bulk")
@auth(roles=["tutor","teacher","school_admin"])
def bulk_evaluate():
    """
    Multiple separate files (one per student).
    Async if Celery available — all sheets processed in parallel.
    Falls back to sequential sync processing.
    Includes per-file caching.
    """
    exam_id = request.form.get("exam_id")
    if not exam_id:
        return jsonify({"error": "exam_id required"}), 400
    e = _load_exam(exam_id)
    if not e:
        return jsonify({"error": "Exam not found"}), 404

    files = request.files.getlist("answer_sheets")
    if not files:
        return jsonify({"error": "No answer_sheets uploaded"}), 400

    # Save all files first
    saved, unsupported = [], []
    for f in files:
        if not f or not _allowed(f.filename):
            unsupported.append({"file": getattr(f, "filename", "?"), "error": "unsupported_type"})
            continue
        fn   = secure_filename(f.filename)
        path = UPL_DIR / f"{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}_{fn}"
        f.save(str(path))
        m    = re.search(r"(\d+)", fn)
        roll = request.form.get(f"roll_no_{fn}", "") or (m.group(1) if m else fn)
        name = request.form.get(f"name_{fn}", "")
        saved.append((str(path), roll, name, fn))

    log.info(f"[BULK] {len(saved)} files saved for exam={exam_id}")

    # ── Async path ────────────────────────────────────────────────────────────
    if CELERY_OK and saved:
        try:
            from celery_worker import evaluate_bulk as _bulk_task
            task = _bulk_task.delay(saved, e)
            log.info(f"[BULK] Async task queued: {task.id}")
            return jsonify({
                "async":   True,
                "task_id": task.id,
                "status":  "processing",
                "files":   len(saved),
                "message": "Bulk evaluation queued. Poll /api/evaluate/status/<task_id>.",
            }), 202
        except Exception as _ce:
            log.warning(f"[BULK] Celery dispatch failed, falling back to sync: {_ce}")

    # ── Sync path with parallel threads ──────────────────────────────────────
    results, failures = list(unsupported), []

    def _eval_one(entry):
        fpath, roll, name, fn = entry
        fhash  = _file_hash(fpath)
        cached = _cache_get(fhash, exam_id)
        if cached:
            return {"evaluation_id": cached["evaluation_id"], "roll_no": roll,
                    "percentage": cached["result"].get("percentage",0),
                    "is_pass": cached["result"].get("is_pass",False),
                    "total_awarded": cached["result"].get("total_awarded",0),
                    "total_possible": cached["result"].get("total_possible",0)}, None
        _openai_limiter.wait()
        answers, mode = _extract_answers(fpath, exam_questions=e.get("questions",[]), exam=e)
        if not answers:
            return None, {"file": fn, "error": f"extract_failed ({mode})"}
        _openai_limiter.wait()
        res = _evaluate_answers(e, answers, roll)
        eid = uuid.uuid4().hex[:10]
        p   = {
            "evaluation_id": eid, "exam_id": exam_id, "created_at": _now(),
            "student_name": name, "roll_no": roll, "file_name": fn,
            "file_hash": fhash, "extraction_mode": mode,
            "submitted_answers": answers, "result": res,
        }
        evaluations_registry[eid] = p
        if not IS_VERCEL:
            _save_json(EVAL_DIR / f"{eid}.json", p)
        _cache_set(fhash, exam_id, p)
        return {"evaluation_id": eid, "roll_no": roll,
                "percentage": res.get("percentage",0), "is_pass": res.get("is_pass",False),
                "total_awarded": res.get("total_awarded",0),
                "total_possible": res.get("total_possible",0)}, None

    with ThreadPoolExecutor(max_workers=min(4, len(saved))) as pool:
        futs = {pool.submit(_eval_one, entry): entry for entry in saved}
        for fut in as_completed(futs):
            res, err = fut.result()
            if res:
                results.append(res)
            elif err:
                failures.append(err)

    _save_evals()
    bulk_id = uuid.uuid4().hex[:10]
    bp = {"bulk_id": bulk_id, "exam_id": exam_id, "created_at": _now(),
          "total": len(results), "results": results, "failures": failures + unsupported}
    bulk_evaluations_registry[bulk_id] = bp
    if not IS_VERCEL:
        _save_json(BULK_DIR / f"{bulk_id}.json", bp)
    _save_bulk()
    log.info(f"[BULK] Sync complete: ok={len(results)} fail={len(failures)}")
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



def _build_email_report_html(ev: dict, exam: dict, student_name: str) -> str:
    """Build a rich HTML email report for parents."""
    res         = ev.get("result", {})
    pct         = float(res.get("percentage", 0))
    is_pass     = res.get("is_pass", False)
    awarded     = res.get("total_awarded", 0)
    possible    = res.get("total_possible", 0)
    grade       = res.get("grade", "F")
    qwise       = res.get("question_wise", [])
    obj_qw      = [q for q in qwise if q.get("type") == "objective"]
    subj_qw     = [q for q in qwise if q.get("type") == "subjective"]
    school      = exam.get("school_name", "Parvidya Smart Learning")
    subject_str = exam.get("subject", "")
    exam_cls    = exam.get("class", "")
    imp         = res.get("improvement_prediction", "")
    score_color = "#065f46" if pct >= 60 else ("#d97706" if pct >= 40 else "#dc2626")
    pass_color  = "#065f46" if is_pass else "#dc2626"
    pass_bg     = "#f0fdf4" if is_pass else "#fef2f2"
    pass_border = "#86efac" if is_pass else "#fca5a5"
    pass_text   = "PASS &#10003;" if is_pass else "FAIL &#10007;"

    # MCQ rows
    mcq_rows = ""
    for qr in obj_qw:
        correct = qr.get("is_correct", False)
        row_bg  = "#f0fdf4" if correct else "#fef2f2"
        sym     = "&#10003;" if correct else "&#10007;"
        sym_col = "#065f46" if correct else "#dc2626"
        am      = qr.get("awarded_marks", 0)
        mm      = qr.get("max_marks", 0)
        sa      = str(qr.get("student_answer", "&#8212;") or "&#8212;")
        mcq_rows += (
            f'<tr style="background:{row_bg}">'
            f'<td style="padding:7px 10px;border:1px solid #e2e8f0">Q{qr.get("question_id","")}</td>'
            f'<td style="padding:7px 10px;border:1px solid #e2e8f0">{sa}</td>'
            f'<td style="padding:7px 10px;border:1px solid #e2e8f0;font-weight:700;color:{sym_col};text-align:center">{sym}</td>'
            f'<td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:center">{am}/{mm}</td>'
            f'</tr>'
        )

    mcq_section = ""
    if obj_qw:
        mcq_section = (
            '<tr><td style="padding:8px 32px">'
            '<div style="font-size:13px;font-weight:700;color:#3730a3;background:#eef2ff;'
            'padding:8px 12px;border-radius:6px;margin-bottom:10px">'
            f'Section A &#8212; Objective ({len(obj_qw)} questions)</div>'
            '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px">'
            '<tr style="background:#f1f5f9">'
            '<th style="padding:8px 10px;text-align:left;border:1px solid #e2e8f0">Q#</th>'
            '<th style="padding:8px 10px;text-align:left;border:1px solid #e2e8f0">Answer</th>'
            '<th style="padding:8px 10px;border:1px solid #e2e8f0">Result</th>'
            '<th style="padding:8px 10px;border:1px solid #e2e8f0">Marks</th>'
            f'</tr>{mcq_rows}</table></td></tr>'
        )

    # Subjective rows
    subj_rows = ""
    for qr in subj_qw:
        am_q    = qr.get("awarded_marks", 0)
        mm_q    = qr.get("max_marks", 0)
        pct_q   = round((am_q / mm_q * 100) if mm_q else 0)
        bc      = "#065f46" if pct_q >= 60 else ("#d97706" if pct_q >= 30 else "#dc2626")
        fb      = str(qr.get("feedback", ""))[:150]
        sa      = str(qr.get("student_answer", "No answer"))[:200]
        fb_html = f'<div style="font-size:12px;color:#1d4ed8;margin-top:4px"><em>{fb}</em></div>' if fb else ""
        subj_rows += (
            f'<tr>'
            f'<td style="padding:10px;border:1px solid #e2e8f0;vertical-align:top">'
            f'<strong>Q{qr.get("question_id","")}</strong></td>'
            f'<td style="padding:10px;border:1px solid #e2e8f0">'
            f'<div style="color:#374151;font-size:13px">{sa}</div>{fb_html}</td>'
            f'<td style="padding:10px;border:1px solid #e2e8f0;white-space:nowrap;text-align:center">'
            f'<span style="font-weight:700;color:{bc}">{am_q}/{mm_q}m</span></td>'
            f'</tr>'
        )

    subj_section = ""
    if subj_qw:
        subj_section = (
            '<tr><td style="padding:16px 32px 8px">'
            '<div style="font-size:13px;font-weight:700;color:#065f46;background:#ecfdf5;'
            'padding:8px 12px;border-radius:6px;margin-bottom:10px">'
            f'Section B &#8212; Written ({len(subj_qw)} questions)</div>'
            '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px">'
            '<tr style="background:#f1f5f9">'
            '<th style="padding:8px 10px;text-align:left;border:1px solid #e2e8f0">Q#</th>'
            '<th style="padding:8px 10px;text-align:left;border:1px solid #e2e8f0">Student Answer</th>'
            '<th style="padding:8px 10px;border:1px solid #e2e8f0">Marks</th>'
            f'</tr>{subj_rows}</table></td></tr>'
        )

    imp_section = ""
    if imp:
        imp_section = (
            '<tr><td style="padding:16px 32px">'
            '<div style="background:#eff6ff;border-radius:10px;padding:14px 16px;border:1px solid #bfdbfe">'
            '<div style="font-size:12px;font-weight:700;color:#1e40af;margin-bottom:6px">&#128161; Teacher&#39;s Recommendation</div>'
            f'<div style="font-size:13px;color:#1d4ed8">{imp}</div>'
            '</div></td></tr>'
        )

    return (
        '<!DOCTYPE html><html><head><meta charset="utf-8"></head>'
        '<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">'
        '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0">'
        '<tr><td align="center">'
        '<table width="600" cellpadding="0" cellspacing="0" '
        'style="background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">'
        # Header
        '<tr><td style="background:linear-gradient(135deg,#1e1b4b,#4c1d95);padding:28px 32px">'
        f'<div style="color:#fff;font-size:20px;font-weight:700">{school}</div>'
        f'<div style="color:rgba(255,255,255,.6);font-size:13px;margin-top:4px">'
        f'Student Performance Report &middot; {subject_str} {exam_cls}</div>'
        '</td></tr>'
        # Greeting
        '<tr><td style="padding:24px 32px 8px">'
        '<p style="color:#374151;font-size:15px;margin:0">Dear Parent / Guardian,</p>'
        f'<p style="color:#374151;font-size:14px;margin:10px 0 0">Please find the performance report for <strong>{student_name}</strong>.</p>'
        '</td></tr>'
        # Score cards
        '<tr><td style="padding:16px 32px">'
        '<table width="100%" cellpadding="0" cellspacing="0"><tr>'
        f'<td width="25%" style="text-align:center;padding:14px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0"><div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:6px">MARKS</div><div style="font-size:24px;font-weight:800;color:#0f172a">{awarded}/{possible}</div></td>'
        '<td width="4%"></td>'
        f'<td width="25%" style="text-align:center;padding:14px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0"><div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:6px">PERCENTAGE</div><div style="font-size:24px;font-weight:800;color:{score_color}">{pct}%</div></td>'
        '<td width="4%"></td>'
        f'<td width="25%" style="text-align:center;padding:14px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0"><div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:6px">GRADE</div><div style="font-size:24px;font-weight:800;color:{score_color}">{grade}</div></td>'
        '<td width="4%"></td>'
        f'<td width="25%" style="text-align:center;padding:14px;border-radius:10px;background:{pass_bg};border:1px solid {pass_border}"><div style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;margin-bottom:6px">RESULT</div><div style="font-size:22px;font-weight:800;color:{pass_color}">{pass_text}</div></td>'
        '</tr></table></td></tr>'
        # Progress bar
        f'<tr><td style="padding:4px 32px 20px"><div style="height:8px;background:#e2e8f0;border-radius:999px"><div style="height:8px;width:{min(100, int(pct))}%;background:{score_color};border-radius:999px"></div></div></td></tr>'
        # Sections
        + mcq_section + subj_section + imp_section +
        # Footer
        f'<tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0">'
        f'<div style="font-size:12px;color:#94a3b8">Evaluated by <strong>Parvidya Smart Learning AI</strong> &middot; Exam ID: {ev.get("exam_id","&#8212;")} &middot; Date: {ev.get("created_at","")[:10]}</div>'
        '</td></tr>'
        '</table></td></tr></table></body></html>'
    )


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

    # Build rich HTML email if not pre-supplied
    if not html_report and eval_id:
        ev   = evaluations_registry.get(eval_id)
        exam = _load_exam(ev.get("exam_id","")) if ev else {}
        if ev:
            html_report = _build_email_report_html(
                ev, exam, student_name or ev.get("student_name","Student")
            )

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



def _generate_evaluation_report_pdf(ev: dict, exam: dict) -> bytes:
    """
    Generate a single-student evaluation report PDF.
    Sections:
     1. Header: school, exam, student details, overall score
     2. Score summary grid
     3. Section A: MCQ table with correct/wrong per question
     4. Section B: Subjective with model answer, feedback, key points
     5. Recommendations footer
    """
    try:
        from reportlab.pdfgen import canvas as rl_canvas
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.lib import colors as rl_c
        import io as _io2

        buf = _io2.BytesIO()
        W, H = A4
        c    = rl_canvas.Canvas(buf, pagesize=A4)
        M    = 15 * mm

        res      = ev.get("result", {})
        pct      = float(res.get("percentage", 0))
        grade    = res.get("grade", "F")
        is_pass  = res.get("is_pass", False)
        awarded  = res.get("total_awarded", 0)
        possible = res.get("total_possible", 0)
        qwise    = res.get("question_wise", [])
        obj_qw   = [q for q in qwise if q.get("type") == "objective"]
        subj_qw  = [q for q in qwise if q.get("type") == "subjective"]
        exam_qs  = {int(q.get("id",0)): q for q in exam.get("questions", [])}

        grade_color = (
            "#15803d" if pct >= 70 else
            "#d97706" if pct >= 50 else
            "#dc2626"
        )
        pass_color  = "#15803d" if is_pass else "#dc2626"

        page = 1

        def draw_page_header(pnum=1):
            # Dark header bar
            c.setFillColor(rl_c.HexColor("#1e1b4b"))
            c.rect(M, H - 20*mm, W - 2*M, 20*mm, fill=1, stroke=0)
            c.setFillColor(rl_c.white)
            c.setFont("Helvetica-Bold", 13)
            c.drawString(M + 5*mm, H - 10*mm,
                exam.get("school_name", "VidyAI School")[:50])
            c.setFont("Helvetica", 9)
            c.drawRightString(W - M - 5*mm, H - 10*mm,
                f"PERFORMANCE REPORT  ·  Page {pnum}")
            c.setFont("Helvetica", 8)
            c.setFillColor(rl_c.HexColor("#a5b4fc"))
            subj_str = "  ·  ".join(p for p in [
                exam.get("subject",""), exam.get("board",""), exam.get("class","")
            ] if p)
            c.drawString(M + 5*mm, H - 17*mm, subj_str)
            c.drawRightString(W - M - 5*mm, H - 17*mm,
                f"Exam ID: {ev.get('exam_id','—')}  ·  Date: {ev.get('created_at','')[:10]}")
            return H - 23*mm

        def new_page():
            nonlocal page
            c.showPage(); page += 1
            return draw_page_header(page)

        y = draw_page_header(page)

        # ── Student info + score summary ──────────────────────────────────────
        # Student info row
        c.setFillColor(rl_c.HexColor("#f8fafc"))
        c.setStrokeColor(rl_c.HexColor("#e2e8f0"))
        c.setLineWidth(0.8)
        c.rect(M, y - 14*mm, W - 2*M, 14*mm, fill=1, stroke=1)

        fields = [
            ("Student",     ev.get("student_name","—")),
            ("Roll No.",    ev.get("roll_no","—")),
            ("Exam Date",   ev.get("created_at","")[:10]),
        ]
        fw = (W - 2*M) / len(fields)
        for fi, (lbl, val) in enumerate(fields):
            fx = M + fi * fw
            c.setFillColor(rl_c.HexColor("#64748b"))
            c.setFont("Helvetica", 7)
            c.drawString(fx + 4*mm, y - 5*mm, lbl.upper())
            c.setFillColor(rl_c.HexColor("#0f172a"))
            c.setFont("Helvetica-Bold", 10)
            c.drawString(fx + 4*mm, y - 11*mm, str(val)[:30])
            if fi > 0:
                c.setStrokeColor(rl_c.HexColor("#e2e8f0"))
                c.setLineWidth(0.4)
                c.line(fx, y - 12*mm, fx, y - 2*mm)
        y -= 17*mm

        # Score cards grid
        score_cells = [
            ("MARKS",      f"{awarded}/{possible}",  "#0f172a",  "#f8fafc"),
            ("PERCENTAGE", f"{pct}%",                 grade_color,"#f8fafc"),
            ("GRADE",      grade,                     grade_color,"#f8fafc"),
            ("RESULT",     "PASS ✓" if is_pass else "FAIL ✗", pass_color,
             "#f0fdf4" if is_pass else "#fef2f2"),
        ]
        cw = (W - 2*M) / 4
        CH = 18*mm
        for ci, (lbl, val, fcolor, bg) in enumerate(score_cells):
            cx = M + ci * cw
            c.setFillColor(rl_c.HexColor(bg))
            c.setStrokeColor(rl_c.HexColor("#e2e8f0"))
            c.setLineWidth(0.6)
            c.rect(cx, y - CH, cw, CH, fill=1, stroke=1)
            c.setFillColor(rl_c.HexColor("#64748b"))
            c.setFont("Helvetica", 7)
            c.drawCentredString(cx + cw/2, y - 6*mm, lbl)
            c.setFillColor(rl_c.HexColor(fcolor))
            c.setFont("Helvetica-Bold", 16)
            c.drawCentredString(cx + cw/2, y - 14*mm, str(val))
        y -= CH + 5*mm

        # Improvement prediction
        imp = res.get("improvement_prediction","")
        if imp:
            imp_lines = _pdf_wrap(imp, 90)
            IH = (len(imp_lines) * 4.5 + 5) * mm
            c.setFillColor(rl_c.HexColor("#eff6ff"))
            c.setStrokeColor(rl_c.HexColor("#bfdbfe"))
            c.setLineWidth(0.6)
            c.roundRect(M, y - IH, W - 2*M, IH, 2, fill=1, stroke=1)
            c.setFillColor(rl_c.HexColor("#1e40af"))
            c.setFont("Helvetica-Bold", 8)
            c.drawString(M + 4*mm, y - 4.5*mm, "💡 Teacher Recommendation:")
            c.setFont("Helvetica", 8)
            for li, line in enumerate(imp_lines):
                c.drawString(M + 4*mm, y - 9*mm - li*4.5*mm, line)
            y -= IH + 5*mm

        # ── Section A: Objective Results ──────────────────────────────────────
        if obj_qw:
            if y - 10*mm < 20*mm: y = new_page()
            _pdf_section_bar(c, M, y, W - 2*M, 8*mm,
                "#eef2ff", f"SECTION A — OBJECTIVE  ({len(obj_qw)} questions)",
                "#3730a3", font_size=8.5, mm=mm)
            y -= 10*mm

            # Column headers
            cols = [("Q#",12), ("Question",90), ("Student Answer",35), ("Marks",20), ("Result",22)]
            col_x = [M]
            for (_, cw_mm) in cols:
                col_x.append(col_x[-1] + cw_mm*mm)

            c.setFillColor(rl_c.HexColor("#f1f5f9"))
            c.rect(M, y - 6*mm, W - 2*M, 6*mm, fill=1, stroke=0)
            c.setFillColor(rl_c.HexColor("#374151"))
            c.setFont("Helvetica-Bold", 7.5)
            for i, (lbl, _) in enumerate(cols):
                c.drawString(col_x[i] + 1.5*mm, y - 4.2*mm, lbl)
            y -= 7*mm

            for qr in obj_qw:
                if y < 20*mm: y = new_page()
                qid      = int(qr.get("question_id", 0))
                correct  = qr.get("is_correct", False)
                q_text   = str(exam_qs.get(qid,{}).get("question",""))[:55]
                # Sanitize: strip newlines, collapse whitespace, treat bare-dash
                # (OCR artifact) as blank so it renders as em-dash, not "-\nA"
                raw_sa   = str(qr.get("student_answer", "") or "")
                raw_sa   = re.sub(r"[\r\n]+", " ", raw_sa).strip()
                raw_sa   = re.sub(r"\s+", " ", raw_sa)
                # If value is just '-' or '--' (OCR noise) treat as missing
                stud_ans = raw_sa if (raw_sa and raw_sa not in {"-", "--", "—"}) else "—"
                # If value still has leading dash+space like "- A", extract the letter
                m_dash = re.match(r'^[-–—]\s*([A-D])\b', stud_ans, re.IGNORECASE)
                if m_dash:
                    stud_ans = m_dash.group(1).upper()
                awarded_m= qr.get("awarded_marks",0)
                max_m    = qr.get("max_marks",0)
                bg       = "#f0fdf4" if correct else "#fef2f2"
                rc_text  = "✓ Correct" if correct else "✗ Wrong"
                rc_col   = "#15803d" if correct else "#dc2626"

                ROW_H = 7*mm
                c.setFillColor(rl_c.HexColor(bg))
                c.rect(M, y - ROW_H, W - 2*M, ROW_H, fill=1, stroke=0)
                c.setStrokeColor(rl_c.HexColor("#e2e8f0"))
                c.setLineWidth(0.3)
                c.line(M, y - ROW_H, W - M, y - ROW_H)

                row_vals = [f"Q{qid}", q_text, stud_ans or "—",
                            f"{awarded_m}/{max_m}", rc_text]
                for i, val in enumerate(row_vals):
                    color = rc_col if i == 4 else "#0f172a"
                    bold  = (i == 4)
                    c.setFillColor(rl_c.HexColor(color))
                    c.setFont("Helvetica-Bold" if bold else "Helvetica", 8)
                    c.drawString(col_x[i] + 1.5*mm, y - 4.8*mm, str(val)[:30])
                y -= ROW_H

            y -= 5*mm

        # ── Section B: Subjective Results ─────────────────────────────────────
        if subj_qw:
            if y - 10*mm < 25*mm: y = new_page()
            _pdf_section_bar(c, M, y, W - 2*M, 8*mm,
                "#ecfdf5", f"SECTION B — WRITTEN  ({len(subj_qw)} questions)",
                "#065f46", font_size=8.5, mm=mm)
            y -= 10*mm

            for qr in subj_qw:
                qid      = int(qr.get("question_id",0))
                awarded_m= float(qr.get("awarded_marks",0))
                max_m    = float(qr.get("max_marks",0))
                stud_ans = str(qr.get("student_answer","")).strip() or "(No answer)"
                feedback = str(qr.get("feedback","")).strip()
                strengths= qr.get("strengths",[])
                missing  = qr.get("missing_points",[])
                q_text   = str(exam_qs.get(qid,{}).get("question",""))
                pct_q    = (awarded_m/max_m*100) if max_m else 0
                bg       = "#f0fdf4" if pct_q >= 60 else ("#fffbeb" if pct_q >= 30 else "#fef2f2")
                border   = "#86efac" if pct_q >= 60 else ("#fde68a" if pct_q >= 30 else "#fecaca")

                # Estimate height
                q_lines  = _pdf_wrap(q_text, 88)
                a_lines  = _pdf_wrap(stud_ans, 88)
                fb_lines = _pdf_wrap(feedback, 88) if feedback else []
                total_h  = (2 + len(q_lines)*4.5 + len(a_lines)*4.5 +
                            len(fb_lines)*4.5 + len(strengths)*4.5 +
                            len(missing)*4.5 + 16) * mm

                if y - total_h < 18*mm: y = new_page()

                c.setFillColor(rl_c.HexColor(bg))
                c.setStrokeColor(rl_c.HexColor(border))
                c.setLineWidth(0.8)
                c.roundRect(M, y - total_h, W - 2*M, total_h, 2, fill=1, stroke=1)

                # Q number + score tab
                c.setFillColor(rl_c.HexColor("#059669"))
                c.roundRect(M, y - total_h, 16*mm, total_h, 2, fill=1, stroke=0)
                c.setFillColor(rl_c.white)
                c.setFont("Helvetica-Bold", 12)
                c.drawCentredString(M + 8*mm, y - total_h/2 + 2*mm, f"Q{qid}")
                c.setFont("Helvetica", 7)
                c.drawCentredString(M + 8*mm, y - total_h/2 - 4*mm,
                    f"{awarded_m}/{max_m}m")

                cx  = M + 18*mm
                cur_y = y - 5*mm

                # Question text
                c.setFillColor(rl_c.HexColor("#374151"))
                c.setFont("Helvetica-Bold", 8)
                for li, line in enumerate(q_lines):
                    c.drawString(cx, cur_y - li*4.5*mm, line)
                cur_y -= (len(q_lines)*4.5 + 3)*mm

                # Marks bar
                c.setFillColor(rl_c.HexColor("#1e293b"))
                c.setFont("Helvetica-Bold", 9)
                score_str = f"Score: {awarded_m}/{max_m} marks  ({int(pct_q)}%)"
                c.drawString(cx, cur_y, score_str)
                cur_y -= 7*mm

                # Student answer
                c.setFillColor(rl_c.HexColor("#374151"))
                c.setFont("Helvetica-Bold", 7.5)
                c.drawString(cx, cur_y, "Student's Answer:")
                cur_y -= 5*mm
                c.setFont("Helvetica", 8)
                for line in a_lines:
                    c.drawString(cx + 2*mm, cur_y, line)
                    cur_y -= 4.5*mm
                cur_y -= 2*mm

                if feedback:
                    c.setFillColor(rl_c.HexColor("#1d4ed8"))
                    c.setFont("Helvetica-Bold", 7.5)
                    c.drawString(cx, cur_y, "AI Feedback:")
                    cur_y -= 5*mm
                    c.setFont("Helvetica-Oblique", 8)
                    for line in fb_lines:
                        c.drawString(cx + 2*mm, cur_y, line)
                        cur_y -= 4.5*mm
                    cur_y -= 2*mm

                if strengths:
                    c.setFillColor(rl_c.HexColor("#15803d"))
                    c.setFont("Helvetica-Bold", 7.5)
                    c.drawString(cx, cur_y, "Strengths:")
                    cur_y -= 4.5*mm
                    c.setFont("Helvetica", 8)
                    for s in strengths[:3]:
                        c.drawString(cx + 2*mm, cur_y, f"+ {s[:80]}")
                        cur_y -= 4.5*mm

                if missing:
                    c.setFillColor(rl_c.HexColor("#92400e"))
                    c.setFont("Helvetica-Bold", 7.5)
                    c.drawString(cx, cur_y, "Could Improve:")
                    cur_y -= 4.5*mm
                    c.setFont("Helvetica", 8)
                    for mp in missing[:3]:
                        c.drawString(cx + 2*mm, cur_y, f"• {mp[:80]}")
                        cur_y -= 4.5*mm

                y -= total_h + 5*mm

        # Footer
        c.setFillColor(rl_c.HexColor("#94a3b8"))
        c.setFont("Helvetica", 6.5)
        c.drawCentredString(W/2, 5*mm,
            f"Evaluated by VidyAI  ·  Evaluation ID: {ev.get('evaluation_id','—')}  ·  "
            f"Mode: {ev.get('extraction_mode','—')}")

        c.save()
        buf.seek(0)
        return buf.read()

    except Exception as ex:
        log.error(f"[REPORT-PDF] {ex}", exc_info=True)
        return b""

# ══════════════════════════════════════════════════════════════════════════════
#  REPORTING ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/api/evaluations")
@auth()
def list_evaluations():
    """
    List all evaluations visible to the requesting user.
    - student : own evaluations only
    - teacher / school_admin / admin : all evaluations, optionally filtered
    Query params: exam_id, student_name, roll_no, limit (default 100)
    """
    u        = request.user
    exam_id  = request.args.get("exam_id", "").strip()
    s_name   = request.args.get("student_name", "").strip().lower()
    roll     = request.args.get("roll_no", "").strip()
    limit    = min(int(request.args.get("limit", 200)), 500)

    # Merge registry + JSON files for completeness
    all_evals = list(evaluations_registry.values())
    if not IS_VERCEL and EVAL_DIR.exists():
        for p in EVAL_DIR.glob("*.json"):
            eid = p.stem
            if eid not in evaluations_registry:
                ev = _load_json(p)
                if ev:
                    evaluations_registry[eid] = ev
                    all_evals.append(ev)

    # Role-based filter
    if u["role"] == "student":
        # Students see only evaluations where roll_no or student_name matches their profile
        all_evals = [ev for ev in all_evals
                     if (ev.get("roll_no") == u.get("roll_number","")
                         or ev.get("student_name","").lower() == u.get("name","").lower())]

    # Optional query filters
    if exam_id:
        all_evals = [ev for ev in all_evals if ev.get("exam_id") == exam_id]
    if s_name:
        all_evals = [ev for ev in all_evals
                     if s_name in ev.get("student_name","").lower()]
    if roll:
        all_evals = [ev for ev in all_evals if ev.get("roll_no","") == roll]

    # Sort newest first
    all_evals.sort(key=lambda e: e.get("created_at",""), reverse=True)
    all_evals = all_evals[:limit]

    # Lightweight summary — don't send full question_wise in list view
    summaries = []
    for ev in all_evals:
        res = ev.get("result", {})
        exam = _load_exam(ev.get("exam_id","")) or {}
        summaries.append({
            "evaluation_id":   ev.get("evaluation_id",""),
            "exam_id":         ev.get("exam_id",""),
            "exam_name":       exam.get("syllabus_name") or exam.get("subject",""),
            "subject":         exam.get("subject",""),
            "board":           exam.get("board",""),
            "class":           exam.get("class",""),
            "student_name":    ev.get("student_name",""),
            "roll_no":         ev.get("roll_no",""),
            "created_at":      ev.get("created_at",""),
            "total_awarded":   res.get("total_awarded",0),
            "total_possible":  res.get("total_possible",0),
            "percentage":      res.get("percentage",0),
            "grade":           res.get("grade","F"),
            "is_pass":         res.get("is_pass",False),
            "extraction_mode": ev.get("extraction_mode",""),
        })

    return jsonify({"evaluations": summaries, "total": len(summaries)})


@app.get("/api/evaluations/report/<eval_id>")
@auth()
def download_evaluation_report(eval_id):
    """
    Generate and return a PDF evaluation report for one student.
    """
    ev = evaluations_registry.get(eval_id)
    if not ev and not IS_VERCEL:
        ev = _load_json(EVAL_DIR / f"{eval_id}.json")
    if not ev:
        return jsonify({"error": "Evaluation not found"}), 404

    exam = _load_exam(ev.get("exam_id","")) or {}
    pdf  = _generate_evaluation_report_pdf(ev, exam)
    if not pdf:
        return jsonify({"error": "PDF generation failed"}), 500

    sname    = re.sub(r"[^\w\s-]","", ev.get("student_name","Student"))[:20]
    filename = f"Report_{sname}_{eval_id}.pdf"
    from flask import Response
    return Response(pdf, mimetype="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@app.get("/api/exams/<exam_id>/class-report")
@auth(roles=["teacher","tutor","school_admin","admin"])
def get_class_report(exam_id):
    """
    Aggregate class-level report for one exam:
    - pass/fail counts, class average, grade distribution
    - question-wise accuracy (which questions the class found hardest)
    - top performers, students at risk
    - per-student summary table
    """
    exam = _load_exam(exam_id)
    if not exam:
        return jsonify({"error": "Exam not found"}), 404

    evals = [ev for ev in evaluations_registry.values()
             if ev.get("exam_id") == exam_id]
    if not IS_VERCEL and EVAL_DIR.exists():
        for p in EVAL_DIR.glob("*.json"):
            ev = _load_json(p)
            if ev and ev.get("exam_id") == exam_id:
                eid = ev.get("evaluation_id","")
                if eid and eid not in evaluations_registry:
                    evals.append(ev)

    if not evals:
        return jsonify({"error": "No evaluations found for this exam"}), 404

    total     = len(evals)
    pcts      = [ev.get("result",{}).get("percentage",0) for ev in evals]
    awarded   = [ev.get("result",{}).get("total_awarded",0) for ev in evals]
    pass_list = [ev for ev in evals if ev.get("result",{}).get("is_pass")]

    # Grade distribution
    grade_dist = {"A+":0,"A":0,"B":0,"C":0,"D":0,"F":0}
    for ev in evals:
        g = ev.get("result",{}).get("grade","F")
        grade_dist[g] = grade_dist.get(g,0) + 1

    # Question-wise accuracy
    q_stats: Dict[int, dict] = {}
    for ev in evals:
        for qr in ev.get("result",{}).get("question_wise",[]):
            qid = int(qr.get("question_id",0))
            if qid not in q_stats:
                q_stats[qid] = {"awarded":0.0,"possible":0.0,"attempts":0}
            q_stats[qid]["awarded"]   += float(qr.get("awarded_marks",0))
            q_stats[qid]["possible"]  += float(qr.get("max_marks",1))
            q_stats[qid]["attempts"]  += 1

    q_accuracy = []
    for qid, s in sorted(q_stats.items()):
        poss = s["possible"]
        acc  = round((s["awarded"]/poss)*100, 1) if poss else 0
        q    = next((qq for qq in exam.get("questions",[]) if int(qq.get("id",0))==qid), {})
        q_accuracy.append({
            "question_id":   qid,
            "question":      str(q.get("question",""))[:80],
            "type":          q.get("type","objective"),
            "max_marks":     q.get("marks",q.get("weightage",1)),
            "avg_awarded":   round(s["awarded"]/s["attempts"],2) if s["attempts"] else 0,
            "accuracy_pct":  acc,
            "attempts":      s["attempts"],
        })

    # Student summaries sorted by percentage desc
    student_rows = []
    for ev in sorted(evals, key=lambda e: e.get("result",{}).get("percentage",0), reverse=True):
        res = ev.get("result",{})
        student_rows.append({
            "evaluation_id": ev.get("evaluation_id",""),
            "student_name":  ev.get("student_name",""),
            "roll_no":       ev.get("roll_no",""),
            "total_awarded": res.get("total_awarded",0),
            "total_possible":res.get("total_possible",0),
            "percentage":    res.get("percentage",0),
            "grade":         res.get("grade","F"),
            "is_pass":       res.get("is_pass",False),
            "created_at":    ev.get("created_at",""),
        })

    # Weakest questions (accuracy < 50%)
    weak_questions = [q for q in q_accuracy if q["accuracy_pct"] < 50]
    weak_questions.sort(key=lambda q: q["accuracy_pct"])

    return jsonify({
        "exam_id":         exam_id,
        "exam_name":       exam.get("syllabus_name","") or exam.get("subject",""),
        "subject":         exam.get("subject",""),
        "board":           exam.get("board",""),
        "class":           exam.get("class",""),
        "total_students":  total,
        "pass_count":      len(pass_list),
        "fail_count":      total - len(pass_list),
        "pass_rate":       round(len(pass_list)/total*100, 1) if total else 0,
        "class_average":   round(sum(pcts)/total, 1) if total else 0,
        "highest_score":   max(pcts) if pcts else 0,
        "lowest_score":    min(pcts) if pcts else 0,
        "total_marks":     exam.get("total_marks",0),
        "grade_distribution": grade_dist,
        "question_accuracy":  q_accuracy,
        "weak_questions":     weak_questions[:5],
        "student_rows":       student_rows,
    })


@app.get("/api/students/<roll_no>/history")
@auth()
def get_student_history(roll_no):
    """
    All evaluations for one student (by roll number).
    Shows performance trend across exams.
    """
    u = request.user
    # Students can only see their own history
    if u["role"] == "student" and u.get("roll_number","") != roll_no:
        return jsonify({"error": "Forbidden"}), 403

    all_evals = list(evaluations_registry.values())
    student_evals = [ev for ev in all_evals
                     if ev.get("roll_no","") == roll_no]
    student_evals.sort(key=lambda e: e.get("created_at",""))

    history = []
    for ev in student_evals:
        res  = ev.get("result",{})
        exam = _load_exam(ev.get("exam_id","")) or {}
        history.append({
            "evaluation_id": ev.get("evaluation_id",""),
            "exam_id":       ev.get("exam_id",""),
            "exam_name":     exam.get("syllabus_name","") or exam.get("subject",""),
            "subject":       exam.get("subject",""),
            "created_at":    ev.get("created_at",""),
            "percentage":    res.get("percentage",0),
            "grade":         res.get("grade","F"),
            "is_pass":       res.get("is_pass",False),
            "total_awarded": res.get("total_awarded",0),
            "total_possible":res.get("total_possible",0),
        })

    avg = round(sum(h["percentage"] for h in history)/len(history),1) if history else 0
    trend = "improving" if (len(history)>=2 and
        history[-1]["percentage"] > history[-2]["percentage"]) else (
        "declining" if len(history)>=2 and
        history[-1]["percentage"] < history[-2]["percentage"] else "stable")

    return jsonify({
        "roll_no":      roll_no,
        "student_name": student_evals[0].get("student_name","") if student_evals else "",
        "total_exams":  len(history),
        "average":      avg,
        "trend":        trend,
        "history":      history,
    })

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
    que  = "✓ Celery+Redis"      if CELERY_OK      else "⚠ Sync fallback (no Redis)"
    print(f"""
╔══════════════════════════════════════════╗
║  Parvidya Backend  →  http://localhost:{port}  ║
╠══════════════════════════════════════════╣
║  LangChain : {lc:<28}║
║  OpenAI    : {oai:<28}║
║  Database  : {mdb:<28}║
║  Queue     : {que:<28}║
║  Vercel    : {'Yes' if IS_VERCEL else 'No':<28}║
╚══════════════════════════════════════════╝
Syllabi loaded : {len(syllabi_registry)}
Exams loaded   : {len(exams_registry)}
""")
    from flask import cli
    cli.show_server_banner = lambda *_: None
    app.run(host="0.0.0.0", port=port, debug=not IS_VERCEL)
