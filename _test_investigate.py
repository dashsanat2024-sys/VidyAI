#!/usr/bin/env python3
"""Deeper investigation of textbook matching quality on DIKSHA."""
import json, subprocess

DIKSHA_URL = "https://diksha.gov.in/api/content/v1/search"
HIER_URL = "https://diksha.gov.in/api/course/v1/hierarchy"

def _post(url, body):
    r = subprocess.run(["curl", "-s", "-X", "POST", url, "-H", "Content-Type: application/json", "-d", json.dumps(body)],
                       capture_output=True, text=True, timeout=60)
    return json.loads(r.stdout)

def _get(url):
    r = subprocess.run(["curl", "-s", url], capture_output=True, text=True, timeout=60)
    return json.loads(r.stdout)

def search_textbooks(board_filter, grade, subject=None, medium="English", limit=20):
    filters = {"contentType": ["TextBook"], "board": [board_filter], "gradeLevel": [grade], "status": ["Live"]}
    if medium:
        filters["medium"] = [medium]
    if subject:
        filters["subject"] = [subject]
    body = {"request": {"filters": filters, "limit": limit, "fields": ["name", "identifier", "leafNodesCount", "subject", "medium"]}}
    return _post(DIKSHA_URL, body).get("result", {}).get("content", []) or []

def get_hierarchy_chapters(identifier):
    d = _get(f"{HIER_URL}/{identifier}")
    content = d.get("result", {}).get("content", {})
    children = content.get("children", [])
    return [ch.get("name", "?") for ch in children], content.get("name", "?")

# ══════════════════════════════════════════════════════════════════════════════
# INVESTIGATION 1: CBSE Science Class 10 — what textbooks exist?
# ══════════════════════════════════════════════════════════════════════════════
print("=" * 70)
print("INVESTIGATION 1: CBSE Class 10 Science textbooks")
print("=" * 70)
books = search_textbooks("CBSE", "Class 10", "Science")
for b in books:
    print(f"  [{b.get('leafNodesCount',0):3d} leaves] {b['name']:50s} | {b.get('subject',[])} | {b['identifier'][:30]}")
if books:
    # Check the first one's hierarchy
    best = sorted(books, key=lambda b: b.get("leafNodesCount", 0), reverse=True)[0]
    chs, name = get_hierarchy_chapters(best["identifier"])
    print(f"\n  Best match: '{name}' → {len(chs)} children:")
    for i, ch in enumerate(chs):
        print(f"    [{i}] {ch}")

# ══════════════════════════════════════════════════════════════════════════════
# INVESTIGATION 2: Odisha Class 10 Science — why "Company Secretary"?
# ══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("INVESTIGATION 2: Odisha Class 10 Science textbooks")
print("=" * 70)
# With subject filter
books = search_textbooks("State (Odisha)", "Class 10", "Science")
print(f"  With subject='Science': {len(books)} results")
for b in books:
    print(f"    [{b.get('leafNodesCount',0):3d} leaves] {b['name']:50s} | Subj: {b.get('subject',[])} | Med: {b.get('medium',[])}")

# Without subject filter
books_all = search_textbooks("State (Odisha)", "Class 10", None)
print(f"\n  Without subject filter: {len(books_all)} results")
for b in books_all:
    subjs = b.get('subject', [])
    if any("sci" in s.lower() for s in subjs):
        print(f"    ** [{b.get('leafNodesCount',0):3d} leaves] {b['name']:50s} | Subj: {subjs}")
    else:
        print(f"       [{b.get('leafNodesCount',0):3d} leaves] {b['name']:50s} | Subj: {subjs}")

# ══════════════════════════════════════════════════════════════════════════════
# INVESTIGATION 3: Karnataka (KSEEB) Class 10 Science — only 2 chapters?
# ══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("INVESTIGATION 3: Karnataka Class 10 Science textbooks")
print("=" * 70)
books = search_textbooks("State (Karnataka)", "Class 10", "Science")
print(f"  With subject='Science': {len(books)} results")
for b in books:
    print(f"    [{b.get('leafNodesCount',0):3d} leaves] {b['name']:50s} | Subj: {b.get('subject',[])} | Med: {b.get('medium',[])}")
if books:
    best = sorted(books, key=lambda b: b.get("leafNodesCount", 0), reverse=True)[0]
    chs, name = get_hierarchy_chapters(best["identifier"])
    print(f"\n  Best match: '{name}' → {len(chs)} children:")
    for i, ch in enumerate(chs):
        print(f"    [{i}] {ch}")

# ══════════════════════════════════════════════════════════════════════════════
# INVESTIGATION 4: West Bengal (WBBSE) Class 10 Math — 0 chapters
# ══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("INVESTIGATION 4: West Bengal Class 10 Math textbooks")
print("=" * 70)
books = search_textbooks("State (West Bengal)", "Class 10", "Mathematics")
print(f"  With subject='Mathematics': {len(books)} results")
for b in books:
    print(f"    [{b.get('leafNodesCount',0):3d} leaves] {b['name']:50s} | Subj: {b.get('subject',[])} | Med: {b.get('medium',[])}")
# Try without subject
books_all = search_textbooks("State (West Bengal)", "Class 10", None)
print(f"\n  Without subject: {len(books_all)} results")
for b in books_all:
    print(f"    [{b.get('leafNodesCount',0):3d} leaves] {b['name']:50s} | Subj: {b.get('subject',[])}")

# ══════════════════════════════════════════════════════════════════════════════
# INVESTIGATION 5: Bihar (BSEB) Class 10 Science — 0 chapters
# ══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("INVESTIGATION 5: Bihar Class 10 Science textbooks")
print("=" * 70)
books = search_textbooks("State (Bihar)", "Class 10", "Science")
print(f"  With subject='Science': {len(books)} results")
books_all = search_textbooks("State (Bihar)", "Class 10", None)
print(f"  Without subject: {len(books_all)} results")
for b in books_all:
    print(f"    [{b.get('leafNodesCount',0):3d} leaves] {b['name']:50s} | Subj: {b.get('subject',[])}")

# ══════════════════════════════════════════════════════════════════════════════
# INVESTIGATION 6: Tamil Nadu (TNBSE) Class 10 Science — only 4 chapters
# ══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("INVESTIGATION 6: Tamil Nadu Class 10 Science textbooks")
print("=" * 70)
books = search_textbooks("State (Tamil Nadu)", "Class 10", "Science")
print(f"  With subject='Science': {len(books)} results")
for b in books:
    print(f"    [{b.get('leafNodesCount',0):3d} leaves] {b['name']:50s} | Subj: {b.get('subject',[])} | Med: {b.get('medium',[])}")
if books:
    best = sorted(books, key=lambda b: b.get("leafNodesCount", 0), reverse=True)[0]
    chs, name = get_hierarchy_chapters(best["identifier"])
    print(f"\n  Best match: '{name}' → {len(chs)} children:")
    for i, ch in enumerate(chs):
        print(f"    [{i}] {ch}")

# ══════════════════════════════════════════════════════════════════════════════
# INVESTIGATION 7: ICSE/ISC — search on DIKSHA directly
# ══════════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 70)
print("INVESTIGATION 7: ICSE/ISC/CISCE direct search")
print("=" * 70)
# Search for any textbook mentioning ICSE
body = {"request": {"filters": {"contentType": ["TextBook"], "status": ["Live"]}, "limit": 5, "query": "ICSE",
        "fields": ["name", "identifier", "board", "subject", "gradeLevel"]}}
d = _post(DIKSHA_URL, body)
content = d.get("result", {}).get("content", []) or []
print(f"  Search for 'ICSE' in textbook names: {len(content)} results")
for b in content:
    print(f"    Board={b.get('board','?')} | {b.get('name','')} | {b.get('gradeLevel',[])} | {b.get('subject',[])}")

# Search for ISC
body["request"]["query"] = "ISC"
d = _post(DIKSHA_URL, body)
content = d.get("result", {}).get("content", []) or []
print(f"  Search for 'ISC' in textbook names: {len(content)} results")
for b in content:
    print(f"    Board={b.get('board','?')} | {b.get('name','')} | {b.get('gradeLevel',[])} | {b.get('subject',[])}")

print("\n" + "=" * 70)
print("DONE — Investigation complete")
print("=" * 70)
