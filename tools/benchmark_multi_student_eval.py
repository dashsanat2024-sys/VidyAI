#!/usr/bin/env python3
"""
Benchmark multi-student split + extraction + grading using app internals.
This mirrors evaluate_multi_student sync path and prints timing/failure stats.
"""

from __future__ import annotations

import argparse
import time
import uuid
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import fitz

from app import (
    _load_exam,
    _split_multi_student_pdf,
    _extract_answers_with_retry,
    _evaluate_answers_with_retry,
    _multi_student_worker_count,
)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True)
    ap.add_argument("--exam-id", required=True)
    ap.add_argument("--extract-attempts", type=int, default=2)
    ap.add_argument("--eval-attempts", type=int, default=2)
    ap.add_argument("--max-students", type=int, default=0,
                    help="If >0, benchmark only first N detected students")
    args = ap.parse_args()

    exam = _load_exam(args.exam_id)
    if not exam:
        raise RuntimeError(f"Exam not found: {args.exam_id}")

    t0 = time.perf_counter()
    sections = _split_multi_student_pdf(args.pdf, exam_questions=exam.get("questions", []))
    t_split = time.perf_counter()

    if args.max_students > 0:
        sections = sections[: args.max_students]

    print(f"[SPLIT] detected={len(sections)} time={t_split - t0:.2f}s")

    worker_count = min(_multi_student_worker_count(len(sections)), len(sections) or 1)
    print(f"[WORKERS] using={worker_count}")

    tmp_dir = Path("/tmp")

    def eval_one(item):
        idx, section = item
        sname = section.get("student_name") or f"Student {idx + 1}"
        roll = section.get("roll_no") or str(idx + 1)
        raw_text = section.get("raw_text", "")
        answers = {}
        mode = "multi_student_parallel"
        reason = ""

        if section.get("page_indices"):
            tmp_pdf = tmp_dir / f"bench_{uuid.uuid4().hex[:10]}.pdf"
            try:
                src = fitz.open(args.pdf)
                dst = fitz.open()
                for pi in section["page_indices"]:
                    if pi < len(src):
                        dst.insert_pdf(src, from_page=pi, to_page=pi)
                dst.save(str(tmp_pdf))
                dst.close()
                src.close()

                answers, mode, err = _extract_answers_with_retry(
                    str(tmp_pdf),
                    exam_questions=exam.get("questions", []),
                    exam=exam,
                    attempts=args.extract_attempts,
                )
                reason = err or ""
            finally:
                try:
                    tmp_pdf.unlink(missing_ok=True)
                except Exception:
                    pass

        if not answers and raw_text:
            from app import _parse_raw_answers
            answers = _parse_raw_answers(raw_text)
            mode = "multi_student_text"

        if not answers:
            return {
                "status": "failed",
                "student_name": sname,
                "roll_no": roll,
                "reason": reason or f"no_answers ({mode})",
            }

        result, eval_err = _evaluate_answers_with_retry(
            exam, answers, roll, attempts=args.eval_attempts
        )
        if not result:
            return {
                "status": "failed",
                "student_name": sname,
                "roll_no": roll,
                "reason": eval_err or "evaluation_failed",
            }

        return {
            "status": "ok",
            "student_name": sname,
            "roll_no": roll,
            "percentage": result.get("percentage", 0),
        }

    t_eval_start = time.perf_counter()
    oks = []
    fails = []
    with ThreadPoolExecutor(max_workers=worker_count) as pool:
        futs = [pool.submit(eval_one, (i, s)) for i, s in enumerate(sections)]
        for fut in as_completed(futs):
            rec = fut.result()
            if rec.get("status") == "ok":
                oks.append(rec)
            else:
                fails.append(rec)

    t_end = time.perf_counter()

    total = len(sections)
    print("=" * 80)
    print(f"[RESULT] detected={total} ok={len(oks)} failed={len(fails)}")
    print(f"[TIMING] split={t_split - t0:.2f}s eval={t_end - t_eval_start:.2f}s total={t_end - t0:.2f}s")
    if total:
        print(f"[TIMING] per-detected-student={(t_end - t0)/total:.2f}s")

    if fails:
        print("[FAILED] sample:")
        for rec in fails[:10]:
            print(f"  - roll={rec.get('roll_no')} name={rec.get('student_name')} reason={rec.get('reason')}")


if __name__ == "__main__":
    main()
