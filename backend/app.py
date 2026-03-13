"""
Synapse AI Study Assistant — Flask Backend
==========================================
Full testEdu parity: per-syllabus vector stores, exam lifecycle,
vision-based answer extraction, bulk evaluation, audit/consistency.
Run:  python backend/app.py
API:  http://localhost:5000/api/...
"""
import os, json, re, uuid, hashlib, random, base64, shutil
from datetime import datetime
from pathlib import Path
from functools import wraps
from typing import List, Dict, Any, Optional, Tuple
from dotenv import load_dotenv
import pymongo

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

# ── LangChain (mirrors testEdu exactly, but adapted for Vercel) ───────────
try:
    from langchain_openai import ChatOpenAI, OpenAIEmbeddings
    from langchain_core.documents import Document
    from langchain_core.prompts import PromptTemplate
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain_core.vectorstores import InMemoryVectorStore
    
    # Try classic chains first, then fall back to standard langchain
    try:
        from langchain.chains import ConversationalRetrievalChain
        from langchain.memory import ConversationBufferMemory
    except ImportError:
        # Some versions/environments might have them in langchain_classic
        from langchain_classic.chains import ConversationalRetrievalChain
        from langchain_classic.memory import ConversationBufferMemory

    LANGCHAIN_OK = True
except ImportError as _e:
    LANGCHAIN_OK = False
    print(f"[WARN] LangChain not available: {_e}")

try:
    import openai as _oai
    OPENAI_OK = True
except ImportError:
    OPENAI_OK = False

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# ── Paths ──────────────────────────────────────────────────────────────────
BASE       = Path(__file__).parent.parent
IS_VERCEL  = os.environ.get("VERCEL") == "1"

if IS_VERCEL:
    # Vercel filesystem is read-only except for /tmp
    TMP_ROOT  = Path("/tmp")
    DATA_F    = TMP_ROOT / "platform_data.json"
    UPL_DIR   = TMP_ROOT / "uploads"
    DB_DIR    = TMP_ROOT / "study_db"
else:
    DATA_F    = BASE / "data" / "platform_data.json"
    UPL_DIR   = BASE / "uploads"
    DB_DIR    = BASE / "study_db"

EXAMS_DIR  = DB_DIR / "exams"
EVAL_DIR   = DB_DIR / "evaluations"
BULK_DIR   = DB_DIR / "bulk_evaluations"

for d in [DATA_F.parent, UPL_DIR, DB_DIR, EXAMS_DIR, EVAL_DIR, BULK_DIR]:
    d.mkdir(parents=True, exist_ok=True)

ALLOWED = {"pdf","txt","md","mp3","mp4","wav","m4a","jpg","jpeg","png","webp"}

# ── Flask app ──────────────────────────────────────────────────────────────
app = Flask(__name__, static_folder="../frontend", static_url_path="")
CORS(app)

@app.route('/')
def serve_frontend():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/manifest.json')
def serve_manifest():
    return send_from_directory(app.static_folder, 'manifest.json')

@app.route('/sw.js')
def serve_sw():
    return send_from_directory(app.static_folder, 'sw.js')
app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024

@app.route("/api/uploads/<path:filename>")
def download_upload(filename):
    return send_from_directory(UPL_DIR, filename)

# ── In-memory state ────────────────────────────────────────────────────────
TOKENS: Dict[str, str] = {}          # token → user_id
syllabi_registry: Dict[str, dict] = {}
qa_chains: Dict[str, Any] = {}
memories: Dict[str, Any] = {}
exams_registry: Dict[str, dict] = {}
evaluations_registry: Dict[str, dict] = {}
bulk_evaluations_registry: Dict[str, dict] = {}

# ── Registry files ─────────────────────────────────────────────────────────
SYLLABI_REG_F   = DB_DIR / "syllabi_registry.json"
EXAMS_REG_F     = DB_DIR / "exams_registry.json"
EVALS_REG_F     = DB_DIR / "evaluations_registry.json"
BULK_REG_F      = DB_DIR / "bulk_evaluations_registry.json"

def _save_json(path, obj):
    Path(path).write_text(json.dumps(obj, indent=2, default=str), encoding="utf-8")

def _load_json(path, default=None):
    p = Path(path)
    if p.exists():
        try: return json.loads(p.read_text(encoding="utf-8"))
        except: pass
    return default if default is not None else {}

# ── MongoDB Initialization ────────────────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

# Robustly quote credentials in MONGO_URI
if MONGO_URI and "://" in MONGO_URI and "@" in MONGO_URI:
    try:
        from urllib.parse import quote_plus
        prefix, rest = MONGO_URI.split("://")
        creds, cluster = rest.split("@")
        if ":" in creds:
            user, pw = creds.split(":")
            MONGO_URI = f"{prefix}://{quote_plus(user)}:{quote_plus(pw)}@{cluster}"
    except Exception as e:
        print(f"[INIT] URI Quoting skip: {e}")

MONGO_OK = False
mongo_db = None

try:
    import certifi
    ca = certifi.where()
    # Use certifi for SSL certificates to avoid TLSV1_ALERT_INTERNAL_ERROR on Vercel
    mongo_client = pymongo.MongoClient(
        MONGO_URI, 
        serverSelectionTimeoutMS=5000, 
        connectTimeoutMS=10000,
        tlsCAFile=ca
    )
    # Check connection
    mongo_client.server_info()
    mongo_db = mongo_client["edumind"]
    MONGO_OK = True
    print("[INIT] MongoDB Connected Successfully.")
except Exception as e:
    print(f"[INIT] MongoDB Connection Failed: {e}")
    MONGO_OK = False
    print(f"[WARN] MongoDB not available (using JSON fallback): {e}")

# ── Registry Collections ──────────────────────────────────────────────────
M_PLATFORM = "platform_data"
M_SYLLABI  = "syllabi"
M_EXAMS    = "exams"
M_EVALS    = "evaluations"
M_BULK     = "bulk_evals"
M_SESSIONS = "sessions"

def _mongo_save(col_name, data, key="registry_data"):
    if not MONGO_OK: return
    mongo_db[col_name].update_one({"id": key}, {"$set": {"data": data}}, upsert=True)

def _mongo_load(col_name, default=None, key="registry_data"):
    if not MONGO_OK: return default
    doc = mongo_db[col_name].find_one({"id": key})
    return doc["data"] if doc else default

# ── Registry Logic with Migration ──────────────────────────────────────────
def _save_syllabi():
    _mongo_save(M_SYLLABI, syllabi_registry)
    _save_json(SYLLABI_REG_F, syllabi_registry)

def _save_exams():
    _mongo_save(M_EXAMS, exams_registry)
    _save_json(EXAMS_REG_F, exams_registry)

def _save_evals():
    _mongo_save(M_EVALS, evaluations_registry)
    _save_json(EVALS_REG_F, evaluations_registry)

def _save_bulk():
    _mongo_save(M_BULK, bulk_evaluations_registry)
    _save_json(BULK_REG_F, bulk_evaluations_registry)

def _boot_load():
    global syllabi_registry, exams_registry, evaluations_registry, bulk_evaluations_registry
    
    # Syllabi
    syllabi_registry = _mongo_load(M_SYLLABI)
    if syllabi_registry is None:
        syllabi_registry = _load_json(SYLLABI_REG_F, {})
        if syllabi_registry: _mongo_save(M_SYLLABI, syllabi_registry)
    
    # Exams
    exams_registry = _mongo_load(M_EXAMS)
    if exams_registry is None:
        exams_registry = _load_json(EXAMS_REG_F, {})
        if exams_registry: _mongo_save(M_EXAMS, exams_registry)
        
    # Evaluations
    evaluations_registry = _mongo_load(M_EVALS)
    if evaluations_registry is None:
        evaluations_registry = _load_json(EVALS_REG_F, {})
        if evaluations_registry: _mongo_save(M_EVALS, evaluations_registry)
        
    # Bulk Evals
    bulk_evaluations_registry = _mongo_load(M_BULK)
    if bulk_evaluations_registry is None:
        bulk_evaluations_registry = _load_json(BULK_REG_F, {})
        if bulk_evaluations_registry: _mongo_save(M_BULK, bulk_evaluations_registry)

# ══════════════════════════════════════════════════════════════════════════
#  PROMPTS  (exact testEdu prompts)
# ══════════════════════════════════════════════════════════════════════════
STUDY_PROMPT = None
if LANGCHAIN_OK:
    STUDY_PROMPT = PromptTemplate(
        input_variables=["context", "chat_history", "question"],
        template="""
You are a patient tutor helping a student understand complex concepts.
Your style:
  • Explain concepts in simple terms (ELI5)
  • Provide 1–2 real-world examples
  • Use analogies when possible
  • End with a 1-sentence summary
  • Suggest follow-up questions if relevant

Use ONLY the information from uploaded materials.
If the answer isn't in the materials, say so honestly.

--- Uploaded Materials ---
{context}

--- Chat History ---
{chat_history}

Student Question: {question}

Tutor Answer:"""
    )

MIXED_QUESTION_GEN_PROMPT = """
You are an expert exam paper setter.
Generate questions ONLY from provided context.

Rules:
- Output EXACTLY valid JSON (no markdown).
- Generate exactly {total_count} questions.
- objective_count={objective_count}, subjective_count={subjective_count}
- difficulty targets: easy={easy_count}, medium={medium_count}, hard={hard_count}
- Every question must include:
  id (1-based integer),
  type ("objective" or "subjective"),
  difficulty ("easy"|"medium"|"hard"),
  weightage (number),
  question (string)
- For objective:
  options object with A,B,C,D keys
  valid_answers array (1+ valid options, like ["A"] or ["A","C"])
  explanation string
- For subjective:
  options=null
  valid_answers array of 2-5 valid model answers/paraphrases
  answer_key_points array of key points
  evaluation_rubric string
- Keep language clear and exam-ready.

Topic: {topic}
Context:
{context}
JSON only:
"""

VIDEO_EXPLAINER_PROMPT = """
You are a warm, enthusiastic British primary school teacher explaining the topic: {topic}.
Speak in a friendly, clear British English style that engages young learners (UK Key Stage 1 & 2).

Generate a JSON ARRAY of scene objects. Each scene must have:
  "segment": scene label
  "text": what the teacher SAYS (2-4 sentences, conversational British English)
  "visual": what is SHOWN on screen — use SPECIFIC visual content, NOT descriptions.
    - For maths: show the actual calculation, e.g. "3 + 4 = 7\\n5 + 2 = 7\\n10 + 6 = 16"
    - For science: show a labelled list, e.g. "🌱 Roots → absorb water\\n🍃 Leaves → make food\\n☀️ Sunlight → provides energy"
    - For history/geography: show key facts as bullet points
    - For English: show an example sentence with the target word/rule highlighted
    - For computing: show pseudocode or step-by-step algorithm
  "visual_type": one of "title", "worked_example", "bullet_list", "fact_box", "summary_box"

Scenes must follow this EXACT structure:
1. INTRO — Welcome, hook, British greeting. visual_type: "title"
2. CONCEPT — Explain the core idea. visual_type: "bullet_list" or "fact_box"
3. EXAMPLE_1 — First concrete worked example (show don't tell). visual_type: "worked_example"
4. EXAMPLE_2 — Second example, slightly harder or from a different angle. visual_type: "worked_example"
5. TRY_IT — Ask the student a question to test understanding. visual_type: "worked_example"
6. KEY_TAKEAWAYS — 3-5 bullet points of the most important things to remember. visual_type: "summary_box"
7. SUMMARY — Warm closing with encouragement. visual_type: "title"

IMPORTANT RULES:
- British English only (colour not color, practise not practice, maths not math).
- NEVER put descriptions like "show diagram of X" in the visual field — show the ACTUAL content.
- Keep each "text" to 2-4 natural spoken sentences.
- Return ONLY valid JSON array. No markdown. No preamble.
- Context from curriculum: {context}

Example output snippet (do not copy literally):
[
  {{"segment": "INTRO", "text": "Hello there! Today we're going to explore addition — one of the most brilliant tools in maths!", "visual": "➕ Addition\\nJoining numbers together!", "visual_type": "title"}},
  {{"segment": "EXAMPLE_1", "text": "Let's start with a simple one. If I have 3 apples and I pick up 4 more, how many do I have altogether?", "visual": "🍎 🍎 🍎  +  🍎 🍎 🍎 🍎\\n\\n3  +  4  =  7\\n\\nWe call this the SUM!", "visual_type": "worked_example"}},
  {{"segment": "KEY_TAKEAWAYS", "text": "Brilliant work! Let's recap the key things to remember about addition.", "visual": "✅ Addition means joining numbers together\\n✅ The + sign means 'add'\\n✅ The answer is called the SUM\\n✅ Order doesn't matter: 3+4 = 4+3\\n✅ You can use a number line to help!", "visual_type": "summary_box"}}
]
"""

REGIONAL_MIXED_QUESTION_GEN_PROMPT = """
You are an expert exam paper setter.
Generate questions ONLY from provided context.

CRITICAL INSTRUCTION: You MUST write the questions, answers, explanations, and all text content ENTIRELY in the '{language}' language. Do not use English.

Rules:
- Output EXACTLY valid JSON (no markdown).
- Generate exactly {total_count} questions.
- objective_count={objective_count}, subjective_count={subjective_count}
- difficulty targets: easy={easy_count}, medium={medium_count}, hard={hard_count}
- Every question must include:
  id (1-based integer),
  type ("objective" or "subjective"),
  difficulty ("easy"|"medium"|"hard"),
  weightage (number),
  question (string in {language})
- For objective:
  options object with A,B,C,D keys (values in {language})
  valid_answers array (1+ valid options, like ["A"] or ["A","C"])
  explanation (string in {language})
- For subjective:
  options=null
  valid_answers array of 2-5 valid model answers/paraphrases (in {language})
  answer_key_points array of key points (in {language})
  evaluation_rubric (string in {language})

Topic: {topic}
Context: {context}
JSON only:
"""

SUBJECTIVE_GRADING_PROMPT = """
You are a strict and fair examiner.
Grade the student's subjective answer.

Return JSON only with keys:
awarded_marks (number, 0 to max_marks),
feedback (short string),
missing_points (array of strings),
strengths (array of strings),
confidence (0-1 number)

Question: {question}
Max marks: {max_marks}
Valid answers: {valid_answers}
Key points: {key_points}
Rubric: {rubric}
Student answer: {student_answer}
"""

CHAPTER_EXTRACT_PROMPT = """You are analyzing a study document.
Extract all chapter titles, unit names, or major topic headings from the content below.
Return ONLY a JSON array of strings — no markdown, no explanation.
Each item should be a short, clean chapter/topic name (2-6 words max).
If no clear chapters exist, infer the main topics covered.
Return between 3 and 12 items.

Document content:
{context}

JSON array only:"""

SUMMARISE_PROMPT = """
You are an expert educator. Summarize the provided context in exactly 5 lines.
Each line should be a clear, concise point.
Include a real-time, practical example for each point if possible, otherwise use a simple example that a student or teacher can easily understand.

Context:
{context}

Format:
1. [Point 1] - Example: [Example 1]
2. [Point 2] - Example: [Example 2]
3. [Point 3] - Example: [Example 3]
4. [Point 4] - Example: [Example 4]
5. [Point 5] - Example: [Example 5]
"""

REGIONAL_SUMMARISE_PROMPT = """
You are an expert educator. Summarize the provided context in exactly 5 lines.
Each line should be a clear, concise point.
Include a real-time, practical example for each point if possible.

CRITICAL INSTRUCTION: You MUST write the summary ENTIRELY in the '{language}' language. Do not use English.

Context:
{context}

Format (but written in {language}):
1. [Point 1] - Example: [Example 1]
2. [Point 2] - Example: [Example 2]
...
"""

FLASHCARDS_PROMPT = """
You are an expert tutor. Generate exactly 10 comprehensive flashcard-style Question and Answer pairs from the provided context.
Ensure the questions cover the entire chapter/topic thoroughly.
Output EXACTLY valid JSON (no markdown).

Each item in the list should have:
"question": (string),
"answer": (string)

Context:
{context}

JSON array only:
"""

REGIONAL_FLASHCARDS_PROMPT = """
You are an expert tutor. Generate exactly 10 comprehensive flashcard-style Question and Answer pairs from the provided context.
Ensure the questions cover the entire chapter/topic thoroughly.
Output EXACTLY valid JSON (no markdown).

CRITICAL INSTRUCTION: You MUST write the flashcard questions and answers ENTIRELY in the '{language}' language. Do not output English.

Each item in the list should have:
"question": (string in {language}),
"answer": (string in {language})

Context:
{context}

JSON array only:
"""

MIXED_PRACTICE_GEN_PROMPT = """
You are a high-quality academic practice generator.
Generate exactly {count} distinct practice questions ONLY from the provided context.
Output EXACTLY valid JSON (no markdown).

Each item should have:
"question": (string),
"answer": (string),
"type": ("objective" | "subjective"),
"options": (object with A,B,C,D if objective, else null)

Context:
{context}

Topic: {topic}

JSON array only:
"""

PRACTICE_EVALUATION_PROMPT = """
You are an expert academic tutor. 
Evaluate the student's answer based on the model answer and context.

Return EXACTLY valid JSON with:
"score": (number from 0 to 10),
"feedback": (short explanation of the score),
"improvements": (specific suggestions for a better answer),
"is_correct": (boolean)

Question: {question}
Model Answer: {model_answer}
Student Answer: {student_answer}

JSON only:
"""

# ══════════════════════════════════════════════════════════════════════════
#  CURRICULUM METADATA (Indian Schooling)
# ══════════════════════════════════════════════════════════════════════════
def _build_curriculum():
    states_boards = {
        "National (NCERT)": ["CBSE"],
        "Andhra Pradesh": ["BSEAP"],
        "Bihar": ["BSEB (Bihar Board)", "CBSE"],
        "Delhi": ["CBSE"],
        "Gujarat": ["GSEB"],
        "Karnataka": ["KSEEB (Karnataka Board)"],
        "Kerala": ["KBPE"],
        "Maharashtra": ["MSBSHSE (Maharashtra Board)"],
        "Odisha": ["BSE (Odisha)"],
        "Punjab": ["PSEB"],
        "Rajasthan": ["RBSE"],
        "Tamil Nadu": ["TNBSE"],
        "Uttar Pradesh": ["UPMSP (UP Board)"],
        "West Bengal": ["WBBSE"]
    }
    
    data = {}
    for state, boards in states_boards.items():
        data[state] = {}
        for board in boards:
            data[state][board] = {}
            for i in range(1, 13):
                if i <= 5: 
                    subjs = ["Mathematics", "Environmental Studies", "English", "Local Language"]
                elif i <= 8: 
                    subjs = ["Mathematics", "Science", "Social Science", "English", "Local Language", "Hindi"]
                elif i <= 10: 
                    subjs = ["Mathematics", "Science", "Social Science", "English", "Local Language", "Hindi", "Sanskrit"]
                else: 
                    subjs = ["Physics", "Chemistry", "Biology", "Mathematics", "Computer Science", "English", "History", "Geography", "Economics", "Accountancy", "Business Studies", "Local Language"]
                
                data[state][board][f"Class {i}"] = subjs
    return data

CURRICULUM_DATA = _build_curriculum()

# ══════════════════════════════════════════════════════════════════════════
#  DATA LAYER (user/auth persistence)
# ══════════════════════════════════════════════════════════════════════════
def _hash(pw):    return hashlib.sha256(pw.encode()).hexdigest()
def _uid():       return "u" + uuid.uuid4().hex[:8]
def _now():       return datetime.utcnow().isoformat()
def _allowed(fn): return "." in fn and fn.rsplit(".", 1)[1].lower() in ALLOWED
def _safe(u):     return {k: v for k, v in u.items() if k != "pw_hash"}
def _grade(p):    return "A+" if p>=90 else "A" if p>=80 else "B" if p>=70 else "C" if p>=60 else "D" if p>=50 else "F"

def _default_db():
    return {
        "users": [
            {"id":"u1","name":"Alex Johnson","email":"student@edumind.com","pw_hash":_hash("password"),"role":"student","joined":"2025-11-10","docs":0,"status":"active"},
            {"id":"u2","name":"Dr. Sarah Chen","email":"tutor@edumind.com","pw_hash":_hash("password"),"role":"tutor","joined":"2025-10-01","docs":0,"status":"active"},
            {"id":"u3","name":"Admin User","email":"admin@edumind.com","pw_hash":_hash("password"),"role":"admin","joined":"2025-09-01","docs":0,"status":"active"},
        ],
        "documents": [], "activity": [],
        "settings": {
            "model":"gpt-4o","max_uploads_per_user":20,
            "student_self_register":True,"tutor_approval_required":False,
            "show_answer_explanations":True
        }
    }

# ── DB Layer Adaptation ───────────────────────────────────────────────────
def db_load():
    # 1. Try MongoDB FIRST - it's our source of truth in production
    if MONGO_OK:
        data = _mongo_load(M_PLATFORM, key="main_db")
        if data: 
            return data
    
    # 2. Fallback to JSON + Migrate IF it exists locally (dev mode)
    if DATA_F.exists():
        try: 
            d = json.loads(DATA_F.read_text())
            if MONGO_OK: 
                print("[MIGRATE] JSON -> MongoDB sync on startup")
                _mongo_save(M_PLATFORM, d, key="main_db")
            return d
        except: pass
    
    # 3. Last resort: Default empty DB
    print("[WARN] Using empty default database state")
    d = _default_db()
    if MONGO_OK: _mongo_save(M_PLATFORM, d, key="main_db")
    return d

def db_save(d):
    if MONGO_OK: 
        _mongo_save(M_PLATFORM, d, key="main_db")
    
    # Only write to local JSON if NOT on Vercel (read-only filesystem)
    if not IS_VERCEL:
        try:
            DATA_F.write_text(json.dumps(d, indent=2, default=str)) 
        except Exception as e:
            print(f"[DB] Local JSON write failed: {e}")

def db_log(db, uid, action, detail):
    db["activity"].insert(0, {"id":uuid.uuid4().hex[:6],"user_id":uid,"action":action,"detail":detail,"ts":_now()})
    db["activity"] = db["activity"][:200]

# ══════════════════════════════════════════════════════════════════════════
#  AUTH DECORATOR
# ══════════════════════════════════════════════════════════════════════════
def auth(roles=None):
    def dec(fn):
        @wraps(fn)
        def wrap(*a, **kw):
            tok = request.headers.get("Authorization","").replace("Bearer ","")
            uid = TOKENS.get(tok)
            if not uid and MONGO_OK:
                session = mongo_db[M_SESSIONS].find_one({"token": tok})
                if session:
                    uid = session["user_id"]
                    TOKENS[tok] = uid # Cache back to memory
            
            if not uid:
                print(f"[AUTH DEBUG] Token rejected: {tok[:6]}... (Reason: Token not found in memory or MongoDB)")
                return jsonify({"error":"Unauthorized"}), 401
            
            db  = db_load()
            u   = next((x for x in db["users"] if x["id"]==uid), None)
            if not u:
                print(f"[AUTH DEBUG] Token valid but user {uid} not in DB!")
                return jsonify({"error":"User not found"}), 401
            
            if u.get("status")=="suspended": 
                return jsonify({"error":"Suspended"}), 403
            
            if roles and u["role"] not in roles: 
                print(f"[AUTH DEBUG] User {uid} (role: {u['role']}) forbidden for roles {roles}")
                return jsonify({"error":"Forbidden"}), 403
            
            request.user = u
            return fn(*a, **kw)
        return wrap
    return dec

# ══════════════════════════════════════════════════════════════════════════
#  AUTH ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════
@app.post("/api/auth/login")
def login():
    b = request.json or {}
    db = db_load()
    u  = next((x for x in db["users"] if x["email"]==b.get("email","").lower()), None)
    if not u or u["pw_hash"]!=_hash(b.get("password","")): return jsonify({"error":"Invalid credentials"}),401
    if u.get("status")=="suspended": return jsonify({"error":"Suspended"}),403
    tok = uuid.uuid4().hex; TOKENS[tok]=u["id"]
    if MONGO_OK:
        mongo_db[M_SESSIONS].insert_one({"token": tok, "user_id": u["id"], "created_at": _now()})
    db_log(db,u["id"],"login",f"{u['name']} signed in"); db_save(db)
    return jsonify({"token":tok,"user":_safe(u)})

@app.post("/api/auth/signup")
def signup():
    b    = request.json or {}
    name = b.get("name","").strip(); email=b.get("email","").strip().lower()
    pw   = b.get("password","");    role=b.get("role","student")
    
    inst = b.get("institution", "").strip()
    roll = b.get("roll_number", "").strip()

    if not name or not email or not pw: return jsonify({"error":"All fields required"}),400
    if role not in ("student","tutor","teacher","school_admin"): role="student"
    db = db_load()
    if any(x["email"]==email for x in db["users"]): return jsonify({"error":"Email exists"}),409
    
    u = {"id":_uid(),"name":name,"email":email,"pw_hash":_hash(pw),
         "role":role, "institution": inst, "roll_number": roll,
         "joined":datetime.utcnow().strftime("%Y-%m-%d"),"docs":0,"status":"active"}
         
    db["users"].append(u); db_log(db,u["id"],"signup",f"{name} registered"); db_save(db)
    tok = uuid.uuid4().hex; TOKENS[tok]=u["id"]
    if MONGO_OK:
        mongo_db[M_SESSIONS].insert_one({"token": tok, "user_id": u["id"], "created_at": _now()})
    return jsonify({"token":tok,"user":_safe(u)}),201

@app.post("/api/auth/logout")
@auth()
def logout():
    tok = request.headers.get("Authorization","").replace("Bearer ","")
    TOKENS.pop(tok, None)
    if MONGO_OK:
        mongo_db[M_SESSIONS].delete_one({"token": tok})
    return jsonify({"ok":True})

@app.get("/api/auth/me")
@auth()
def me():
    return jsonify({"user":_safe(request.user)})

# ══════════════════════════════════════════════════════════════════════════
#  DOCUMENT UPLOAD / LIST / DELETE  (still stored in platform_data for UI)
# ══════════════════════════════════════════════════════════════════════════
def _dtype(ext):
    return {"pdf":"PDF","txt":"Text","md":"Text","mp3":"Audio","wav":"Audio",
            "m4a":"Audio","mp4":"Video","jpg":"Image","jpeg":"Image","png":"Image"}.get(ext,"File")

@app.post("/api/upload")
@auth()
def upload():
    u = request.user
    if "file" not in request.files: return jsonify({"error":"No file"}), 400
    f = request.files["file"]
    if not f or not _allowed(f.filename): return jsonify({"error":"Unsupported file type"}), 400

    ext  = f.filename.rsplit(".",1)[1].lower()
    fn   = secure_filename(f.filename)
    did  = uuid.uuid4().hex[:10]
    udir = UPL_DIR / u["id"]; udir.mkdir(exist_ok=True)
    spath = udir / f"{did}.{ext}"; f.save(str(spath))

    db = db_load()
    doc = {"id":did,"owner_id":u["id"],"name":fn,"ext":ext,"type":_dtype(ext),
           "size":spath.stat().st_size,"path":str(spath),"uploaded_at":_now(),"chunks":0,"chapters":[]}
    db["documents"].append(doc)

    # Index into a per-doc syllabus vector store
    chunks, chapters = _index_doc(spath, did, ext)
    doc["chunks"] = chunks; doc["chapters"] = chapters

    # Also register as a syllabus for testEdu-style API compatibility
    syllabus_name = request.form.get("syllabus_name", Path(fn).stem)
    syllabi_registry[did] = {
        "id": did, "name": syllabus_name, "files": [fn],
        "chunks": chunks, "chapters": chapters,
        "owner_id": u["id"], "created_at": _now()
    }
    _save_syllabi()
    db_log(db, u["id"], "upload", f"Uploaded {fn}"); db_save(db)
    return jsonify({"doc": doc, "syllabus_id": did, "chunks": chunks, "chapters": chapters}), 201

@app.get("/api/documents")
@auth()
def list_docs():
    db = db_load(); u = request.user
    docs = db["documents"] if u["role"]=="admin" else [d for d in db["documents"] if d["owner_id"]==u["id"]]
    return jsonify({"documents": docs})

@app.delete("/api/documents/<did>")
@auth()
def del_doc(did):
    db = db_load(); u = request.user
    doc = next((d for d in db["documents"] if d["id"]==did), None)
    if not doc: return jsonify({"error":"Not found"}), 404
    if doc["owner_id"]!=u["id"] and u["role"]!="admin": return jsonify({"error":"Forbidden"}), 403
    # remove uploaded file
    try: Path(doc["path"]).unlink(missing_ok=True)
    except: pass
    # remove vector store
    vdir = DB_DIR / did
    if vdir.exists(): shutil.rmtree(str(vdir))
    # remove from syllabi registry
    syllabi_registry.pop(did, None)
    qa_chains.pop(did, None); memories.pop(did, None)
    _save_syllabi()
    db["documents"] = [d for d in db["documents"] if d["id"]!=did]; db_save(db)
    return jsonify({"ok":True})

# ══════════════════════════════════════════════════════════════════════════
#  SYLLABI API  (testEdu native endpoints)
# ══════════════════════════════════════════════════════════════════════════
@app.get("/api/syllabi")
@auth()
def list_syllabi():
    u = request.user
    items = list(syllabi_registry.values())
    if u["role"] != "admin":
        items = [s for s in items if s.get("owner_id")==u["id"] or s.get("id","").startswith("gov_")]
    return jsonify({"syllabi": items})

@app.get("/api/syllabi/<syllabus_id>/chapters")
@auth()
def get_chapters(syllabus_id):
    s = syllabi_registry.get(syllabus_id)
    if not s: return jsonify({"error":"Syllabus not found"}), 404
    return jsonify({"syllabus_id": syllabus_id, "chapters": s.get("chapters",[])})

@app.delete("/api/syllabi/<syllabus_id>")
@auth()
def delete_syllabus(syllabus_id):
    if syllabus_id not in syllabi_registry: return jsonify({"error":"Not found"}), 404
    syllabi_registry.pop(syllabus_id, None)
    qa_chains.pop(syllabus_id, None); memories.pop(syllabus_id, None)
    _save_syllabi()
    vdir = DB_DIR / syllabus_id
    if vdir.exists(): shutil.rmtree(str(vdir))
    return jsonify({"success":True, "deleted":syllabus_id})

# ══════════════════════════════════════════════════════════════════════════
@app.post("/api/mentor-session")
@auth()
def video_explanation():
    data = request.json or {}
    syllabus_id = data.get("syllabus_id", "")
    topic = data.get("topic", "")

    if not syllabus_id or not topic:
        return jsonify({"error": "Syllabus ID and Topic required"}), 400

    try:
        vs = _load_vs(syllabus_id)
        retriever = vs.as_retriever(search_kwargs={"k": 5})
        docs = retriever.invoke(topic)
        context = "\n\n".join(d.page_content for d in docs)
    except Exception as e:
        print(f"[Video VS Fallback] {e}")
        context = "Use your knowledge as a teacher to explain this topic generally."

    prompt = VIDEO_EXPLAINER_PROMPT.replace("{topic}", topic).replace("{context}", context)
    script = _llm_json(prompt)
    
    if not isinstance(script, list):
        err_msg = script.get("error", "Unknown model error") if isinstance(script, dict) else "Model did not return a list"
        if isinstance(script, str) and script.startswith("ERROR:"):
            err_msg = script
        return jsonify({"error": f"Failed to generate video script - {err_msg}"}), 500

    return jsonify({"script": script})

@app.post("/api/curriculum/explain")
@auth()
def explain_topic():
    b = request.json or {}
    sid = b.get("syllabus_id")
    topic = b.get("topic")
    
    if not sid or not topic: return jsonify({"error": "Syllabus ID and Topic required"}), 400

    try:
        context_str = ""
        try:
            # Attempt to retrieve context from vector store
            vs = _load_vs(sid)
            retriever = vs.as_retriever(search_kwargs={"k": 3})
            docs = retriever.invoke(topic)
            context_str = "\n".join([d.page_content for d in docs])
        except Exception as ve:
            context_str = "No specific material found; use general expert knowledge."
            
        # Global ChatOpenAI is already imported at top from langchain_openai
        from langchain_core.messages import HumanMessage, SystemMessage
        
        llm = ChatOpenAI(model_name=os.getenv("OPENAI_MODEL", "gpt-4o-mini"), temperature=0.7, openai_api_key=OPENAI_API_KEY)
        
        sys_prompt = (
            "You are an enthusiastic British primary school teacher on the VidyAI platform, explaining topics to students aged 8-15. "
            "Your explanations are warm, clear, and engaging — like talking to a student face-to-face. "
            "Return ONLY a valid JSON object (no markdown) with this exact structure:\n"
            "{\n"
            "  \"plain_explanation\": \"A friendly 3-4 sentence introduction to the topic\",\n"
            "  \"examples\": \"2-3 concrete, vivid real-world examples that make the concept tangible. For maths, write out the actual calculation (e.g. 3 + 4 = 7). For science, describe what you can see or touch. Keep it conversational.\",\n"
            "  \"key_takeaways\": \"The 3 most important things to remember, written as a continuous spoken sentence separated by pauses (use ... between points).\",\n"
            "  \"summary\": \"A warm closing summary (2-3 sentences) that recaps the topic and encourages the student.\"\n"
            "}\n"
            "Write in plain spoken English — no bullet symbols, no markdown. Imagine you are speaking aloud."
        )
        
        user_prompt = f"Explain this topic to a student: {topic}. Context from textbook materials: {context_str}"
        
        messages = [SystemMessage(content=sys_prompt), HumanMessage(content=user_prompt)]
        res = llm.invoke(messages)
        
        import json as _json
        raw = res.content.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        try:
            parsed = _json.loads(raw)
            explanation_data = {
                "explanation": parsed.get("plain_explanation", "") or parsed.get("explanation", ""),
                "examples": parsed.get("examples", ""),
                "key_takeaways": parsed.get("key_takeaways", ""),
                "summary": parsed.get("summary", ""),
            }
        except Exception:
            # Fallback: treat entire response as plain explanation
            explanation_data = {"explanation": raw, "examples": "", "key_takeaways": "", "summary": ""}
        
        if raw.startswith("ERROR:"):
            return jsonify({"error": f"AI Error: {raw}"}), 500
            
        return jsonify(explanation_data)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to generate explanation: {str(e)}"}), 500

@app.post("/api/chat")
@auth()
def chat():
    b = request.json or {}
    question    = b.get("message", b.get("question", "")).strip()
    syllabus_id = b.get("doc_id", b.get("syllabus_id", "")).strip()
    u = request.user

    if not question: return jsonify({"error":"Empty message"}), 400

    if LANGCHAIN_OK and OPENAI_API_KEY:
        if syllabus_id and syllabus_id in syllabi_registry:
            try:
                chain  = _get_chain(syllabus_id)
                result = chain({"question": question})
                sources = list({
                    Path(d.metadata.get("source","")).name
                    for d in result.get("source_documents",[])
                })
                return jsonify({
                    "answer":       result["answer"],
                    "sources":      sources,
                    "syllabus_id":  syllabus_id,
                    "syllabus_name": syllabi_registry.get(syllabus_id,{}).get("name","")
                })
            except Exception as e:
                print(f"[Chat error] {e}")
                
        # Non-Syllabus General chat functionality 
        try:
            from langchain_core.messages import HumanMessage, SystemMessage
            # ChatOpenAI already imported at top
            sys_msg = SystemMessage(content=f"You are a helpful AI study assistant for the VidyAI Education platform. The user is a {u.get('role', 'student')}. Assist them professionally and educationally.")
            res = llm.invoke([sys_msg, HumanMessage(content=question)])
            return jsonify({
                "answer": res.content,
                "sources": [],
                "syllabus_id": "",
                "syllabus_name": "General Chat"
            })
        except Exception as e:
            print(f"[General Chat error] {e}")
            return jsonify({"error": f"[AI Model Error] Please check your OpenAI API key or connectivity. Detail: {e}"}), 500

    # Fallback if AI/API is off entirely
    DEMO = {"teacher":["Analysing your syllabus — I've identified 3 areas students commonly struggle with.",
                     "Strong theoretical depth. Add a real-world case study to improve student engagement."],
            "student":["Based on your materials, this concept involves building blocks.",
                       "Great question! Your materials explain this through a clear analogy. Want me to quiz you on this?"]}
    return jsonify({"answer":"(Demo Mode) " + random.choice(DEMO.get(u.get("role","student"), DEMO["student"])), "sources":[]})

# ══════════════════════════════════════════════════════════════════════════
#  CURRICULUM ENHANCEMENTS
# ══════════════════════════════════════════════════════════════════════════
@app.get("/api/curriculum/metadata")
@auth()
def get_curriculum_metadata():
    # Return curriculum data AND sync status for diagnostic purposes
    return jsonify({
        "metadata": CURRICULUM_DATA,
        "status": {
            "mongodb_connected": MONGO_OK,
            "openai_api_configured": bool(OPENAI_API_KEY),
            "persistence": "cloud" if MONGO_OK else "local_fallback"
        }
    })


@app.post("/api/curriculum/load")
@auth()
def load_curriculum_book():
    b = request.json or {}
    state   = b.get("state")
    board   = b.get("board")
    class_n = b.get("class") or b.get("year")
    subject = b.get("subject")
    u = request.user

    if not all([state, board, class_n, subject]):
        return jsonify({"error": "State, Board, Class, and Subject are required"}), 400

    # Mocking NCERT fetch logic
    # In a real app, we'd use a mapping of Subject/Class to NCERT PDF URLs or pre-downloaded local paths
    # For this demo, we'll simulate a book load by creating a dummy syllabus entry
    did = f"gov_{state.lower()}_{board.lower()}_{class_n.replace(' ','').lower()}_{subject.lower()}"
    
    # NCERT PDF URL builder — maps class+subject to correct NCERT textbook codes
    # NCERT URL pattern: https://ncert.nic.in/textbook/pdf/<code>.pdf
    # Codes: prefix = subject code, middle = class digits, suffix = part index
    ncert_urls = {
        # Science
        ("class6",  "science"):          "https://ncert.nic.in/textbook/pdf/hesc1dd.pdf",
        ("class7",  "science"):          "https://ncert.nic.in/textbook/pdf/hesc2dd.pdf",
        ("class8",  "science"):          "https://ncert.nic.in/textbook/pdf/hesc3dd.pdf",
        ("class9",  "science"):          "https://ncert.nic.in/textbook/pdf/iesc1dd.pdf",
        ("class10", "science"):          "https://ncert.nic.in/textbook/pdf/jesc101.pdf",
        ("class11", "physics"):          "https://ncert.nic.in/textbook/pdf/leph101.pdf",
        ("class12", "physics"):          "https://ncert.nic.in/textbook/pdf/leph201.pdf",
        ("class11", "chemistry"):        "https://ncert.nic.in/textbook/pdf/lech101.pdf",
        ("class12", "chemistry"):        "https://ncert.nic.in/textbook/pdf/lech201.pdf",
        ("class11", "biology"):          "https://ncert.nic.in/textbook/pdf/lebo101.pdf",
        ("class12", "biology"):          "https://ncert.nic.in/textbook/pdf/lebo201.pdf",
        # Mathematics
        ("class6",  "mathematics"):      "https://ncert.nic.in/textbook/pdf/hemh1dd.pdf",
        ("class7",  "mathematics"):      "https://ncert.nic.in/textbook/pdf/hemh2dd.pdf",
        ("class8",  "mathematics"):      "https://ncert.nic.in/textbook/pdf/hemh3dd.pdf",
        ("class9",  "mathematics"):      "https://ncert.nic.in/textbook/pdf/iemh1dd.pdf",
        ("class10", "mathematics"):      "https://ncert.nic.in/textbook/pdf/jemh101.pdf",
        ("class11", "mathematics"):      "https://ncert.nic.in/textbook/pdf/lemh101.pdf",
        ("class12", "mathematics"):      "https://ncert.nic.in/textbook/pdf/lemh201.pdf",
        # Social Science
        ("class6",  "social science"):   "https://ncert.nic.in/textbook/pdf/hess1dd.pdf",
        ("class7",  "social science"):   "https://ncert.nic.in/textbook/pdf/hess2dd.pdf",
        ("class8",  "social science"):   "https://ncert.nic.in/textbook/pdf/hess3dd.pdf",
        ("class9",  "social science"):   "https://ncert.nic.in/textbook/pdf/iess1dd.pdf",
        ("class10", "social science"):   "https://ncert.nic.in/textbook/pdf/jess101.pdf",
        # English
        ("class6",  "english"):          "https://ncert.nic.in/textbook/pdf/heen1dd.pdf",
        ("class7",  "english"):          "https://ncert.nic.in/textbook/pdf/heen2dd.pdf",
        ("class8",  "english"):          "https://ncert.nic.in/textbook/pdf/heen3dd.pdf",
        ("class9",  "english"):          "https://ncert.nic.in/textbook/pdf/ieen1dd.pdf",
        ("class10", "english"):          "https://ncert.nic.in/textbook/pdf/jeff101.pdf",
        # Hindi
        ("class6",  "hindi"):            "https://ncert.nic.in/textbook/pdf/hehn1dd.pdf",
        ("class7",  "hindi"):            "https://ncert.nic.in/textbook/pdf/hehn2dd.pdf",
        ("class8",  "hindi"):            "https://ncert.nic.in/textbook/pdf/hehn3dd.pdf",
        ("class9",  "hindi"):            "https://ncert.nic.in/textbook/pdf/iehn1dd.pdf",
        ("class10", "hindi"):            "https://ncert.nic.in/textbook/pdf/jhks101.pdf",
        # History / Geography / Economics / Polity (Class 11/12)
        ("class11", "history"):          "https://ncert.nic.in/textbook/pdf/lehs101.pdf",
        ("class12", "history"):          "https://ncert.nic.in/textbook/pdf/lehs201.pdf",
        ("class11", "geography"):        "https://ncert.nic.in/textbook/pdf/legy101.pdf",
        ("class12", "geography"):        "https://ncert.nic.in/textbook/pdf/legy201.pdf",
        ("class11", "economics"):        "https://ncert.nic.in/textbook/pdf/leec101.pdf",
        ("class12", "economics"):        "https://ncert.nic.in/textbook/pdf/leec201.pdf",
        ("class12", "accountancy"):      "https://ncert.nic.in/textbook/pdf/leac201.pdf",
        ("class12", "business studies"): "https://ncert.nic.in/textbook/pdf/lebs201.pdf",
        ("class11", "computer science"): "https://ncert.nic.in/textbook/pdf/lecs101.pdf",
        ("class12", "computer science"): "https://ncert.nic.in/textbook/pdf/lecs201.pdf",
    }

    subj_lower = subject.lower()
    # Normalize class key: "Class 10" → "class10"
    class_key = class_n.lower().replace(" ", "")
    pdf_url = ncert_urls.get((class_key, subj_lower))

    if not pdf_url:
        # Fallback: generate a placeholder PDF
        pdf_filename = f"{did}.pdf"
        pdf_path = UPL_DIR / pdf_filename
        if not pdf_path.exists():
            try:
                from reportlab.pdfgen import canvas
                from reportlab.lib.pagesizes import letter
                c = canvas.Canvas(str(pdf_path), pagesize=letter)
                c.setFont("Helvetica-Bold", 24)
                c.drawString(100, 700, f"Subject: {subject.title()}")
                c.setFont("Helvetica", 16)
                c.drawString(100, 650, f"Class: {class_n}")
                c.drawString(100, 600, f"Board: {board}")
                c.drawString(100, 550, f"State: {state}")
                c.drawString(100, 450, "This is a dynamically generated study material.")
                c.drawString(100, 420, "Please upload specific course materials for full insights.")
                c.save()
            except Exception as e:
                print(f"[PDF Generation Failed] {e}")
        pdf_url = f"/api/uploads/{pdf_filename}"


    # Check if already loaded — update pdf_url but always regenerate chapters for accuracy
    if did in syllabi_registry:
        syllabi_registry[did]["pdf_url"] = pdf_url
        # Fall through to regenerate accurate chapters below

    # ── Hardcoded NCERT/State-board chapter database (100% reliable, no LLM needed) ──
    CHAPTERS_DB = {
        # Science
        ("class6",  "science"): [
            "Chapter 1: Food: Where Does it Come From?", "Chapter 2: Components of Food",
            "Chapter 3: Fibre to Fabric", "Chapter 4: Sorting Materials into Groups",
            "Chapter 5: Separation of Substances", "Chapter 6: Changes Around Us",
            "Chapter 7: Getting to Know Plants", "Chapter 8: Body Movements",
            "Chapter 9: The Living Organisms and Their Surroundings", "Chapter 10: Motion and Measurement of Distances",
            "Chapter 11: Light, Shadows and Reflections", "Chapter 12: Electricity and Circuits",
            "Chapter 13: Fun with Magnets", "Chapter 14: Water",
            "Chapter 15: Air Around Us", "Chapter 16: Garbage In, Garbage Out"
        ],
        ("class7",  "science"): [
            "Chapter 1: Nutrition in Plants", "Chapter 2: Nutrition in Animals",
            "Chapter 3: Fibre to Fabric", "Chapter 4: Heat",
            "Chapter 5: Acids, Bases and Salts", "Chapter 6: Physical and Chemical Changes",
            "Chapter 7: Weather, Climate and Adaptations of Animals to Climate",
            "Chapter 8: Winds, Storms and Cyclones", "Chapter 9: Soil",
            "Chapter 10: Respiration in Organisms", "Chapter 11: Transportation in Animals and Plants",
            "Chapter 12: Reproduction in Plants", "Chapter 13: Motion and Time",
            "Chapter 14: Electric Current and its Effects", "Chapter 15: Light",
            "Chapter 16: Water: A Precious Resource", "Chapter 17: Forests: Our Lifeline",
            "Chapter 18: Wastewater Story"
        ],
        ("class8",  "science"): [
            "Chapter 1: Crop Production and Management", "Chapter 2: Microorganisms: Friend and Foe",
            "Chapter 3: Synthetic Fibres and Plastics", "Chapter 4: Materials: Metals and Non-metals",
            "Chapter 5: Coal and Petroleum", "Chapter 6: Combustion and Flame",
            "Chapter 7: Conservation of Plants and Animals", "Chapter 8: Cell — Structure and Functions",
            "Chapter 9: Reproduction in Animals", "Chapter 10: Reaching the Age of Adolescence",
            "Chapter 11: Force and Pressure", "Chapter 12: Friction",
            "Chapter 13: Sound", "Chapter 14: Chemical Effects of Electric Current",
            "Chapter 15: Some Natural Phenomena", "Chapter 16: Light",
            "Chapter 17: Stars and the Solar System", "Chapter 18: Pollution of Air and Water"
        ],
        ("class9",  "science"): [
            "Chapter 1: Matter in Our Surroundings", "Chapter 2: Is Matter Around Us Pure?",
            "Chapter 3: Atoms and Molecules", "Chapter 4: Structure of the Atom",
            "Chapter 5: The Fundamental Unit of Life", "Chapter 6: Tissues",
            "Chapter 7: Diversity in Living Organisms", "Chapter 8: Motion",
            "Chapter 9: Force and Laws of Motion", "Chapter 10: Gravitation",
            "Chapter 11: Work and Energy", "Chapter 12: Sound",
            "Chapter 13: Why Do We Fall Ill?", "Chapter 14: Natural Resources",
            "Chapter 15: Improvement in Food Resources"
        ],
        ("class10", "science"): [
            "Chapter 1: Chemical Reactions and Equations", "Chapter 2: Acids, Bases and Salts",
            "Chapter 3: Metals and Non-metals", "Chapter 4: Carbon and its Compounds",
            "Chapter 5: Periodic Classification of Elements", "Chapter 6: Life Processes",
            "Chapter 7: Control and Coordination", "Chapter 8: How do Organisms Reproduce?",
            "Chapter 9: Heredity and Evolution", "Chapter 10: Light — Reflection and Refraction",
            "Chapter 11: Human Eye and the Colourful World", "Chapter 12: Electricity",
            "Chapter 13: Magnetic Effects of Electric Current", "Chapter 14: Sources of Energy",
            "Chapter 15: Our Environment", "Chapter 16: Sustainable Management of Natural Resources"
        ],
        ("class11", "physics"): [
            "Chapter 1: Physical World", "Chapter 2: Units and Measurements",
            "Chapter 3: Motion in a Straight Line", "Chapter 4: Motion in a Plane",
            "Chapter 5: Laws of Motion", "Chapter 6: Work, Energy and Power",
            "Chapter 7: System of Particles and Rotational Motion", "Chapter 8: Gravitation",
            "Chapter 9: Mechanical Properties of Solids", "Chapter 10: Mechanical Properties of Fluids",
            "Chapter 11: Thermal Properties of Matter", "Chapter 12: Thermodynamics",
            "Chapter 13: Kinetic Theory", "Chapter 14: Oscillations", "Chapter 15: Waves"
        ],
        ("class12", "physics"): [
            "Chapter 1: Electric Charges and Fields", "Chapter 2: Electrostatic Potential and Capacitance",
            "Chapter 3: Current Electricity", "Chapter 4: Moving Charges and Magnetism",
            "Chapter 5: Magnetism and Matter", "Chapter 6: Electromagnetic Induction",
            "Chapter 7: Alternating Current", "Chapter 8: Electromagnetic Waves",
            "Chapter 9: Ray Optics and Optical Instruments", "Chapter 10: Wave Optics",
            "Chapter 11: Dual Nature of Radiation and Matter", "Chapter 12: Atoms",
            "Chapter 13: Nuclei", "Chapter 14: Semiconductor Electronics"
        ],
        ("class11", "chemistry"): [
            "Chapter 1: Some Basic Concepts of Chemistry", "Chapter 2: Structure of Atom",
            "Chapter 3: Classification of Elements and Periodicity in Properties",
            "Chapter 4: Chemical Bonding and Molecular Structure", "Chapter 5: States of Matter",
            "Chapter 6: Thermodynamics", "Chapter 7: Equilibrium",
            "Chapter 8: Redox Reactions", "Chapter 9: Hydrogen",
            "Chapter 10: The s-Block Elements", "Chapter 11: The p-Block Elements",
            "Chapter 12: Organic Chemistry — Some Basic Principles and Techniques",
            "Chapter 13: Hydrocarbons", "Chapter 14: Environmental Chemistry"
        ],
        ("class12", "chemistry"): [
            "Chapter 1: The Solid State", "Chapter 2: Solutions",
            "Chapter 3: Electrochemistry", "Chapter 4: Chemical Kinetics",
            "Chapter 5: Surface Chemistry", "Chapter 6: General Principles and Processes of Isolation of Elements",
            "Chapter 7: The p-Block Elements", "Chapter 8: The d-and f-Block Elements",
            "Chapter 9: Coordination Compounds", "Chapter 10: Haloalkanes and Haloarenes",
            "Chapter 11: Alcohols, Phenols and Ethers", "Chapter 12: Aldehydes, Ketones and Carboxylic Acids",
            "Chapter 13: Amines", "Chapter 14: Biomolecules",
            "Chapter 15: Polymers", "Chapter 16: Chemistry in Everyday Life"
        ],
        ("class11", "biology"): [
            "Chapter 1: The Living World", "Chapter 2: Biological Classification",
            "Chapter 3: Plant Kingdom", "Chapter 4: Animal Kingdom",
            "Chapter 5: Morphology of Flowering Plants", "Chapter 6: Anatomy of Flowering Plants",
            "Chapter 7: Structural Organisation in Animals", "Chapter 8: Cell — The Unit of Life",
            "Chapter 9: Biomolecules", "Chapter 10: Cell Cycle and Cell Division",
            "Chapter 11: Transport in Plants", "Chapter 12: Mineral Nutrition",
            "Chapter 13: Photosynthesis in Higher Plants", "Chapter 14: Respiration in Plants",
            "Chapter 15: Plant Growth and Development", "Chapter 16: Digestion and Absorption",
            "Chapter 17: Breathing and Exchange of Gases", "Chapter 18: Body Fluids and Circulation",
            "Chapter 19: Excretory Products and their Elimination", "Chapter 20: Locomotion and Movement",
            "Chapter 21: Neural Control and Coordination", "Chapter 22: Chemical Coordination and Integration"
        ],
        ("class12", "biology"): [
            "Chapter 1: Reproduction in Organisms", "Chapter 2: Sexual Reproduction in Flowering Plants",
            "Chapter 3: Human Reproduction", "Chapter 4: Reproductive Health",
            "Chapter 5: Principles of Inheritance and Variation", "Chapter 6: Molecular Basis of Inheritance",
            "Chapter 7: Evolution", "Chapter 8: Human Health and Disease",
            "Chapter 9: Strategies for Enhancement in Food Production",
            "Chapter 10: Microbes in Human Welfare", "Chapter 11: Biotechnology — Principles and Processes",
            "Chapter 12: Biotechnology and its Applications",
            "Chapter 13: Organisms and Populations", "Chapter 14: Ecosystem",
            "Chapter 15: Biodiversity and Conservation", "Chapter 16: Environmental Issues"
        ],
        # Mathematics
        ("class6",  "mathematics"): [
            "Chapter 1: Knowing Our Numbers", "Chapter 2: Whole Numbers",
            "Chapter 3: Playing with Numbers", "Chapter 4: Basic Geometrical Ideas",
            "Chapter 5: Understanding Elementary Shapes", "Chapter 6: Integers",
            "Chapter 7: Fractions", "Chapter 8: Decimals",
            "Chapter 9: Data Handling", "Chapter 10: Mensuration",
            "Chapter 11: Algebra", "Chapter 12: Ratio and Proportion",
            "Chapter 13: Symmetry", "Chapter 14: Practical Geometry"
        ],
        ("class7",  "mathematics"): [
            "Chapter 1: Integers", "Chapter 2: Fractions and Decimals",
            "Chapter 3: Data Handling", "Chapter 4: Simple Equations",
            "Chapter 5: Lines and Angles", "Chapter 6: The Triangle and its Properties",
            "Chapter 7: Congruence of Triangles", "Chapter 8: Comparing Quantities",
            "Chapter 9: Rational Numbers", "Chapter 10: Practical Geometry",
            "Chapter 11: Perimeter and Area", "Chapter 12: Algebraic Expressions",
            "Chapter 13: Exponents and Powers", "Chapter 14: Symmetry",
            "Chapter 15: Visualising Solid Shapes"
        ],
        ("class8",  "mathematics"): [
            "Chapter 1: Rational Numbers", "Chapter 2: Linear Equations in One Variable",
            "Chapter 3: Understanding Quadrilaterals", "Chapter 4: Practical Geometry",
            "Chapter 5: Data Handling", "Chapter 6: Squares and Square Roots",
            "Chapter 7: Cubes and Cube Roots", "Chapter 8: Comparing Quantities",
            "Chapter 9: Algebraic Expressions and Identities", "Chapter 10: Visualising Solid Shapes",
            "Chapter 11: Mensuration", "Chapter 12: Exponents and Powers",
            "Chapter 13: Direct and Inverse Proportions", "Chapter 14: Factorisation",
            "Chapter 15: Introduction to Graphs", "Chapter 16: Playing with Numbers"
        ],
        ("class9",  "mathematics"): [
            "Chapter 1: Number Systems", "Chapter 2: Polynomials",
            "Chapter 3: Coordinate Geometry", "Chapter 4: Linear Equations in Two Variables",
            "Chapter 5: Introduction to Euclid's Geometry", "Chapter 6: Lines and Angles",
            "Chapter 7: Triangles", "Chapter 8: Quadrilaterals",
            "Chapter 9: Areas of Parallelograms and Triangles", "Chapter 10: Circles",
            "Chapter 11: Constructions", "Chapter 12: Heron's Formula",
            "Chapter 13: Surface Areas and Volumes", "Chapter 14: Statistics",
            "Chapter 15: Probability"
        ],
        ("class10", "mathematics"): [
            "Chapter 1: Real Numbers", "Chapter 2: Polynomials",
            "Chapter 3: Pair of Linear Equations in Two Variables", "Chapter 4: Quadratic Equations",
            "Chapter 5: Arithmetic Progressions", "Chapter 6: Triangles",
            "Chapter 7: Coordinate Geometry", "Chapter 8: Introduction to Trigonometry",
            "Chapter 9: Some Applications of Trigonometry", "Chapter 10: Circles",
            "Chapter 11: Constructions", "Chapter 12: Areas Related to Circles",
            "Chapter 13: Surface Areas and Volumes", "Chapter 14: Statistics",
            "Chapter 15: Probability"
        ],
        ("class11", "mathematics"): [
            "Chapter 1: Sets", "Chapter 2: Relations and Functions",
            "Chapter 3: Trigonometric Functions", "Chapter 4: Principle of Mathematical Induction",
            "Chapter 5: Complex Numbers and Quadratic Equations", "Chapter 6: Linear Inequalities",
            "Chapter 7: Permutations and Combinations", "Chapter 8: Binomial Theorem",
            "Chapter 9: Sequences and Series", "Chapter 10: Straight Lines",
            "Chapter 11: Conic Sections", "Chapter 12: Introduction to Three Dimensional Geometry",
            "Chapter 13: Limits and Derivatives", "Chapter 14: Mathematical Reasoning",
            "Chapter 15: Statistics", "Chapter 16: Probability"
        ],
        ("class12", "mathematics"): [
            "Chapter 1: Relations and Functions", "Chapter 2: Inverse Trigonometric Functions",
            "Chapter 3: Matrices", "Chapter 4: Determinants",
            "Chapter 5: Continuity and Differentiability", "Chapter 6: Application of Derivatives",
            "Chapter 7: Integrals", "Chapter 8: Application of Integrals",
            "Chapter 9: Differential Equations", "Chapter 10: Vector Algebra",
            "Chapter 11: Three Dimensional Geometry", "Chapter 12: Linear Programming",
            "Chapter 13: Probability"
        ],
        # Social Science
        ("class10", "social science"): [
            "History Ch 1: The Rise of Nationalism in Europe",
            "History Ch 2: Nationalism in India",
            "History Ch 3: The Making of a Global World",
            "History Ch 4: The Age of Industrialisation",
            "History Ch 5: Print Culture and the Modern World",
            "Geography Ch 1: Resources and Development",
            "Geography Ch 2: Forest and Wildlife Resources",
            "Geography Ch 3: Water Resources",
            "Geography Ch 4: Agriculture",
            "Geography Ch 5: Minerals and Energy Resources",
            "Geography Ch 6: Manufacturing Industries",
            "Geography Ch 7: Lifelines of National Economy",
            "Political Science Ch 1: Power Sharing",
            "Political Science Ch 2: Federalism",
            "Political Science Ch 3: Democracy and Diversity",
            "Political Science Ch 4: Gender, Religion and Caste",
            "Political Science Ch 5: Popular Struggles and Movements",
            "Economics Ch 1: Development",
            "Economics Ch 2: Sectors of the Indian Economy",
            "Economics Ch 3: Money and Credit",
            "Economics Ch 4: Globalisation and the Indian Economy"
        ],
        ("class9",  "social science"): [
            "History Ch 1: The French Revolution",
            "History Ch 2: Socialism in Europe and the Russian Revolution",
            "History Ch 3: Nazism and the Rise of Hitler",
            "History Ch 4: Forest Society and Colonialism",
            "History Ch 5: Pastoralists in the Modern World",
            "Geography Ch 1: India — Size and Location",
            "Geography Ch 2: Physical Features of India",
            "Geography Ch 3: Drainage",
            "Geography Ch 4: Climate",
            "Geography Ch 5: Natural Vegetation and Wildlife",
            "Geography Ch 6: Population",
            "Political Science Ch 1: What is Democracy? Why Democracy?",
            "Political Science Ch 2: Constitutional Design",
            "Political Science Ch 3: Electoral Politics",
            "Political Science Ch 4: Working of Institutions",
            "Political Science Ch 5: Democratic Rights",
            "Economics Ch 1: The Story of Village Palampur",
            "Economics Ch 2: People as Resource",
            "Economics Ch 3: Poverty as a Challenge",
            "Economics Ch 4: Food Security in India"
        ],
        # English
        ("class10", "english"): [
            "First Flight Ch 1: A Letter to God", "First Flight Ch 2: Nelson Mandela — Long Walk to Freedom",
            "First Flight Ch 3: Two Stories About Flying", "First Flight Ch 4: From the Diary of Anne Frank",
            "First Flight Ch 5: The Hundred Dresses — I", "First Flight Ch 6: The Hundred Dresses — II",
            "First Flight Ch 7: Glimpses of India", "First Flight Ch 8: Mijbil the Otter",
            "First Flight Ch 9: Madam Rides the Bus", "First Flight Ch 10: The Sermon at Benares",
            "First Flight Ch 11: The Proposal",
            "Footprints Without Feet Ch 1: A Triumph of Surgery",
            "Footprints Without Feet Ch 2: The Thief's Story",
            "Footprints Without Feet Ch 3: The Midnight Visitor",
            "Footprints Without Feet Ch 4: A Question of Trust",
            "Footprints Without Feet Ch 5: Footprints Without Feet",
            "Footprints Without Feet Ch 6: The Making of a Scientist",
            "Footprints Without Feet Ch 7: The Necklace",
            "Footprints Without Feet Ch 8: The Hack Driver",
            "Footprints Without Feet Ch 9: Bholi",
            "Footprints Without Feet Ch 10: The Book That Saved the Earth"
        ],
        # Computer Science
        ("class11", "computer science"): [
            "Chapter 1: Computer Systems", "Chapter 2: Encoding Schemes and Number Systems",
            "Chapter 3: Emerging Trends", "Chapter 4: Problem Solving",
            "Chapter 5: Getting Started with Python", "Chapter 6: Flow of Control",
            "Chapter 7: Functions", "Chapter 8: Strings",
            "Chapter 9: Lists", "Chapter 10: Tuples and Dictionaries",
            "Chapter 11: Societal Impacts"
        ],
        ("class12", "computer science"): [
            "Chapter 1: Exception Handling", "Chapter 2: File Handling",
            "Chapter 3: Stack", "Chapter 4: Queue",
            "Chapter 5: Sorting", "Chapter 6: Searching",
            "Chapter 7: Understanding Data", "Chapter 8: Database Concepts",
            "Chapter 9: Structured Query Language (SQL)",
            "Chapter 10: Computer Networks", "Chapter 11: Societal Impacts"
        ],
        ("class12", "economics"): [
            "Part A — Introductory Microeconomics: Ch 1: Introduction",
            "Part A — Ch 2: Theory of Consumer Behaviour",
            "Part A — Ch 3: Production and Costs",
            "Part A — Ch 4: The Theory of the Firm under Perfect Competition",
            "Part A — Ch 5: Market Equilibrium",
            "Part A — Ch 6: Non-Competitive Markets",
            "Part B — Introductory Macroeconomics: Ch 1: Introduction to Macroeconomics",
            "Part B — Ch 2: National Income Accounting",
            "Part B — Ch 3: Money and Banking",
            "Part B — Ch 4: Determination of Income and Employment",
            "Part B — Ch 5: Government Budget and the Economy",
            "Part B — Ch 6: Open Economy Macroeconomics"
        ],
    }

    # Normalise keys
    class_key = class_n.lower().replace(" ", "")
    subj_key = subject.lower().strip()

    # 1. Try exact match in hardcoded DB
    chapters = CHAPTERS_DB.get((class_key, subj_key))

    # 2. LLM fallback for subjects not in DB (state-board-specific, vocational, etc.)
    if not chapters:
        try:
            prompt = f"""You are an expert on Indian school textbooks.
List the EXACT chapter titles from the official '{board}' textbook for '{subject}' - {class_n} in '{state}'.
Return ONLY a valid JSON array of strings, nothing else.
Example: ["Chapter 1: Title", "Chapter 2: Title"]
"""
            result = _llm_json(prompt, temperature=0.1)
            if isinstance(result, list) and len(result) > 0:
                chapters = [str(c).strip() for c in result]
        except Exception as e:
            print(f"[Chapter LLM Fallback] {e}")

    # 3. Generic fallback as last resort
    if not chapters:
        print(f"[Chapter Fallback] No chapters found for ({class_key}, {subj_key}). Using generic.")
        chapters = [
            f"Chapter 1: Introduction to {subject.title()}",
            f"Chapter 2: Fundamental Concepts of {subject.title()}",
            f"Chapter 3: Core Principles and Theory",
            f"Chapter 4: Practical Applications",
            f"Chapter 5: Advanced Topics",
            f"Chapter 6: Case Studies and Examples",
            f"Chapter 7: Review and Assessment"
        ]

    
    syllabi_registry[did] = {
        "id": did, "name": f"{board} {class_n} - {subject}", "files": [f"{subject}_textbook.pdf"],
        "chunks": 100, "chapters": chapters, "owner_id": u["id"], "created_at": _now(),
        "pdf_url": pdf_url
    }
    _save_syllabi()
    
    return jsonify({"syllabus_id": did, "chapters": chapters, "name": syllabi_registry[did]["name"], "pdf_url": pdf_url})

@app.post("/api/summarise")
@auth()
def summarise_chapter():
    b = request.json or {}
    sid = b.get("syllabus_id")
    topic = b.get("topic")
    subject = b.get("subject", "").lower()
    
    if not sid or not topic: return jsonify({"error": "Syllabus ID and Topic required"}), 400

    regional_langs = ["odia", "kannada", "hindi", "telugu", "gujarati", "marathi", "bengali", "punjabi", "tamil", "malayalam"]
    is_regional = any(lang in subject for lang in regional_langs)

    try:
        vs = _load_vs(sid)
        retriever = vs.as_retriever(search_kwargs={"k": 5})
        docs = retriever.invoke(topic)
        context = "\n\n".join(d.page_content for d in docs)
        
        # If no context (mock), use a generic LLM call or fall back
        if is_regional:
            prompt = REGIONAL_SUMMARISE_PROMPT.format(language=subject.title(), context=context if context else f"Summary of {topic}")
        else:
            prompt = SUMMARISE_PROMPT.format(context=context if context else f"Summary of {topic}")
            
        summary = _llm_text(prompt)
        return jsonify({"summary": summary})
    except Exception as e:
        # Fallback for mock/demo when VS setup might be incomplete
        if is_regional:
            prompt = REGIONAL_SUMMARISE_PROMPT.format(language=subject.title(), context=f"Comprehensive overview of {topic}")
        else:
            prompt = SUMMARISE_PROMPT.format(context=f"Comprehensive overview of {topic}")
            
        summary = _llm_text(prompt)
        return jsonify({"summary": summary})

@app.post("/api/flashcards")
@auth()
def generate_flashcards():
    b = request.json or {}
    sid = b.get("syllabus_id")
    topic = b.get("topic")
    subject = b.get("subject", "").lower()
    
    if not sid or not topic: return jsonify({"error": "Syllabus ID and Topic required"}), 400

    regional_langs = ["odia", "kannada", "hindi", "telugu", "gujarati", "marathi", "bengali", "punjabi", "tamil", "malayalam"]
    is_regional = any(lang in subject for lang in regional_langs)

    try:
        vs = _load_vs(sid)
        retriever = vs.as_retriever(search_kwargs={"k": 8})
        docs = retriever.invoke(topic)
        context = "\n\n".join(d.page_content for d in docs)
        
        if is_regional:
            prompt = REGIONAL_FLASHCARDS_PROMPT.format(language=subject.title(), context=context if context else f"Flashcards for {topic}")
        else:
            prompt = FLASHCARDS_PROMPT.format(context=context if context else f"Flashcards for {topic}")
            
        flashcards = _llm_json(prompt)
        if not isinstance(flashcards, list): raise Exception("Invalid JSON from LLM")
        return jsonify({"flashcards": flashcards})
    except Exception as e:
        # Fallback for mock/demo
        if is_regional:
            prompt = REGIONAL_FLASHCARDS_PROMPT.format(language=subject.title(), context=f"Detailed educational content for {topic}")
        else:
            prompt = FLASHCARDS_PROMPT.format(context=f"Detailed educational content for {topic}")
            
        flashcards = _llm_json(prompt)
        return jsonify({"flashcards": flashcards})

@app.post("/api/generate-answers")
@auth()
def generate_answers():
    b = request.json or {}
    sid = b.get("syllabus_id")
    question = b.get("question")
    if not sid or not question: return jsonify({"error": "Syllabus ID and Question required"}), 400

    try:
        chain = _get_chain(sid)
        result = chain({"question": question})
        return jsonify({"answer": result["answer"], "sources": [Path(d.metadata.get("source","")).name for d in result.get("source_documents",[])]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def _llm_text(prompt, temperature=0.7):
    """Simple wrapper for text LLM calls."""
    if not OPENAI_OK or not OPENAI_API_KEY:
        return "LLM integration not configured. Please add OPENAI_API_KEY."
    from openai import OpenAI
    client = OpenAI(api_key=OPENAI_API_KEY)
    try:
        res = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=2000
        )
        return res.choices[0].message.content
    except Exception as e:
        print(f"[OpenAI Error] {e}")
        return f"ERROR: {str(e)}"

def _clean_json(raw):
    """Refined JSON helper for raw strings."""
    if not raw or not isinstance(raw, str): return raw
    try:
        clean = re.sub(r"```(?:json)?|```", "", raw).strip()
        try: return json.loads(clean)
        except:
            for pat in [r"\[[\s\S]*\]", r"\{[\s\S]*\}"]:
                m = re.search(pat, clean)
                if m:
                    try: return json.loads(m.group(0))
                    except: pass
        return json.loads(clean)
    except:
        return {"error": "Failed to parse JSON", "raw": raw}

def _llm_json(prompt, temperature=0.2):
    """Prompts LLM and returns clean JSON."""
    raw = _llm_text(prompt, temperature)
    return _clean_json(raw)


# ══════════════════════════════════════════════════════════════════════════
#  GENERATE QUESTIONS  (exact testEdu endpoint)
# ══════════════════════════════════════════════════════════════════════════
@app.post("/api/generate-questions")
@auth()
def generate_questions():
    data = request.json or {}
    syllabus_id      = data.get("syllabus_id","").strip()
    topic            = data.get("topic","the uploaded material")
    chapters         = data.get("chapters",[])
    objective_count  = max(0, int(data.get("objective_count", data.get("count",5))))
    subjective_count = max(0, int(data.get("subjective_count",0)))
    obj_weight       = float(data.get("objective_weightage", data.get("marks",1)))
    subj_weight      = float(data.get("subjective_weightage", max(2.0, float(data.get("marks",2)))))
    dist             = data.get("difficulty_distribution",{})
    easy_pct   = int(dist.get("easy",40))
    medium_pct = int(dist.get("medium",40))
    hard_pct   = int(dist.get("hard",20))

    if not syllabus_id or syllabus_id not in syllabi_registry:
        return jsonify({"error":"Select a valid syllabus first"}), 400
    total = objective_count + subjective_count
    if total <= 0: return jsonify({"error":"Total questions must be > 0"}), 400

    single_diff = data.get("difficulty")
    if single_diff and single_diff.lower() in ["easy", "medium", "hard"]:
        easy_count = total if single_diff.lower() == "easy" else 0
        medium_count = total if single_diff.lower() == "medium" else 0
        hard_count = total if single_diff.lower() == "hard" else 0
    else:
        easy_count   = max(0, round((easy_pct/100)*total))
        medium_count = max(0, round((medium_pct/100)*total))
        hard_count   = max(0, total - easy_count - medium_count)

    topic_str = f"{topic} — chapters: {', '.join(chapters)}" if chapters else topic
    subject = data.get("subject", "").lower()
    
    regional_langs = ["odia", "kannada", "hindi", "telugu", "gujarati", "marathi", "bengali", "punjabi", "tamil", "malayalam"]
    is_regional = any(lang in subject for lang in regional_langs)

    try:
        try:
            vs        = _load_vs(syllabus_id)
            retriever = vs.as_retriever(search_kwargs={"k":8})
            docs      = retriever.invoke(topic_str)
            context   = "\n\n".join(d.page_content for d in docs)
        except Exception as _vs_err:
            print(f"[VS Fallback] Vector store not ready for {syllabus_id}: {_vs_err}")
            context   = f"Please use your general knowledge to generate high-quality academic questions for the topic: {topic_str}. The specific course materials are currently being processed, so rely on standard curriculum standards for this subject."

        # Safer formatting to prevent KeyError from context braces
        if is_regional:
            p_base = REGIONAL_MIXED_QUESTION_GEN_PROMPT.replace("{context}", context).replace("{topic}", topic_str)
            p_base = p_base.replace("{language}", subject.title())
        else:
            p_base = MIXED_QUESTION_GEN_PROMPT.replace("{context}", context).replace("{topic}", topic_str)
            
        prompt = p_base.format(
            total_count=total, 
            objective_count=objective_count, 
            subjective_count=subjective_count,
            easy_count=easy_count, 
            medium_count=medium_count, 
            hard_count=hard_count
        )
        
        questions = _llm_json(prompt, temperature=0.2)
        
        # If wrapped in "questions" key, extract it
        if isinstance(questions, dict) and "questions" in questions:
            questions = questions["questions"]
            
        if not isinstance(questions, list):
            err_msg = questions.get("error", "Unknown model error") if isinstance(questions, dict) else "Model did not return a list"
            if isinstance(questions, str) and questions.startswith("ERROR:"):
                err_msg = questions
            return jsonify({"error": f"Question generation failed — {err_msg}"}), 500
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Server Error: {str(e)}"}), 500

    normalized = []
    for i, q in enumerate(questions, start=1):
        qtype = q.get("type","objective")
        is_obj = (qtype=="objective")
        
        # Determine weightage based on request or default from AI
        weight = obj_weight if is_obj else subj_weight
        if "weightage" in q and q["weightage"]:
            try: weight = float(q["weightage"])
            except: pass

        normalized.append({
            "id":               i,
            "type":             qtype,
            "difficulty":       q.get("difficulty", "medium").title(),
            "marks":            weight,
            "question":         q.get("question", ""),
            "options":          q.get("options") if is_obj else None,
            "answer":           ", ".join(q.get("valid_answers", [])) if is_obj else (q.get("valid_answers", [""])[0] if q.get("valid_answers") else ""),
            "explanation":      q.get("explanation", ""),
            "evaluation_criteria": q.get("evaluation_rubric") or ", ".join(q.get("answer_key_points", []))
        })

    exam_id = uuid.uuid4().hex[:10]
    exam_payload = {
        "exam_id": exam_id,
        "created_at": _now(),
        "syllabus_id": syllabus_id,
        "syllabus_name": syllabi_registry[syllabus_id]["name"],
        "topic": topic_str,
        "chapters": chapters,
        "difficulty_distribution": {"easy":easy_pct,"medium":medium_pct,"hard":hard_pct},
        "objective_count": objective_count,
        "subjective_count": subjective_count,
        "questions": normalized
    }
    exams_registry[exam_id] = exam_payload
    _save_json(EXAMS_DIR / f"{exam_id}.json", exam_payload)
    _save_exams()

    return jsonify({
        "exam_id": exam_id, "questions": normalized, "topic": topic_str,
        "total_marks": sum(float(q["marks"]) for q in normalized),
        "difficulty_distribution": {"easy":easy_pct,"medium":medium_pct,"hard":hard_pct},
        "objective_count": objective_count, "subjective_count": subjective_count,
        "syllabus_id": syllabus_id, "syllabus_name": syllabi_registry[syllabus_id]["name"]
    })

# ══════════════════════════════════════════════════════════════════════════
#  PRACTICE MODE ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════

@app.post("/api/curriculum/practice/generate")
@auth()
def generate_practice():
    data    = request.json or {}
    sid     = data.get("syllabus_id", "").strip()
    topic   = data.get("topic", "the material")
    count   = int(data.get("count", 10))

    if not sid or sid not in syllabi_registry:
        return jsonify({"error": "Select a valid syllabus first"}), 400

    try:
        vs        = _load_vs(sid)
        retriever = vs.as_retriever(search_kwargs={"k": 5})
        docs      = retriever.invoke(topic)
        ctx       = "\n\n".join(d.page_content for d in docs)
        
        prompt = MIXED_PRACTICE_GEN_PROMPT.format(
            count=count,
            context=ctx,
            topic=topic
        )
        
        raw  = _get_llm().invoke(prompt).content
        data = _clean_json(raw)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.post("/api/curriculum/practice/evaluate")
@auth()
def evaluate_practice():
    data      = request.json or {}
    question  = data.get("question", "")
    model_ans = data.get("model_answer", "")
    stud_ans  = data.get("student_answer", "")

    if not question or not stud_ans:
        return jsonify({"error": "Missing question or answer"}), 400

    try:
        prompt = PRACTICE_EVALUATION_PROMPT.format(
            question=question,
            model_answer=model_ans,
            student_answer=stud_ans
        )
        
        raw  = _get_llm().invoke(prompt).content
        res  = _clean_json(raw)
        return jsonify(res)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Legacy alias — /api/questions/generate used by the synapseAI frontend
@app.post("/api/questions/generate")
@auth()
def gen_qs_legacy():
    """Translate legacy body format into testEdu format and generate questions directly."""
    b = request.json or {}
    easy  = int(b.get("easy",3))
    med   = int(b.get("medium",3))
    hard  = int(b.get("hard",2))
    total = easy + med + hard
    qtype = b.get("type","obj")
    if qtype=="obj":   obj_count=total;   subj_count=0
    elif qtype=="subj":obj_count=0;        subj_count=total
    else:              obj_count=total//2; subj_count=total-total//2

    marks     = float(b.get("marks_per_q",1))
    syllabus_id = b.get("doc_id","").strip()
    topic     = b.get("subject","General")
    chapters  = b.get("chapters",[])

    if not syllabus_id or syllabus_id not in syllabi_registry:
        return jsonify({"error":"Select a valid syllabus/document first"}), 400
    if total <= 0:
        return jsonify({"error":"Total questions must be > 0"}), 400

    easy_count   = easy
    medium_count = med
    hard_count   = hard
    topic_str    = f"{topic} — chapters: {', '.join(chapters)}" if chapters else topic

    try:
        vs        = _load_vs(syllabus_id)
        retriever = vs.as_retriever(search_kwargs={"k":8})
        docs      = retriever.invoke(topic_str)
        context   = "\n\n".join(d.page_content for d in docs)
        prompt    = MIXED_QUESTION_GEN_PROMPT.format(
            total_count=total, objective_count=obj_count, subjective_count=subj_count,
            easy_count=easy_count, medium_count=medium_count, hard_count=hard_count,
            topic=topic_str, context=context
        )
        questions = _llm_json(prompt, temperature=0.2)
        if not isinstance(questions, list):
            return jsonify({"error":"LLM did not return a question list"}), 500
    except Exception as e:
        print(f"[Legacy QGen error] {e}")
        return jsonify({"error":str(e)}), 500

    normalized = []
    for i, q in enumerate(questions, start=1):
        qtype2 = q.get("type","objective")
        is_obj = (qtype2=="objective")
        subj_marks = marks * 2 if marks < 2 else marks
        normalized.append({
            "id":               i,
            "type":             qtype2,
            "difficulty":       q.get("difficulty","medium"),
            "weightage":        marks if is_obj else subj_marks,
            "marks":            marks if is_obj else subj_marks,
            "question":         q.get("question",""),
            "options":          q.get("options",{}) if is_obj else None,
            "valid_answers":    q.get("valid_answers",[]),
            "answer":           (q.get("valid_answers",[""])[0] if q.get("valid_answers") else ""),
            "explanation":      q.get("explanation",""),
            "answer_key_points":q.get("answer_key_points",[]),
            "evaluation_rubric":q.get("evaluation_rubric","")
        })

    exam_id = uuid.uuid4().hex[:10]
    u = request.user
    
    # Restrict answer visibility to Teacher/Tutor
    if u.get("role") == "student":
        for q in normalized:
            q.pop("answer", None)
            q.pop("valid_answers", None)
            q.pop("explanation", None)
            q.pop("answer_key_points", None)
            q.pop("evaluation_rubric", None)

    exam_payload = {
        "exam_id": exam_id, "created_at": _now(),
        "owner_id": u["id"],
        "syllabus_id": syllabus_id,
        "syllabus_name": syllabi_registry[syllabus_id]["name"],
        "topic": topic_str, "chapters": chapters,
        "objective_count": obj_count, "subjective_count": subj_count,
        "questions": normalized
    }
    exams_registry[exam_id] = exam_payload
    _save_json(EXAMS_DIR / f"{exam_id}.json", exam_payload); _save_exams()
    return jsonify({"questions": normalized, "exam_id": exam_id, "syllabus_id": syllabus_id})

@app.get("/api/questions")
@auth()
def list_exams():
    u = request.user
    exams = list(exams_registry.values())
    
    # Ensure students only see their own exams or public ones (if applicable in your logic)
    # and strip answers from them
    if u["role"] == "student":
        exams = [e.copy() for e in exams if e.get("owner_id") == u["id"]]
        for e in exams:
            e["questions"] = [q.copy() for q in e.get("questions", [])]
            for q in e["questions"]:
                q.pop("answer", None)
                q.pop("valid_answers", None)
                q.pop("explanation", None)
                q.pop("answer_key_points", None)
                q.pop("evaluation_rubric", None)
    elif u["role"] != "school_admin":
        exams = [e for e in exams if e.get("owner_id") == u["id"]]
        
    return jsonify({"exams": exams})

@app.post("/api/exams/save")
@auth(roles=["tutor", "school_admin"])
def save_exam_bank():
    data = request.json or {}
    eid = data.get("exam_id") or uuid.uuid4().hex[:10]
    u = request.user
    
    payload = {
        "exam_id": eid,
        "updated_at": _now(),
        "created_at": data.get("created_at", _now()),
        "owner_id": u["id"],
        "syllabus_id": data.get("syllabus_id"),
        "syllabus_name": data.get("syllabus_name", "Unknown"),
        "topic": data.get("topic", "Custom Bank"),
        "questions": data.get("questions", []),
        "objective_count": len([q for q in data.get("questions", []) if q.get("type") == "objective"]),
        "subjective_count": len([q for q in data.get("questions", []) if q.get("type") == "subjective"])
    }
    
    exams_registry[eid] = payload
    _save_json(EXAMS_DIR / f"{eid}.json", payload)
    _save_exams()
    return jsonify({"ok": True, "exam_id": eid})

@app.delete("/api/exams/<exam_id>")
@auth(roles=["tutor", "school_admin"])
def delete_exam(exam_id):
    u = request.user
    if exam_id not in exams_registry: return jsonify({"error": "Not found"}), 404
    
    # Permission check
    if u["role"] != "school_admin" and exams_registry[exam_id].get("owner_id") != u["id"]:
        return jsonify({"error": "Forbidden"}), 403
        
    exams_registry.pop(exam_id)
    p = EXAMS_DIR / f"{exam_id}.json"
    if p.exists(): p.unlink()
    _save_exams()
    return jsonify({"ok": True})

# ══════════════════════════════════════════════════════════════════════════
#  EXAM ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════
def _load_exam(exam_id):
    if exam_id in exams_registry:
        return exams_registry[exam_id]
    p = EXAMS_DIR / f"{exam_id}.json"
    if p.exists():
        e = _load_json(p, {})
        if e: exams_registry[exam_id] = e
        return e or None
    return None

@app.get("/api/exams/<exam_id>")
@auth()
def get_exam(exam_id):
    e = _load_exam(exam_id)
    if not e: return jsonify({"error":"Exam not found"}), 404
    return jsonify(e)

@app.get("/api/exams/<exam_id>/answer-key")
@auth(roles=["tutor","admin"])
def exam_answer_key(exam_id):
    e = _load_exam(exam_id)
    if not e: return jsonify({"error":"Exam not found"}), 404
    key = [{"question_id":q["id"],"type":q["type"],"valid_answers":q.get("valid_answers",[]),
             "answer_key_points":q.get("answer_key_points",[]),"explanation":q.get("explanation",""),
             "weightage":q.get("weightage",0)} for q in e.get("questions",[])]
    return jsonify({"exam_id":exam_id,"syllabus_name":e.get("syllabus_name",""),"answer_key":key})

@app.get("/api/exams/<exam_id>/idle-sheet")
@auth()
def idle_sheet(exam_id):
    e = _load_exam(exam_id)
    if not e: return jsonify({"error":"Exam not found"}), 404
    lines = [
        f"Exam ID: {exam_id}", f"Syllabus: {e.get('syllabus_name','')}",
        "Student Name: ___________________", "Roll No: ___________________", "",
        "Instructions: Write answers as 'Q<number>: your answer'.", ""
    ]
    for q in e.get("questions",[]):
        lines.append(f"Q{q['id']} ({q['type']}, {q.get('weightage',1)} mark(s)): {q['question']}")
        if q.get("type")=="objective":
            opts = q.get("options",{})
            for k in ["A","B","C","D"]:
                if k in opts: lines.append(f"  {k}. {opts[k]}")
            lines.append("Answer: __________\n")
        else:
            lines.extend(["Answer:","","","",""])
    text = "\n".join(lines)
    out  = UPL_DIR / f"idle_sheet_{exam_id}.txt"
    out.write_text(text, encoding="utf-8")
    return jsonify({"exam_id":exam_id,"idle_sheet_text":text,"idle_sheet_path":str(out)})

# ══════════════════════════════════════════════════════════════════════════
#  EVALUATION ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════
@app.post("/api/exams/<exam_id>/evaluate")
@auth()
def evaluate_exam_sheet(exam_id):
    e = _load_exam(exam_id)
    if not e: return jsonify({"error":"Exam not found"}), 404
    if "answer_sheet" not in request.files: return jsonify({"error":"answer_sheet file required"}), 400
    f = request.files["answer_sheet"]; roll_no = request.form.get("roll_no","")
    if not f or not _allowed(f.filename): return jsonify({"error":"Unsupported file"}), 400
    fn   = secure_filename(f.filename)
    path = UPL_DIR / f"{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}_{fn}"
    f.save(str(path))

    answers, mode = _extract_answers(str(path))
    if not answers:
        return jsonify({"error":"Could not extract answers","extraction_mode":mode}), 400

    result = _evaluate_answers(e, answers, roll_no)
    eval_id = uuid.uuid4().hex[:10]
    payload = {
        "evaluation_id":eval_id,"exam_id":exam_id,"created_at":_now(),
        "file_name":fn,"extraction_mode":mode,"submitted_answers":answers,"result":result
    }
    evaluations_registry[eval_id] = payload
    _save_json(EVAL_DIR / f"{eval_id}.json", payload); _save_evals()
    return jsonify(payload)

@app.post("/api/exams/<exam_id>/bulk-evaluate")
@auth(roles=["tutor", "school_admin"])
def bulk_evaluate(exam_id):
    e = _load_exam(exam_id)
    if not e: return jsonify({"error":"Exam not found"}), 404
    files = request.files.getlist("answer_sheets")
    if not files: return jsonify({"error":"answer_sheets required"}), 400

    results=[]; failures=[]
    for f in files:
        if not f or not _allowed(f.filename):
            failures.append({"file":getattr(f,"filename",""),"error":"unsupported"}); continue
        fn   = secure_filename(f.filename)
        path = UPL_DIR / f"{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}_{fn}"
        f.save(str(path))
        answers, mode = _extract_answers(str(path))
        if not answers:
            failures.append({"file":fn,"error":f"unable_to_extract ({mode})"}); continue
        m = re.search(r"(?:roll[_\- ]?no[_\- ]?)?(\d+)", fn, flags=re.IGNORECASE)
        roll = request.form.get(f"roll_no_{fn}","") or (m.group(1) if m else fn)
        res = _evaluate_answers(e, answers, roll)
        eval_id = uuid.uuid4().hex[:10]
        payload = {"evaluation_id":eval_id,"exam_id":exam_id,"created_at":_now(),
                   "file_name":fn,"extraction_mode":mode,"submitted_answers":answers,"result":res}
        evaluations_registry[eval_id] = payload
        _save_json(EVAL_DIR / f"{eval_id}.json", payload)
        results.append({"evaluation_id":eval_id,"roll_no":roll,
                         "student_name": f"Student {roll}", # Mock name
                         "class_name": e.get("syllabus_name", "Unknown Class"),
                         "percentage":res.get("percentage",0),
                         "is_pass": res.get("is_pass", False),
                         "total_awarded":res.get("total_awarded",0),
                         "total_possible":res.get("total_possible",0)})
    _save_evals()
    bulk_id = uuid.uuid4().hex[:10]
    bp = {"bulk_id":bulk_id,"exam_id":exam_id,"created_at":_now(),"results":results,"failures":failures}
    bulk_evaluations_registry[bulk_id] = bp
    _save_json(BULK_DIR / f"{bulk_id}.json", bp); _save_bulk()
    return jsonify(bp)

@app.get("/api/evaluations/<eval_id>")
@auth()
def get_evaluation(eval_id):
    ev = evaluations_registry.get(eval_id) or _load_json(EVAL_DIR / f"{eval_id}.json", {})
    if not ev: return jsonify({"error":"Not found"}), 404
    evaluations_registry[eval_id] = ev
    return jsonify(ev)

@app.post("/api/evaluations/<eval_id>/audit")
@auth(roles=["tutor", "school_admin"])
def audit_evaluation(eval_id):
    ev = evaluations_registry.get(eval_id) or _load_json(EVAL_DIR / f"{eval_id}.json", {})
    if not ev: return jsonify({"error":"Not found"}), 404
    ex = _load_exam(ev.get("exam_id",""))
    if not ex: return jsonify({"error":"Exam not found"}), 404
    audit = _run_audit(ex, ev.get("result",{}))
    ev["audit"] = {"run_at":_now(), **audit}
    evaluations_registry[eval_id] = ev
    _save_json(EVAL_DIR / f"{eval_id}.json", ev); _save_evals()
    return jsonify({"evaluation_id":eval_id,"audit":ev["audit"]})

@app.put("/api/evaluations/<eval_id>/marks")
@auth(roles=["tutor", "school_admin"])
def update_marks(eval_id):
    ev = evaluations_registry.get(eval_id) or _load_json(EVAL_DIR / f"{eval_id}.json", {})
    if not ev: return jsonify({"error":"Not found"}), 404
    data = request.json or {}
    patches = data.get("question_marks",[])
    if not patches: return jsonify({"error":"question_marks list required"}), 400
    result = _apply_marks_override(ev.get("result",{}), patches)
    ev["result"] = result
    ev["manual_update"] = {"updated_at":_now(),"updated_by":data.get("updated_by","tutor"),"reason":data.get("reason","adjustment")}
    evaluations_registry[eval_id] = ev
    _save_json(EVAL_DIR / f"{eval_id}.json", ev); _save_evals()
    return jsonify(ev)

@app.get("/api/exams/<exam_id>/analytics")
@auth(roles=["tutor", "school_admin"])
def get_exam_analytics(exam_id):
    evals = [v for k,v in evaluations_registry.items() if v.get("exam_id") == exam_id]
    if not evals: return jsonify({"error": "No evaluations found"}), 404
    
    total_students = len(evals)
    q_stats = {} # q_index -> {awarded, possible, count}
    
    for ev in evals:
        res = ev.get("result", {})
        for i, q_res in enumerate(res.get("questions", [])):
            if i not in q_stats: q_stats[i] = {"awarded": 0, "possible": 0, "count": 0}
            q_stats[i]["awarded"] += q_res.get("awarded", 0)
            q_stats[i]["possible"] += q_res.get("possible", 0)
            q_stats[i]["count"] += 1
            
    gaps = []
    for i, stats in q_stats.items():
        avg = (stats["awarded"] / stats["possible"]) * 100 if stats["possible"] > 0 else 0
        if avg < 50:
            gaps.append({"index": i, "average": round(avg, 1)})
            
    top_performers = []
    sorted_evals = sorted(evals, key=lambda x: x.get("result", {}).get("percentage", 0), reverse=True)
    for ev in sorted_evals[:5]:
        top_performers.append({
            "roll_no": ev.get("result", {}).get("roll_no", "N/A"),
            "percentage": ev.get("result", {}).get("percentage", 0),
            "grade": ev.get("result", {}).get("grade", "N/A")
        })

    return jsonify({
        "total_evaluations": total_students,
        "class_average": round(sum(e.get("result",{}).get("percentage",0) for e in evals)/total_students, 2),
        "learning_gaps": gaps,
        "top_performers": top_performers
    })

@app.get("/api/evaluations/<eval_id>/report-snapshot")
@auth()
def get_report_snapshot(eval_id):
    ev = evaluations_registry.get(eval_id) or _load_json(EVAL_DIR / f"{eval_id}.json", {})
    if not ev: return jsonify({"error": "Not found"}), 404
    
    res = ev.get("result", {})
    summary = f"Student Performance Snapshot - {ev.get('file_name','')}\n"
    summary += f"Score: {res.get('total_awarded')}/{res.get('total_possible')} ({res.get('percentage')}%) - Grade: {res.get('grade')}\n\n"
    
    for i, q in enumerate(res.get("questions", [])):
        summary += f"Question {i+1}: {'✅ Correct' if q.get('awarded') == q.get('possible') else '❌ Needs Review'}\n"
        if q.get("feedback"): summary += f"Feedback: {q.get('feedback')}\n"
        
    return jsonify({
        "evaluation_id": eval_id,
        "summary_text": summary,
        "grade": res.get("grade")
    })

@app.post("/api/evaluations/<eval_id>/send-report")
@auth(roles=["teacher", "school_admin", "tutor"])
def send_report_to_parent(eval_id):
    ev = evaluations_registry.get(eval_id) or _load_json(EVAL_DIR / f"{eval_id}.json", {})
    if not ev: return jsonify({"error": "Evaluation Not found"}), 404
    
    data = request.json or {}
    email = data.get("email")
    if not email: return jsonify({"error": "Parent email is required"}), 400
    
    # Mocking the Email Sent functionality
    print(f"\n[EMAIL MOCK] 📩 Sending Student Report to: {email}")
    print(f"[EMAIL MOCK] Subject: Exam Results for {ev.get('result', {}).get('roll_no', 'Student')}")
    print(f"[EMAIL MOCK] Marks: {ev.get('result', {}).get('total_awarded')} / {ev.get('result', {}).get('total_possible')}")
    print(f"[EMAIL MOCK] Pass Status: {'✅ PASS' if ev.get('result', {}).get('is_pass') else '❌ FAIL'}")
    print(f"[EMAIL MOCK] Improvement Area: {ev.get('result', {}).get('improvement_prediction', 'N/A')}\n")
    
    return jsonify({"success": True, "message": f"Report successfully simulated sending to {email}"})

@app.post("/api/bulk-evaluations/<bulk_id>/accuracy")
@auth(roles=["teacher", "school_admin"])
def bulk_accuracy(bulk_id):
    bp = bulk_evaluations_registry.get(bulk_id) or _load_json(BULK_DIR / f"{bulk_id}.json", {})
    if not bp: return jsonify({"error":"Not found"}), 404
    ex = _load_exam(bp.get("exam_id",""))
    if not ex: return jsonify({"error":"Exam not found"}), 404
    audits=[]
    for item in bp.get("results",[]):
        ev = evaluations_registry.get(item["evaluation_id"]) or _load_json(EVAL_DIR / f"{item['evaluation_id']}.json", {})
        if not ev: continue
        a = _run_audit(ex, ev.get("result",{}))
        audits.append({"evaluation_id":item["evaluation_id"],"roll_no":ev.get("result",{}).get("roll_no",""),
                        "consistency_score":a.get("consistency_score",0),"inconsistency_count":len(a.get("inconsistencies",[]))})
    overall = round(sum(a["consistency_score"] for a in audits)/len(audits),2) if audits else 0.0
    resp = {"bulk_id":bulk_id,"audited_count":len(audits),"overall_consistency_score":overall,"audits":audits}
    bp["accuracy_audit"] = resp
    bulk_evaluations_registry[bulk_id] = bp
    _save_json(BULK_DIR / f"{bulk_id}.json", bp); _save_bulk()
    return jsonify(resp)

# Legacy eval endpoints kept for frontend compatibility
@app.post("/api/evaluate/single")
@auth(roles=["tutor","admin"])
def eval_single_legacy():
    return jsonify({"error":"Use POST /api/exams/<exam_id>/evaluate instead"}), 400

@app.get("/api/evaluate")
@auth()
def list_evals():
    u = request.user
    evals = list(evaluations_registry.values())
    if u["role"]!="admin":
        allowed = {sid for sid,s in syllabi_registry.items() if s.get("owner_id")==u["id"]}
        evals = [e for e in evals if e.get("exam_id") and
                 exams_registry.get(e["exam_id"],{}).get("syllabus_id") in allowed]
    return jsonify({"evaluations": evals})

# ══════════════════════════════════════════════════════════════════════════
#  STATUS
# ══════════════════════════════════════════════════════════════════════════
@app.get("/api/status")
def status():
    return jsonify({
        "ready":            len(syllabi_registry)>0,
        "langchain":        LANGCHAIN_OK,
        "openai":           bool(OPENAI_API_KEY),
        "syllabus_count":   len(syllabi_registry),
        "exam_count":       len(exams_registry),
        "evaluation_count": len(evaluations_registry),
    })

# ══════════════════════════════════════════════════════════════════════════
#  ADMIN ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════
@app.get("/api/admin/users")
@auth(roles=["admin"])
def a_users():
    db=db_load(); role=request.args.get("role","")
    us=db["users"] if not role else [u for u in db["users"] if u["role"]==role]
    return jsonify({"users":[_safe(u) for u in us]})

@app.post("/api/admin/users")
@auth(roles=["admin"])
def a_add_user():
    b=request.json or {}; db=db_load(); email=b.get("email","").strip().lower()
    if any(u["email"]==email for u in db["users"]): return jsonify({"error":"Email exists"}),409
    u={"id":_uid(),"name":b.get("name",""),"email":email,"pw_hash":_hash(b.get("password","password123")),
       "role":b.get("role","student"),"joined":datetime.utcnow().strftime("%Y-%m-%d"),"docs":0,"status":"active"}
    db["users"].append(u); db_save(db)
    return jsonify({"user":_safe(u)}),201

@app.patch("/api/admin/users/<uid>")
@auth(roles=["admin"])
def a_upd_user(uid):
    db=db_load(); u=next((x for x in db["users"] if x["id"]==uid),None)
    if not u: return jsonify({"error":"Not found"}),404
    b=request.json or {}
    for k in ("name","role","status"):
        if k in b: u[k]=b[k]
    if "password" in b: u["pw_hash"]=_hash(b["password"])
    db_save(db); return jsonify({"user":_safe(u)})

@app.delete("/api/admin/users/<uid>")
@auth(roles=["admin"])
def a_del_user(uid):
    db=db_load(); db["users"]=[u for u in db["users"] if u["id"]!=uid]; db_save(db)
    return jsonify({"ok":True})

@app.get("/api/admin/stats")
@auth(roles=["admin"])
def a_stats():
    db=db_load()
    return jsonify({"users":len(db["users"]),"students":len([u for u in db["users"] if u["role"]=="student"]),
                    "tutors":len([u for u in db["users"] if u["role"]=="tutor"]),
                    "syllabi":len(syllabi_registry),"exams":len(exams_registry),
                    "evaluations":len(evaluations_registry),"activity":db["activity"][:20]})

@app.route("/api/admin/settings", methods=["GET","PATCH"])
@auth(roles=["admin"])
def a_settings():
    db=db_load()
    if request.method=="PATCH":
        db["settings"].update(request.json or {}); db_save(db)
    return jsonify({"settings":db["settings"]})

# ══════════════════════════════════════════════════════════════════════════
#  FRONTEND SERVING
# ══════════════════════════════════════════════════════════════════════════
@app.route("/", defaults={"path":""})
@app.route("/<path:path>")
def spa(path):
    fp = BASE/"frontend"/path
    if path and fp.exists(): return send_from_directory(str(BASE/"frontend"), path)
    return send_from_directory(str(BASE/"frontend"), "index.html")

# ══════════════════════════════════════════════════════════════════════════
#  AI / LANGCHAIN HELPERS  (exact testEdu architecture)
# ══════════════════════════════════════════════════════════════════════════
def _collection_name(sid): return f"syllabus_{sid.replace('-','_')}"

def _get_llm():
    return ChatOpenAI(model_name=os.getenv("OPENAI_MODEL","gpt-4o-mini"), temperature=0.3, openai_api_key=OPENAI_API_KEY)

def _get_emb():
    return OpenAIEmbeddings(openai_api_key=OPENAI_API_KEY)

#, replacement for duplicate _llm_json removed

def _normalize(text): return re.sub(r"\s+"," ",str(text or "").strip().lower())

def _load_vs(did):
    # On Vercel, we can't persist. We check the global 'qa_chains' or re-index.
    # For now, we return the InMemoryVectorStore if it exists in a cache
    # (Note: app.py should ideally maintain a cache of VS objects)
    return None # Forces re-indexing if needed

def _index_doc(path, did, ext):
    """Load a file, embed it into a per-doc InMemory VS, extract chapters."""
    try:
        ext_lower = ext.lower()
        if ext_lower == "pdf":
            import pypdf
            reader = pypdf.PdfReader(str(path))
            docs = []
            for i, page in enumerate(reader.pages):
                docs.append(Document(page_content=page.extract_text(), metadata={"source":str(path), "page": i}))
        elif ext_lower in {"txt","md"}:
            with open(path, "r", encoding="utf-8") as f:
                docs = [Document(page_content=f.read(), metadata={"source":str(path)})]
        elif ext_lower in {"mp3","mp4","wav","m4a","ogg"}:
            client = _oai.OpenAI(api_key=OPENAI_API_KEY)
            with open(path,"rb") as f:
                transcript = client.audio.transcriptions.create(model="whisper-1",file=f,response_format="text")
            docs = [Document(page_content=transcript,metadata={"source":str(path),"type":"lecture_transcript"})]
        else:
            return 0, []

        splitter = RecursiveCharacterTextSplitter(chunk_size=1000,chunk_overlap=150,separators=["\n\n","\n","."," "])
        chunks = splitter.split_documents(docs)
        
        emb_fn = _get_emb()
        vs = InMemoryVectorStore.from_documents(chunks, emb_fn)
        # Store in global cache for the session
        qa_chains[did] = vs
        
        chapters = _extract_chapters(docs)
        return len(chunks), chapters
    except Exception as e:
        print(f"[Index error] {e}"); return 0,[]

def _extract_chapters(docs):
    try:
        sample = "\n\n".join(d.page_content for d in docs[:6])[:3000]
        prompt = CHAPTER_EXTRACT_PROMPT.format(context=sample)
        llm = _get_llm()
        raw = llm.invoke(prompt).content
        clean = re.sub(r"```(?:json)?|```","",raw).strip()
        chapters = json.loads(clean)
        if isinstance(chapters,list): return [str(c).strip() for c in chapters if str(c).strip()]
    except Exception as e:
        print(f"[Chapter extract warn] {e}")
    return []

def _get_chain(syllabus_id):
    if syllabus_id not in qa_chains:
        vs = _load_vs(syllabus_id)
        retriever = vs.as_retriever(search_type="mmr",search_kwargs={"k":5})
        if syllabus_id not in memories:
            memories[syllabus_id] = ConversationBufferMemory(
                memory_key="chat_history",return_messages=True,output_key="answer"
            )
        kwargs = {}
        if STUDY_PROMPT: kwargs["combine_docs_chain_kwargs"] = {"prompt":STUDY_PROMPT}
        qa_chains[syllabus_id] = ConversationalRetrievalChain.from_llm(
            llm=_get_llm(), retriever=retriever,
            memory=memories[syllabus_id], return_source_documents=True,
            verbose=False, **kwargs
        )
    return qa_chains[syllabus_id]

def _extract_answers(path: str):
    ext = Path(path).suffix.lower()
    if ext in {".txt",".md"}:
        text = Path(path).read_text(encoding="utf-8",errors="ignore")
        return _parse_answer_text(text), "parsed_text"
    if ext == ".pdf":
        pages = PyPDFLoader(path).load()
        text = "\n".join(p.page_content for p in pages)
        ans = _parse_answer_text(text)
        return (ans,"parsed_pdf_text") if ans else ({},"pdf_unreadable")
    if ext in {".png",".jpg",".jpeg",".webp"}:
        return _vision_extract(path), "vision_ocr"
    return {}, "unsupported_file_type"

def _parse_answer_text(text):
    answers={}
    patterns=[r"Q(?:uestion)?\s*(\d+)\s*[:\-]\s*(.+)",r"(\d+)\s*[\)\.\-:]\s*(.+)"]
    for line in text.splitlines():
        ln=line.strip()
        if not ln: continue
        for pat in patterns:
            m = re.match(pat,ln,flags=re.IGNORECASE)
            if m: answers[int(m.group(1))]=m.group(2).strip(); break
    return answers

def _vision_extract(image_path: str):
    client = _oai.OpenAI(api_key=OPENAI_API_KEY)
    with open(image_path,"rb") as f: b64=base64.b64encode(f.read()).decode()
    ext = Path(image_path).suffix.lower().replace(".","") or "png"
    prompt = ('Extract student answers from this answer sheet image. '
              'Return JSON object only: {"answers":{"1":"...","2":"..."}}. '
              'If unreadable, omit the question number.')
    resp = client.chat.completions.create(
        model="gpt-4o-mini",temperature=0,
        response_format={"type":"json_object"},
        messages=[{"role":"user","content":[
            {"type":"text","text":prompt},
            {"type":"image_url","image_url":{"url":f"data:image/{ext};base64,{b64}"}}
        ]}]
    )
    raw = json.loads(resp.choices[0].message.content)
    return {int(k):str(v).strip() for k,v in raw.get("answers",{}).items() if str(k).isdigit() and str(v).strip()}

def _evaluate_answers(exam: dict, submitted: Dict[int,str], roll_no="") -> dict:
    evals=[]; total_awarded=0.0; total_possible=0.0
    for q in exam.get("questions",[]):
        qid     = int(q["id"])
        qtype   = q.get("type","objective")
        max_m   = float(q.get("weightage",1))
        student = str(submitted.get(qid,"")).strip()
        total_possible += max_m

        if qtype=="objective":
            valid   = [_normalize(a) for a in q.get("valid_answers",[]) if str(a).strip()]
            correct = _normalize(student) in valid
            awarded = max_m if correct else 0.0
            total_awarded += awarded
            evals.append({"question_id":qid,"type":"objective","student_answer":student,
                           "valid_answers":q.get("valid_answers",[]),"is_correct":correct,
                           "awarded_marks":awarded,"max_marks":max_m,
                           "feedback":"Correct" if correct else "Incorrect"})
            continue

        prompt = SUBJECTIVE_GRADING_PROMPT.format(
            question=q.get("question",""),max_marks=max_m,
            valid_answers=json.dumps(q.get("valid_answers",[])),
            key_points=json.dumps(q.get("answer_key_points",[])),
            rubric=q.get("evaluation_rubric",""),student_answer=student
        )
        try:
            grade = _llm_json(prompt, temperature=0)
        except Exception: grade={}
        awarded = max(0.0,min(max_m,float(grade.get("awarded_marks",0))))
        total_awarded += awarded
        evals.append({"question_id":qid,"type":"subjective","student_answer":student,
                       "valid_answers":q.get("valid_answers",[]),"answer_key_points":q.get("answer_key_points",[]),
                       "awarded_marks":awarded,"max_marks":max_m,"feedback":grade.get("feedback",""),
                       "missing_points":grade.get("missing_points",[]),"strengths":grade.get("strengths",[]),
                       "confidence":grade.get("confidence",None)})
                       
    percentage = round((total_awarded/total_possible)*100,2) if total_possible else 0.0
    is_pass = percentage >= 40.0 # Standard 40% pass mark
    
    # Predict Improvement Area for Single sheets if subjective answers exist
    improvement_prediction = ""
    if any(e.get("type") == "subjective" for e in evals) and percentage < 90.0:
        try:
            feedbacks = " | ".join([e.get("feedback", "") for e in evals if e.get("type") == "subjective"])
            prompt = f"Based on the following teacher feedback for a student's subjective answers: '{feedbacks}'. Predict in one short, encouraging sentence what specific area or concept the student needs to improve on."
            improvement_prediction = _llm_text(prompt, temperature=0.3).strip()
        except:
            improvement_prediction = "Keep practicing subjective responses to improve your score."
    elif percentage >= 90.0:
        improvement_prediction = "Excellent work! Keep maintaining this standard."

    return {"roll_no":roll_no,"total_possible":total_possible,"total_awarded":total_awarded,
            "percentage":percentage, "is_pass": is_pass, "improvement_prediction": improvement_prediction,
            "question_wise":evals}

def _run_audit(exam: dict, evaluation: dict) -> dict:
    diffs=[]; obj_ok=0; subj_ok=0
    for item in evaluation.get("question_wise",[]):
        qid = item.get("question_id")
        q   = next((x for x in exam.get("questions",[]) if int(x.get("id",-1))==int(qid)),None)
        if not q: continue
        if item.get("type")=="objective":
            obj_ok+=1
            valid = [_normalize(a) for a in q.get("valid_answers",[])]
            exp   = float(q.get("weightage",1)) if _normalize(item.get("student_answer","")) in valid else 0.0
            if abs(float(item.get("awarded_marks",0))-exp)>1e-6:
                diffs.append({"question_id":qid,"kind":"objective_mismatch",
                               "existing_marks":item.get("awarded_marks",0),"expected_marks":exp})
            continue
        subj_ok+=1
        max_m  = float(q.get("weightage",1))
        prompt = SUBJECTIVE_GRADING_PROMPT.format(
            question=q.get("question",""),max_marks=max_m,
            valid_answers=json.dumps(q.get("valid_answers",[])),
            key_points=json.dumps(q.get("answer_key_points",[])),
            rubric=q.get("evaluation_rubric",""),student_answer=item.get("student_answer","")
        )
        try: regrade = _llm_json(prompt,temperature=0)
        except: regrade={}
        exp   = max(0.0,min(max_m,float(regrade.get("awarded_marks",0))))
        delta = abs(exp-float(item.get("awarded_marks",0)))
        if delta>0.5:
            diffs.append({"question_id":qid,"kind":"subjective_variance","existing_marks":item.get("awarded_marks",0),
                           "regraded_marks":exp,"delta":round(delta,2)})
    total = obj_ok+subj_ok
    consistency = 100.0 if total==0 else round(((total-len(diffs))/total)*100,2)
    return {"objective_checked":obj_ok,"subjective_checked":subj_ok,"total_checked":total,
            "inconsistencies":diffs,"consistency_score":consistency}

def _apply_marks_override(result: dict, patches: list) -> dict:
    q_map={int(x.get("question_id")):x for x in result.get("question_wise",[]) if "question_id" in x}
    for p in patches:
        qid = int(p.get("question_id"))
        if qid not in q_map: continue
        item = q_map[qid]
        new_m = max(0.0,min(float(item.get("max_marks",0)),float(p.get("awarded_marks",item.get("awarded_marks",0)))))
        item["awarded_marks"]=new_m
        if "feedback" in p: item["feedback"]=str(p.get("feedback",""))
        if item.get("type")=="objective": item["is_correct"]=abs(new_m-float(item.get("max_marks",0)))<1e-6
    total_possible = sum(float(x.get("max_marks",0)) for x in result.get("question_wise",[]))
    total_awarded  = sum(float(x.get("awarded_marks",0)) for x in result.get("question_wise",[]))
    result["total_possible"]=total_possible; result["total_awarded"]=total_awarded
    result["percentage"]=round((total_awarded/total_possible)*100,2) if total_possible else 0.0
    return result

# ══════════════════════════════════════════════════════════════════════════
# Boot: load persisted registries so in-memory state is ready immediately
# ══════════════════════════════════════════════════════════════════════════
_boot_load()

if __name__ == "__main__":
    port = int(os.getenv("PORT",5000))
    lc  = "✓" if LANGCHAIN_OK else "✗ (demo mode)"
    oai = "✓" if OPENAI_API_KEY else "✗ (set OPENAI_API_KEY)"
    if OPENAI_API_KEY:
        print(f"✅ OpenAI Key detected: {OPENAI_API_KEY[:7]}...{OPENAI_API_KEY[-4:]}")
    else:
        print("❌ WARNING: No OpenAI API Key found! AI features will be disabled.")
    print(f"""
====================================================
  EduMind  →  http://localhost:{port}
  LangChain: {lc}
  OpenAI:    {oai}
====================================================
""")
    if syllabi_registry:
        print(f"✅ Loaded {len(syllabi_registry)} syllabus(i):")
        for s in syllabi_registry.values():
            print(f"   • [{s['id']}] {s['name']}")
    else:
        print("ℹ️  No existing syllabi found. Upload files via the UI.")
    from flask import cli
    cli.show_server_banner = lambda *args: None
    app.run(host="0.0.0.0", port=port, debug=False)
