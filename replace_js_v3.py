import re

with open('frontend/index.html', 'r', encoding='utf-8') as f:
    target = f.read()

with open('frontend/index_new.html', 'r', encoding='utf-8') as f:
    source = f.read()

script_start_idx = target.find('<script>') + 8
script_end_idx = target.find('</script>')
script_content = target[script_start_idx:script_end_idx]


new_script_start = source.find('<script>') + 8
new_script_end = source.find('</script>', new_script_start)
new_auth_js = source[new_script_start:new_script_end].strip()

new_auth_js = new_auth_js.replace("const API = 'http://localhost:5000/api';", "")
new_auth_js = new_auth_js.replace("const obs = new IntersectionObserver", "\n// Animations\nconst obs = new IntersectionObserver")
new_auth_js = new_auth_js.replace("fetch(`${API}/auth/register`", "fetch(`${API_BASE}/auth/signup`")
new_auth_js = new_auth_js.replace("fetch(`${API}/auth/login`", "fetch(`${API_BASE}/auth/login`")
# Adjust login redirect
new_auth_js = new_auth_js.replace("window.location.href = '/dashboard';", "enterApp();")


old_block_start = script_content.find("// ── AUTH ──")
old_block_end = script_content.find("async function enterApp()")

if old_block_start != -1 and old_block_end != -1:
    modified_script = script_content[:old_block_start] + "// ── AUTH ──\n" + new_auth_js + "\n\n" + script_content[old_block_end:]
    
    # We also need to map selectedRole to curRole inside doLogin/doRegister because index.html relies on selectedRole or me.role being set
    # The new JS uses curRole. But enterApp() reads variables from `me`. The new auth saves to localStorage, let's make sure it updates `me`
    target = target[:script_start_idx] + modified_script + target[script_end_idx:]
    with open('frontend/index.html', 'w', encoding='utf-8') as f:
        f.write(target)
    print("JS Replacement v3 complete.")
else:
    print("Could not locate old block")

