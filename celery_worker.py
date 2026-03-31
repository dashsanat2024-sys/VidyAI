"""
celery_worker.py — Async task definitions for VidyAI / Parvidya
"""
import os, sys, uuid, logging
from pathlib import Path
from datetime import datetime
from celery import Celery
from dotenv import load_dotenv

# Ensure the vidyai directory is on sys.path so forked workers can import app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
log = logging.getLogger("celery_worker")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
celery_app = Celery("parvidya_tasks", broker=REDIS_URL, backend=REDIS_URL)
celery_app.conf.update(
    task_serializer="json", result_serializer="json", accept_content=["json"],
    task_track_started=True, task_soft_time_limit=480, task_time_limit=600,
    worker_prefetch_multiplier=1,
)

def _get_app_fns():
    from app import (
        _extract_answers, _evaluate_answers, _split_multi_student_pdf,
        _parse_raw_answers, _file_hash, _cache_get, _cache_set,
        _save_evals, _save_json, _now,
        evaluations_registry, EVAL_DIR, IS_VERCEL, UPL_DIR,
    )
    return dict(
        extract=_extract_answers, evaluate=_evaluate_answers,
        split_pdf=_split_multi_student_pdf, parse_raw=_parse_raw_answers,
        file_hash=_file_hash, cache_get=_cache_get, cache_set=_cache_set,
        save_evals=_save_evals, save_json=_save_json, now=_now,
        evals_reg=evaluations_registry, eval_dir=EVAL_DIR,
        is_vercel=IS_VERCEL, upl_dir=UPL_DIR,
    )

@celery_app.task(bind=True, name="evaluate_single")
def evaluate_single(self, path, exam, roll_no="", student_name="",
                    parent_email="", file_name=""):
    self.update_state(state="STARTED", meta={"step": "ocr_extraction"})
    fn = _get_app_fns()
    try:
        fhash  = fn["file_hash"](path)
        # Cache disabled — always reprocess to pick up OCR improvements
        # cached = fn["cache_get"](fhash, exam.get("exam_id",""))
        # if cached:
        #     return cached
        answers, mode = fn["extract"](path, exam_questions=exam.get("questions",[]), exam=exam)
        if not answers:
            return {"error": f"Could not extract answers ({mode})", "file_name": file_name}
        self.update_state(state="STARTED", meta={"step": "grading"})
        result  = fn["evaluate"](exam, answers, roll_no)
        eval_id = uuid.uuid4().hex[:10]
        payload = {
            "evaluation_id": eval_id, "exam_id": exam.get("exam_id",""),
            "created_at": fn["now"](), "student_name": student_name,
            "roll_no": roll_no, "parent_email": parent_email,
            "file_name": file_name, "file_hash": fhash,
            "extraction_mode": mode, "submitted_answers": answers, "result": result,
        }
        fn["evals_reg"][eval_id] = payload
        if not fn["is_vercel"]:
            fn["save_json"](fn["eval_dir"] / f"{eval_id}.json", payload)
        fn["save_evals"]()
        fn["cache_set"](fhash, exam.get("exam_id",""), payload)
        return payload
    except Exception as e:
        log.error(f"[TASK-SINGLE] {e}", exc_info=True)
        raise

@celery_app.task(bind=True, name="evaluate_multi_student")
def evaluate_multi_student(self, path, exam):
    fn = _get_app_fns()
    exam_id = exam.get("exam_id","")
    self.update_state(state="STARTED", meta={"step":"splitting_pdf","completed":0,"total":0})
    try:
        sections = fn["split_pdf"](path, exam_questions=exam.get("questions",[]))
        total    = len(sections)
        all_evals = []
        for idx, section in enumerate(sections):
            self.update_state(state="STARTED",
                meta={"step": f"student_{idx+1}", "completed": idx, "total": total})
            sname = section.get("student_name") or f"Student {idx+1}"
            roll  = section.get("roll_no") or str(idx+1)
            raw   = section.get("raw_text","")
            answers = {}
            mode    = "multi_student_celery"

            # Path 1: page_indices (scanned/handwritten PDFs) — full OCR pipeline
            if section.get("page_indices"):
                import fitz as _fitz_ms
                tmp_pdf = Path(fn["upl_dir"]) / f"ms_{idx}_{uuid.uuid4().hex[:6]}.pdf"
                try:
                    src = _fitz_ms.open(path)
                    dst = _fitz_ms.open()
                    for pi in section["page_indices"]:
                        if pi < len(src):
                            dst.insert_pdf(src, from_page=pi, to_page=pi)
                    dst.save(str(tmp_pdf))
                    dst.close()
                    src.close()
                    answers, mode = fn["extract"](str(tmp_pdf), exam_questions=exam.get("questions",[]), exam=exam)
                except Exception as ex:
                    log.warning(f"[TASK-MULTI] Page extraction failed for {sname}: {ex}")
                finally:
                    try: tmp_pdf.unlink()
                    except: pass

            # Path 2: raw_text (typed/printed PDFs)
            if not answers and raw:
                answers = fn["parse_raw"](raw)
                mode = "multi_student_text"

            if not answers:
                continue
            result  = fn["evaluate"](exam, answers, roll)
            eval_id = uuid.uuid4().hex[:10]
            payload = {
                "evaluation_id": eval_id, "exam_id": exam_id, "created_at": fn["now"](),
                "student_name": sname, "roll_no": roll,
                "parent_email": section.get("parent_email",""),
                "file_name": Path(path).name, "extraction_mode": mode,
                "submitted_answers": answers, "result": result,
            }
            fn["evals_reg"][eval_id] = payload
            if not fn["is_vercel"]:
                fn["save_json"](fn["eval_dir"] / f"{eval_id}.json", payload)
            all_evals.append(payload)
        fn["save_evals"]()
        n   = len(all_evals)
        avg = round(sum(e["result"].get("percentage",0) for e in all_evals)/max(n,1), 1)
        pc  = sum(1 for e in all_evals if e["result"].get("is_pass"))
        return {"student_count":n,"class_average":avg,"pass_count":pc,
                "fail_count":n-pc,"evaluations":all_evals,"exam_id":exam_id}
    except Exception as e:
        log.error(f"[TASK-MULTI] {e}", exc_info=True); raise

@celery_app.task(bind=True, name="evaluate_bulk")
def evaluate_bulk(self, saved, exam):
    fn = _get_app_fns()
    exam_id = exam.get("exam_id","")
    self.update_state(state="STARTED", meta={"step":"starting","completed":0,"total":len(saved)})
    results, failures = [], []
    for idx, (fpath, roll, name, file_name) in enumerate(saved):
        self.update_state(state="STARTED",
            meta={"step": f"file_{file_name}", "completed": idx, "total": len(saved)})
        try:
            fhash  = fn["file_hash"](fpath)
            cached = fn["cache_get"](fhash, exam_id)
            if cached:
                results.append({"evaluation_id": cached["evaluation_id"], "roll_no": roll,
                    "student_name": cached.get("student_name", name) or name,
                    "percentage": cached["result"].get("percentage",0),
                    "is_pass": cached["result"].get("is_pass",False),
                    "total_awarded": cached["result"].get("total_awarded",0),
                    "total_possible": cached["result"].get("total_possible",0)})
                continue
            answers, mode = fn["extract"](fpath, exam_questions=exam.get("questions",[]), exam=exam)
            if not answers:
                failures.append({"file": file_name, "error": f"extract_failed ({mode})"}); continue
            res = fn["evaluate"](exam, answers, roll)
            eid = uuid.uuid4().hex[:10]
            p   = {"evaluation_id": eid, "exam_id": exam_id, "created_at": fn["now"](),
                   "student_name": name, "roll_no": roll, "file_name": file_name,
                   "file_hash": fhash, "extraction_mode": mode,
                   "submitted_answers": answers, "result": res}
            fn["evals_reg"][eid] = p
            if not fn["is_vercel"]:
                fn["save_json"](fn["eval_dir"] / f"{eid}.json", p)
            fn["cache_set"](fhash, exam_id, p)
            results.append({"evaluation_id": eid, "roll_no": roll,
                "student_name": name,
                "percentage": res.get("percentage",0), "is_pass": res.get("is_pass",False),
                "total_awarded": res.get("total_awarded",0),
                "total_possible": res.get("total_possible",0)})
        except Exception as e:
            log.error(f"[TASK-BULK] {file_name}: {e}")
            failures.append({"file": file_name, "error": str(e)})
    fn["save_evals"]()
    return {"bulk_id": uuid.uuid4().hex[:10], "exam_id": exam_id,
            "created_at": datetime.utcnow().isoformat(),
            "total": len(results), "results": results, "failures": failures}
