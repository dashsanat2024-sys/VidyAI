#!/usr/bin/env python3
"""
Generate a synthetic multi-student class PDF by cloning a template student's pages
and stamping unique STUDENT NAME + ROLL NUMBER in header fields.

Usage:
  /Users/sanat/AI_Education/.venv/bin/python tools/generate_synthetic_class_pdf.py \
    --input /Users/sanat/Downloads/42c2067a09_class74s.pdf \
    --pages-per-student 4 \
    --students 40 \
    --output /Users/sanat/Downloads/42c2067a09_class74s_40_students.pdf
"""

from __future__ import annotations

import argparse
from pathlib import Path
import fitz

# Header field rectangles (top-origin coordinates) aligned to app.py answer-sheet layout.
# Slightly padded to fully cover handwritten content.
NAME_RECT = fitz.Rect(38, 70, 300, 109)
ROLL_RECT = fitz.Rect(301, 70, 415, 109)
CLASS_RECT = fitz.Rect(416, 70, 530, 109)


def stamp_identity(page: fitz.Page, student_idx: int, page_no: int) -> None:
    name = f"Student {student_idx:02d}"
    roll = str(student_idx)

    # White-out old handwritten values only inside field boxes.
    for rect in (NAME_RECT, ROLL_RECT, CLASS_RECT):
        page.draw_rect(rect, color=(1, 1, 1), fill=(1, 1, 1), overlay=True)

    page.insert_textbox(
        NAME_RECT,
        name,
        fontsize=12,
        fontname="helv",
        color=(0, 0, 0),
        align=fitz.TEXT_ALIGN_LEFT,
    )
    page.insert_textbox(
        ROLL_RECT,
        roll,
        fontsize=12,
        fontname="helv",
        color=(0, 0, 0),
        align=fitz.TEXT_ALIGN_LEFT,
    )
    page.insert_textbox(
        CLASS_RECT,
        "Class 7-A",
        fontsize=11,
        fontname="helv",
        color=(0, 0, 0),
        align=fitz.TEXT_ALIGN_LEFT,
    )

    # Small deterministic marker for debugging / deterministic text extraction.
    marker_rect = fitz.Rect(38, 58, 250, 68)
    page.insert_textbox(
        marker_rect,
        f"VIDYAI_SYNTH s={student_idx:02d} p={page_no}",
        fontsize=7,
        fontname="helv",
        color=(0.2, 0.2, 0.2),
        align=fitz.TEXT_ALIGN_LEFT,
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True, help="Input combined class PDF")
    ap.add_argument("--students", type=int, default=40)
    ap.add_argument("--pages-per-student", type=int, default=4)
    ap.add_argument("--template-student-index", type=int, default=1,
                    help="1-based student block index inside input PDF used as visual template")
    ap.add_argument("--output", required=True)
    args = ap.parse_args()

    src_path = Path(args.input)
    out_path = Path(args.output)
    if not src_path.exists():
        raise FileNotFoundError(src_path)

    src = fitz.open(str(src_path))
    dst = fitz.open()

    pps = args.pages_per_student
    tmpl_start = (args.template_student_index - 1) * pps
    tmpl_end = tmpl_start + pps
    if tmpl_end > len(src):
        raise ValueError(
            f"Template student block out of range: pages {tmpl_start}-{tmpl_end - 1}, total={len(src)}"
        )

    template_pages = list(range(tmpl_start, tmpl_end))

    for sid in range(1, args.students + 1):
        for j, src_page_idx in enumerate(template_pages, start=1):
            before = len(dst)
            dst.insert_pdf(src, from_page=src_page_idx, to_page=src_page_idx)
            page = dst[before]
            stamp_identity(page, sid, j)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    dst.save(str(out_path))
    dst.close()
    src.close()

    print(f"[OK] Generated: {out_path}")
    print(f"[OK] Students: {args.students} | pages/student: {pps} | total pages: {args.students * pps}")


if __name__ == "__main__":
    main()
