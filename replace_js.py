import re

with open('frontend/index.html', 'r', encoding='utf-8') as f:
    target = f.read()

with open('frontend/index_new.html', 'r', encoding='utf-8') as f:
    source = f.read()

# The JS functions we want to replace/add from index_new.html sit between <script> and </script>
# We need `openModal`, `closeModal`, `setRole`, `switchForm`, `doLogin`, `doRegister`.
# We want to remove the old auth functions in index.html like `openAuth`, `closeAuth`, `setRole`, `handleAuth`, `toggleAuthMode`.

script_start_idx = target.find('<script>') + 8
script_end_idx = target.find('</script>')
script_content = target[script_start_idx:script_end_idx]

# Pattern to remove old auth JS block in index.html, roughly around:
# let currentRole = 'student';
# let authMode = 'login';
# ... down to end of handleAuth (or fetch /api/auth/)
# Let's just do it manually with regex or string replacement.

old_auth_start = script_content.find("let currentRole = 'student';")
old_auth_end = script_content.find("// ── FRONTEND STATE ──")

if old_auth_start != -1 and old_auth_end != -1:
    old_auth_block = script_content[old_auth_start:old_auth_end]
    
    # We grab the new script from index_new.html
    new_script_start = source.find('<script>') + 8
    new_script_end = source.find('</script>', new_script_start)
    new_auth_js = source[new_script_start:new_script_end]

    # Clean up the new script, we don't need `const API = 'http://localhost:5000/api';` duplicated
    # And we'll change `/auth/register` to `/auth/signup` in the new JS
    new_auth_js = new_auth_js.replace("const API = 'http://localhost:5000/api';", "")
    new_auth_js = new_auth_js.replace("const obs = new IntersectionObserver", "// Animations\nconst obs = new IntersectionObserver")
    new_auth_js = new_auth_js.replace("fetch(`${API}/auth/register`", "fetch(`${API_BASE}/auth/signup`")
    new_auth_js = new_auth_js.replace("fetch(`${API}/auth/login`", "fetch(`${API_BASE}/auth/login`")
    
    # We replace the old block with the new block.
    modified_script = script_content[:old_auth_start] + new_auth_js + "\n\n" + script_content[old_auth_end:]
    
    target = target[:script_start_idx] + modified_script + target[script_end_idx:]
    
    with open('frontend/index.html', 'w', encoding='utf-8') as f:
        f.write(target)
    
    print("JS Replacement complete.")
else:
    print("Could not locate old auth block inside index.html script tag.")

