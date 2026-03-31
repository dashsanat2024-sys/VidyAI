#!/usr/bin/env python3
"""Quick validation script to test board support on DIKSHA and our backend."""
import json, sys, subprocess

DIKSHA_URL = "https://diksha.gov.in/api/content/v1/search"
LOCAL_URL = "http://localhost:5001"

def _post(url, body):
    r = subprocess.run(["curl", "-s", "-X", "POST", url, "-H", "Content-Type: application/json", "-d", json.dumps(body)],
                       capture_output=True, text=True, timeout=60)
    return json.loads(r.stdout)

def diksha_search(filters, limit=5, fields=None):
    body = {"request": {"filters": {**filters, "contentType": ["TextBook"], "status": ["Live"]}, "limit": limit}}
    if fields:
        body["request"]["fields"] = fields
    return _post(DIKSHA_URL, body)

def local_chapters(board, class_name, subject, medium="English"):
    """Call /api/diksha/chapters (no auth required) to test DIKSHA pipeline."""
    body = {"board": board, "class": class_name, "subject": subject, "medium": medium}
    return _post(f"{LOCAL_URL}/api/diksha/chapters", body)

def diksha_boards():
    body = {"request": {"filters": {"contentType": ["TextBook"], "status": ["Live"]}, "limit": 0, "facets": ["board"]}}
    d = _post(DIKSHA_URL, body)
    for f in d.get("result", {}).get("facets", []):
        if f["name"] == "board":
            return {v["name"]: v["count"] for v in f["values"]}
    return {}

print("=" * 70)
print("STEP 1: Check ALL boards on DIKSHA")
print("=" * 70)
boards = diksha_boards()
print(f"Total boards: {len(boards)}")
# Check specific ones
for keyword in ["CBSE", "Odisha", "ICSE", "ISC", "CISCE"]:
    matches = [(k, v) for k, v in boards.items() if keyword.lower() in k.lower()]
    if matches:
        for name, count in matches:
            print(f"  ✓ '{name}' → {count} textbooks")
    else:
        print(f"  ✗ '{keyword}' → NOT FOUND on DIKSHA")

print()
print("=" * 70)
print("STEP 2: Test CBSE (Source: NCERT)")
print("=" * 70)
for subj in ["Science", "Mathematics", "English"]:
    try:
        r = local_chapters("CBSE", "Class 10", subj)
        chaps = r.get("chapters", [])
        src = r.get("source", "?")
        pdf = "Yes" if r.get("pdf_url") else "No"
        print(f"  CBSE Class 10 {subj:15s} → {len(chaps):2d} chapters | source={src:8s} | PDF={pdf}")
        if chaps:
            print(f"    First: {chaps[0]}")
            print(f"    Last:  {chaps[-1]}")
    except Exception as e:
        print(f"  CBSE Class 10 {subj:15s} → ERROR: {e}")

print()
print("=" * 70)
print("STEP 3: Test Odisha (Source: SCERT via DIKSHA)")
print("=" * 70)
# First check what DIKSHA has for Odisha
odisha_board = [k for k in boards if "odisha" in k.lower()]
if odisha_board:
    print(f"  DIKSHA board name: '{odisha_board[0]}' ({boards[odisha_board[0]]} textbooks)")
    # Search for Odisha textbooks
    r = diksha_search({"board": ["State (Odisha)"]}, limit=5, fields=["name", "gradeLevel", "subject", "medium", "identifier"])
    content = r.get("result", {}).get("content", [])
    print(f"  Sample textbooks on DIKSHA:")
    for tb in (content or [])[:5]:
        print(f"    - {tb.get('name')} | Grade: {tb.get('gradeLevel')} | Subject: {tb.get('subject')} | Medium: {tb.get('medium')}")

# Test via our backend (BSE = Odisha short code in DIKSHA_BOARD_MAP)
for subj in ["Science", "Mathematics"]:
    for cls in ["Class 8", "Class 10"]:
        try:
            r = local_chapters("BSE", cls, subj)
            chaps = r.get("chapters", [])
            src = r.get("source", "?")
            pdf = "Yes" if r.get("pdf_url") else "No"
            print(f"  Odisha {cls} {subj:15s} → {len(chaps):2d} chapters | source={src:8s} | PDF={pdf}")
            if chaps:
                print(f"    First: {chaps[0]}")
        except Exception as e:
            print(f"  Odisha {cls} {subj:15s} → ERROR: {e}")

print()
print("=" * 70)
print("STEP 4: Test ICSE (Source: CISCE + Reference Books)")
print("=" * 70)
icse_board = [k for k in boards if "icse" in k.lower() or "cisce" in k.lower()]
if icse_board:
    print(f"  DIKSHA board names: {icse_board}")
else:
    print("  ✗ ICSE/CISCE NOT on DIKSHA (private board)")

# Test via our backend (should use LLM fallback)
for subj in ["Science", "Mathematics", "English"]:
    try:
        r = local_chapters("ICSE", "Class 10", subj)
        chaps = r.get("chapters", [])
        src = r.get("source", "?")
        pdf = "Yes" if r.get("pdf_url") else "No"
        print(f"  ICSE Class 10 {subj:15s} → {len(chaps):2d} chapters | source={src:8s} | PDF={pdf}")
        if chaps:
            print(f"    First: {chaps[0]}")
            print(f"    Last:  {chaps[-1]}")
    except Exception as e:
        print(f"  ICSE Class 10 {subj:15s} → ERROR: {e}")

print()
print("=" * 70)
print("STEP 5: Test ISC (Source: CISCE)")
print("=" * 70)
isc_board = [k for k in boards if k.strip() == "ISC"]
if isc_board:
    print(f"  ✓ ISC on DIKSHA: {isc_board}")
else:
    print("  ✗ ISC NOT on DIKSHA as standalone (CISCE board)")

# Test via our backend
for subj in ["Physics", "Chemistry", "Mathematics"]:
    try:
        r = local_chapters("ISC", "Class 12", subj)
        chaps = r.get("chapters", [])
        src = r.get("source", "?")
        pdf = "Yes" if r.get("pdf_url") else "No"
        print(f"  ISC Class 12 {subj:15s} → {len(chaps):2d} chapters | source={src:8s} | PDF={pdf}")
        if chaps:
            print(f"    First: {chaps[0]}")
            print(f"    Last:  {chaps[-1]}")
    except Exception as e:
        print(f"  ISC Class 12 {subj:15s} → ERROR: {e}")

print()
print("=" * 70)
print("STEP 6: Test other State Boards via DIKSHA (sample)")
print("=" * 70)
test_cases = [
    ("KSEEB", "Class 10", "Science", "Karnataka"),
    ("MSBSHSE", "Class 10", "Mathematics", "Maharashtra"),
    ("TNBSE", "Class 10", "Science", "Tamil Nadu"),
    ("BSEAP", "Class 10", "Mathematics", "Andhra Pradesh"),
    ("WBBSE", "Class 10", "Mathematics", "West Bengal"),
    ("UPMSP", "Class 10", "Science", "Uttar Pradesh"),
    ("RBSE", "Class 10", "Science", "Rajasthan"),
    ("BSEB", "Class 10", "Science", "Bihar"),
    ("GSEB", "Class 10", "Science", "Gujarat"),
    ("PSEB", "Class 10", "Science", "Punjab"),
    ("MPBSE", "Class 10", "Science", "Madhya Pradesh"),
]
for board, cls, subj, state in test_cases:
    try:
        r = local_chapters(board, cls, subj)
        chaps = r.get("chapters", [])
        src = r.get("source", "?")
        pdf = "Yes" if r.get("pdf_url") else "No"
        print(f"  {state:20s} ({board:10s}) {cls} {subj:15s} → {len(chaps):2d} ch | src={src:8s} | PDF={pdf}")
    except Exception as e:
        print(f"  {state:20s} ({board:10s}) {cls} {subj:15s} → ERROR: {e}")

print()
print("=" * 70)
print("DONE")
print("=" * 70)
