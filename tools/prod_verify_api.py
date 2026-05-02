#!/usr/bin/env python3
"""Production API smoke check for Arthavi backend.

Usage:
  python tools/prod_verify_api.py

Optional env overrides:
  API_BASE=https://arthavi-api-190040598802.asia-south1.run.app/api
  API_EMAIL=admin@vidyai.in
  API_PASSWORD=password
"""

from __future__ import annotations

import os
from typing import Any

import requests

API_BASE = os.getenv("API_BASE", "https://arthavi-api-190040598802.asia-south1.run.app/api").rstrip("/")
API_EMAIL = os.getenv("API_EMAIL", "admin@vidyai.in")
API_PASSWORD = os.getenv("API_PASSWORD", "password")
TIMEOUT = int(os.getenv("API_TIMEOUT", "30"))


def main() -> int:
    session = requests.Session()
    rows: list[str] = []
    failures: list[str] = []

    def add(ok: bool, name: str, detail: str = "") -> None:
        line = f"{'PASS' if ok else 'FAIL'} | {name}"
        if detail:
            line += f" | {detail}"
        rows.append(line)
        if not ok:
            failures.append(line)

    # Login
    try:
        r = session.post(
            f"{API_BASE}/auth/login",
            json={"email": API_EMAIL, "password": API_PASSWORD},
            timeout=TIMEOUT,
        )
        data: Any = r.json() if "application/json" in r.headers.get("content-type", "") else {}
        token = (data.get("token") or data.get("access_token")) if isinstance(data, dict) else None
        if r.status_code == 200 and token:
            session.headers.update({"Authorization": f"Bearer {token}"})
            add(True, "Login + token issuance", f"status=200 token_len={len(token)}")
        else:
            add(False, "Login + token issuance", f"status={r.status_code} body={str(data)[:160]}")
    except Exception as exc:
        add(False, "Login + token issuance", f"exception={exc}")

    # Admin stats
    try:
        r = session.get(f"{API_BASE}/admin/stats", timeout=TIMEOUT)
        add(r.status_code == 200, "GET /api/admin/stats", f"status={r.status_code}")
    except Exception as exc:
        add(False, "GET /api/admin/stats", f"exception={exc}")

    # Curriculum checks - always send board/class/subject payload expected by backend/frontend.
    checks = [
        ("ICSE", "Class 10", "English", "cisce_curated"),
        ("ICSE", "Class 9", "Mathematics", "cisce_curated"),
        ("ISC", "Class 11", "English", None),
    ]
    for board, class_name, subject, expected_source in checks:
        name = f"POST /api/curriculum/chapters | {board} {class_name} {subject}"
        try:
            r = session.post(
                f"{API_BASE}/curriculum/chapters",
                json={"board": board, "class": class_name, "subject": subject, "medium": "English"},
                timeout=TIMEOUT,
            )
            data: Any = r.json() if "application/json" in r.headers.get("content-type", "") else {"raw": r.text[:160]}
            source = data.get("source") if isinstance(data, dict) else None
            chapters = data.get("chapters") if isinstance(data, dict) else None
            chapter_count = len(chapters) if isinstance(chapters, list) else 0

            ok = r.status_code == 200 and chapter_count > 0
            if expected_source is not None:
                ok = ok and source == expected_source

            add(ok, name, f"status={r.status_code} source={source} chapters={chapter_count}")
        except Exception as exc:
            add(False, name, f"exception={exc}")

    # Exams list
    try:
        target = "aebb5a4d19"
        r = session.get(f"{API_BASE}/exams", timeout=TIMEOUT)
        data: Any = r.json() if "application/json" in r.headers.get("content-type", "") else {}
        exams: list[dict[str, Any]] = []
        if isinstance(data, list):
            exams = [x for x in data if isinstance(x, dict)]
        elif isinstance(data, dict):
            for key in ("exams", "data", "items", "results"):
                items = data.get(key)
                if isinstance(items, list):
                    exams = [x for x in items if isinstance(x, dict)]
                    break

        present = any(
            target in str(ex.get("exam_id", ""))
            or target in str(ex.get("id", ""))
            or target in str(ex.get("_id", ""))
            for ex in exams
        )
        add(r.status_code == 200, "GET /api/exams count + contains aebb5a4d19", f"status={r.status_code} count={len(exams)} present={present}")
    except Exception as exc:
        add(False, "GET /api/exams count + contains aebb5a4d19", f"exception={exc}")

    print("Production API verification summary")
    print(f"Target={API_BASE}")
    print("-" * 44)
    for line in rows:
        print(line)
    print("-" * 44)
    print(f"TOTAL={len(rows)} PASS={len(rows) - len(failures)} FAIL={len(failures)}")
    if failures:
        print("Failures:")
        for line in failures:
            print(f"- {line}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
