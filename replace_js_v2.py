import re

with open('frontend/index.html', 'r', encoding='utf-8') as f:
    target = f.read()

with open('frontend/index_new.html', 'r', encoding='utf-8') as f:
    source = f.read()

script_start_idx = target.find('<script>') + 8
script_end_idx = target.find('</script>')
script_content = target[script_start_idx:script_end_idx]


# We need to extract the new javascript blocks from index_new.html
new_script_start = source.find('<script>') + 8
new_script_end = source.find('</script>', new_script_start)
new_auth_js = source[new_script_start:new_script_end].strip()

# Clean up new snippet
new_auth_js = new_auth_js.replace("const API = 'http://localhost:5000/api';", "")
new_auth_js = new_auth_js.replace("const obs = new IntersectionObserver", "\n// Animations\nconst obs = new IntersectionObserver")
new_auth_js = new_auth_js.replace("fetch(`${API}/auth/register`", "fetch(`${API_BASE}/auth/signup`")
new_auth_js = new_auth_js.replace("fetch(`${API}/auth/login`", "fetch(`${API_BASE}/auth/login`")
new_auth_js = new_auth_js.replace("window.location.href = '/dashboard';", "document.getElementById('m-alert').innerHTML = '<div class=\"modal-alert ok\">Success! Loading dashboard...</div>'; setTimeout(() => window.location.reload(), 800);")


# Find old auth variables and functions inside index.html's javascript block
old_block_start = script_content.find("let currentRole = 'student';")
old_block_end = script_content.find("// ── FRONTEND STATE ──")

if old_block_start != -1 and old_block_end != -1:
    modified_script = script_content[:old_block_start] + new_auth_js + "\n\n" + script_content[old_block_end:]
    target = target[:script_start_idx] + modified_script + target[script_end_idx:]
    with open('frontend/index.html', 'w', encoding='utf-8') as f:
        f.write(target)
    print("JS Replacement complete.")
else:
    print("Could not locate old block")

