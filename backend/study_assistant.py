"""
📚 AI Study Assistant – Upload & Learn
Supports: PDFs, text/markdown, and lecture recordings (audio/video)
Features: Simple explanations, real-world examples, concept reinforcement

This module is used directly by the Flask backend (app.py) in synapseAI.
All public helpers are imported by app.py — do NOT run this file directly.
"""

import os, json
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".md", ".mp3", ".mp4", ".wav", ".m4a", ".ogg"}

# ── Lazy LangChain imports (graceful fallback) ─────────────────────────────
try:
    from langchain_openai import ChatOpenAI, OpenAIEmbeddings
    from langchain_community.vectorstores import Chroma
    from langchain_community.document_loaders import PyPDFLoader, TextLoader
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain.schema import Document
    LANGCHAIN_OK = True
except ImportError:
    LANGCHAIN_OK = False
    Document = None  # type: ignore

# ConversationalRetrievalChain and related are in langchain_classic (langchain >= 1.x)
try:
    from langchain_classic.chains import ConversationalRetrievalChain
    from langchain_classic.memory import ConversationBufferMemory
    from langchain_classic.prompts import PromptTemplate
    CHAIN_OK = True
except ImportError:
    try:
        from langchain.chains import ConversationalRetrievalChain
        from langchain.memory import ConversationBufferMemory
        from langchain.prompts import PromptTemplate
        CHAIN_OK = True
    except ImportError:
        CHAIN_OK = False

# ── System Prompt ─────────────────────────────────────────────────────────
STUDY_PROMPT = None
if CHAIN_OK:
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

# Preset study-mode prompt templates exposed to the frontend
STUDY_MODES = {
    "explain":   "Explain {concept} in simple terms with a real-world analogy.",
    "example":   "Give 2 real-world examples of {concept}.",
    "quiz":      "Ask me 3 quiz questions about {concept}.",
    "takeaways": "What are 5 key points to remember about {concept}?",
    "custom":    "{concept}",
}

# ── File Loaders ──────────────────────────────────────────────────────────
def load_pdf(file_path: str) -> List:
    loader = PyPDFLoader(file_path)
    return loader.load()

def load_text(file_path: str) -> List:
    loader = TextLoader(file_path, encoding="utf-8")
    return loader.load()

def load_audio_video(file_path: str) -> List:
    """Transcribe audio/video using OpenAI Whisper and return as Document list."""
    import openai
    client = openai.OpenAI(api_key=OPENAI_API_KEY)
    with open(file_path, "rb") as f:
        transcript_text = client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            response_format="text"
        )
    doc = Document(
        page_content=transcript_text,
        metadata={"source": file_path, "type": "lecture_transcript"}
    )
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000, chunk_overlap=150, separators=["\n\n", "\n", ".", " "]
    )
    return splitter.split_documents([doc])

def load_file(file_path: str) -> List:
    ext = Path(file_path).suffix.lower()
    if ext == ".pdf":
        return load_pdf(file_path)
    elif ext in {".txt", ".md"}:
        return load_text(file_path)
    elif ext in {".mp3", ".mp4", ".wav", ".m4a", ".ogg"}:
        return load_audio_video(file_path)
    return []

# ── Knowledge Base ────────────────────────────────────────────────────────
def build_knowledge_base(file_paths: List[str], persist_dir: str) -> Any:
    all_docs: List = []
    for fp in file_paths:
        all_docs.extend(load_file(fp))
    if not all_docs:
        raise ValueError("No documents loaded. Check file paths.")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000, chunk_overlap=150, separators=["\n\n", "\n", ".", " "]
    )
    chunks = splitter.split_documents(all_docs)
    embeddings = OpenAIEmbeddings(api_key=OPENAI_API_KEY)
    vs = Chroma.from_documents(chunks, embeddings, persist_directory=persist_dir)
    return vs

def load_knowledge_base(persist_dir: str, collection_name: str = "langchain") -> Any:
    embeddings = OpenAIEmbeddings(api_key=OPENAI_API_KEY)
    return Chroma(persist_directory=persist_dir, embedding_function=embeddings, collection_name=collection_name)

# ── QA Chain ──────────────────────────────────────────────────────────────
def build_qa_chain(vectorstore) -> Any:
    llm = ChatOpenAI(model="gpt-4o", temperature=0.3, api_key=OPENAI_API_KEY)
    memory = ConversationBufferMemory(
        memory_key="chat_history", return_messages=True, output_key="answer"
    )
    retriever = vectorstore.as_retriever(search_type="mmr", search_kwargs={"k": 5})
    kwargs = {}
    if STUDY_PROMPT:
        kwargs["combine_docs_chain_kwargs"] = {"prompt": STUDY_PROMPT}
    chain = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=retriever,
        memory=memory,
        return_source_documents=True,
        **kwargs
    )
    return chain

def chat(chain, question: str) -> Dict[str, Any]:
    result = chain({"question": question})
    sources = []
    for doc in result.get("source_documents", []):
        src = doc.metadata.get("source", "")
        page = doc.metadata.get("page", "")
        entry = Path(src).name if src else "Unknown"
        if page != "":
            entry += f" — page {page + 1}"
        if entry not in sources:
            sources.append(entry)
    return {"answer": result["answer"], "sources": sources}

# ── Question Generation ───────────────────────────────────────────────────
def _llm_json_call(prompt: str, temperature: float = 0.2) -> Any:
    llm = ChatOpenAI(model="gpt-4o", temperature=temperature, api_key=OPENAI_API_KEY)
    resp = llm.predict(prompt)
    try:
        return json.loads(resp)
    except Exception:
        import re
        m = re.search(r"\[.*\]", resp, re.DOTALL)
        if m:
            try:
                return json.loads(m.group())
            except Exception:
                pass
        return resp

def generate_questions_from_context(
    context: str,
    num_questions: int = 10,
    include_objective: bool = True,
    include_subjective: bool = True,
    difficulty_dist: Optional[Dict[str, int]] = None,
    marks_per_question: int = 2,
    subject: str = "the topic",
) -> List[Dict[str, Any]]:
    if difficulty_dist is None:
        difficulty_dist = {"easy": 40, "medium": 40, "hard": 20}
    total_e = round(num_questions * difficulty_dist.get("easy", 40) / 100)
    total_m = round(num_questions * difficulty_dist.get("medium", 40) / 100)
    total_h = num_questions - total_e - total_m
    obj_count = num_questions if (include_objective and not include_subjective) else (
        0 if (include_subjective and not include_objective) else num_questions // 2
    )
    subj_count = num_questions - obj_count

    prompt = f"""
You are an expert exam setter for {subject}.
Generate exactly {num_questions} exam questions from the context below.

Rules:
- Output ONLY a valid JSON array, no markdown.
- {obj_count} objective (MCQ) questions, {subj_count} subjective questions.
- Difficulty: {total_e} easy, {total_m} medium, {total_h} hard.
- Each object must have:
    "question" (string), "type" ("obj" or "subj"), "difficulty" ("easy"|"medium"|"hard"),
    "marks" ({marks_per_question}),
    "options" (object with A/B/C/D keys — obj only, else null),
    "answer" (string — for obj the letter; for subj a model answer),
    "explanation" (string)

Context:
{context}

JSON array only:
"""
    result = _llm_json_call(prompt)
    if not isinstance(result, list):
        raise ValueError("LLM did not return valid question JSON")
    # Ensure marks field
    for q in result:
        q.setdefault("marks", marks_per_question)
    return result

def generate_answers_for_questions(questions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    prompt = (
        "Add model answers to these exam questions. Return the same JSON array with 'answer' "
        "and 'answer_key' (key points list) fields added to each.\n\n"
        + json.dumps(questions, indent=2)
    )
    result = _llm_json_call(prompt)
    if isinstance(result, str):
        try:
            result = json.loads(result[result.index("["):])
        except Exception:
            raise ValueError("LLM did not return valid JSON for answers")
    return result

# ── Evaluation ────────────────────────────────────────────────────────────
def evaluate_submitted_answers(
    student_answers: Dict[int, str],
    questions_with_answers: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    student_answers: {question_index (0-based): student_answer_string}
    """
    results = []
    for i, q in enumerate(questions_with_answers):
        student = student_answers.get(i, "")
        gold = q.get("answer", "")
        qtype = q.get("type", "obj")
        if qtype == "obj":
            correct = gold.strip().upper() == student.strip().upper() if gold and student else False
            results.append({
                "id": i,
                "question": q.get("question", ""),
                "type": "obj",
                "difficulty": q.get("difficulty", "medium"),
                "max_marks": q.get("marks", 2),
                "correct": correct,
                "awarded": q.get("marks", 2) if correct else 0,
                "correct_answer": gold,
                "student_answer": student,
                "ai_feedback": "Correct!" if correct else f"Incorrect. Correct answer: {gold}",
                "explanation": q.get("explanation", "")
            })
        else:
            prompt = (
                f"Grade this student answer strictly.\n"
                f"Question: {q.get('question', '')}\n"
                f"Model Answer: {gold}\n"
                f"Student Answer: {student}\n"
                f"Max marks: {q.get('marks', 2)}\n"
                "Return JSON: {\"awarded\": number, \"feedback\": string, \"missing_points\": [list of strings]}"
            )
            try:
                import openai
                client = openai.OpenAI(api_key=OPENAI_API_KEY)
                resp = client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": "You are a strict but fair examiner."},
                        {"role": "user", "content": prompt}
                    ]
                )
                import re
                raw = re.sub(r"```(?:json)?|```", "", resp.choices[0].message.content).strip()
                grade = json.loads(raw)
            except Exception as e:
                grade = {"awarded": 0, "feedback": str(e), "missing_points": []}
            results.append({
                "id": i,
                "question": q.get("question", ""),
                "type": "subj",
                "difficulty": q.get("difficulty", "medium"),
                "max_marks": q.get("marks", 2),
                "awarded": float(grade.get("awarded", 0)),
                "correct_answer": gold,
                "student_answer": student,
                "ai_feedback": grade.get("feedback", ""),
                "missing_points": grade.get("missing_points", []),
                "explanation": q.get("explanation", "")
            })
    total_marks = sum(q.get("marks", 2) for q in questions_with_answers)
    awarded = sum(r.get("awarded", 0) for r in results)
    return {
        "total_questions": len(questions_with_answers),
        "total_marks": total_marks,
        "awarded": awarded,
        "percentage": round((awarded / total_marks) * 100, 1) if total_marks else 0,
        "evaluations": results
    }

def check_evaluation_consistency(
    evaluation: Dict[str, Any],
    questions_with_answers: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Re-grade subjective answers and compare with original scores."""
    import openai, re
    client = openai.OpenAI(api_key=OPENAI_API_KEY)
    re_evals = []
    for ev in evaluation.get("evaluations", []):
        qid = ev["id"]
        q = questions_with_answers[qid] if qid < len(questions_with_answers) else None
        if not q or q.get("type") == "obj":
            re_evals.append({"id": qid, "status": "skipped"})
            continue
        prompt = (
            f"Regrade this answer.\nQuestion: {q.get('question', '')}\n"
            f"Model Answer: {q.get('answer', '')}\nStudent Answer: {ev.get('student_answer', '')}\n"
            f"Max marks: {q.get('marks', 2)}\n"
            "Return JSON: {\"awarded\": number, \"feedback\": string}"
        )
        try:
            resp = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}]
            )
            raw = re.sub(r"```(?:json)?|```", "", resp.choices[0].message.content).strip()
            regrade = json.loads(raw)
        except Exception as e:
            regrade = {"awarded": None, "feedback": str(e)}
        re_evals.append({"id": qid, "regrade": regrade, "original": ev.get("awarded")})
    return {"re_evaluations": re_evals}
