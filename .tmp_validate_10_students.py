import os
import uuid
from pathlib import Path
import fitz

os.environ['MONGO_URI'] = 'mongodb://127.0.0.1:1'
os.environ['REDIS_URL'] = 'redis://127.0.0.1:1/0'

import app

PDF = '/Users/sanat/Downloads/doc_639120448743409902.pdf'
EXAM_ID = 'aebb5a4d19'

exam = app._load_exam(EXAM_ID)
if not exam:
    print('ERROR exam_not_found', EXAM_ID)
    raise SystemExit(1)

sections = app._split_multi_student_pdf(PDF, exam_questions=exam.get('questions', []))
print('SECTIONS', len(sections))

results = []
for i, sec in enumerate(sections):
    name = sec.get('student_name') or f'Student {i+1:02d}'
    roll = sec.get('roll_no') or str(i+1)
    page_indices = sec.get('page_indices') or []

    answers = {}
    mode = 'none'
    err = ''

    if page_indices:
        tmp_pdf = Path('/Users/sanat/AI_Education/vidyai') / f'.tmp_ms_{i}_{uuid.uuid4().hex[:6]}.pdf'
        src = fitz.open(PDF)
        dst = fitz.open()
        for pi in page_indices:
            if pi < len(src):
                dst.insert_pdf(src, from_page=pi, to_page=pi)
        dst.save(str(tmp_pdf))
        dst.close()
        src.close()
        try:
            answers, mode, err = app._extract_answers_with_retry(
                str(tmp_pdf), exam_questions=exam.get('questions', []), exam=exam, attempts=1
            )
        finally:
            try:
                tmp_pdf.unlink()
            except Exception:
                pass

    q1_raw = answers.get(1) or answers.get('1')
    q2_raw = answers.get(2) or answers.get('2')
    q3_raw = answers.get(3) or answers.get('3')
    q4_raw = answers.get(4) or answers.get('4')
    q5_raw = answers.get(5) or answers.get('5')
    q6_raw = answers.get(6) or answers.get('6')
    q1 = app._coerce_mcq_answer(q1_raw, {})
    q2 = app._coerce_mcq_answer(q2_raw, {})
    q3 = app._coerce_mcq_answer(q3_raw, {})
    q4 = app._coerce_mcq_answer(q4_raw, {})

    results.append({
        'name': name,
        'roll': roll,
        'mode': mode,
        'ok': bool(answers),
        'q1': q1,
        'q2': q2,
        'q3': q3,
        'q4': q4,
        'q5': q5_raw,
        'q6': q6_raw,
        'q1_raw': q1_raw,
        'q2_raw': q2_raw,
        'q3_raw': q3_raw,
        'q4_raw': q4_raw,
        'err': err,
    })

for r in results:
    print(
        f"{r['name']}|roll={r['roll']}|ok={r['ok']}|mode={r['mode']}|"
        f"Q1={r['q1']}|Q2={r['q2']}|Q3={r['q3']}|Q4={r['q4']}|"
        f"Q5={str(r['q5'])[:60]}|Q6={str(r['q6'])[:60]}|"
        f"Q1_RAW={r['q1_raw']}|Q2_RAW={r['q2_raw']}|Q3_RAW={r['q3_raw']}|"
        f"Q4_RAW={r['q4_raw']}|err={r['err']}"
    )

ok_count = sum(1 for r in results if r['ok'])
print('OK_COUNT', ok_count)
