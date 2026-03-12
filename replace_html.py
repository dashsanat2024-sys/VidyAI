import re

with open('frontend/index.html', 'r', encoding='utf-8') as f:
    target = f.read()

with open('frontend/index_new.html', 'r', encoding='utf-8') as f:
    source = f.read()

# 1. Extract the new CSS
css_match = re.search(r'<style>(.*?)</style>', source, re.DOTALL)
new_css = css_match.group(1) if css_match else ""

# 2. Extract strictly the APP CSS from the current index.html
# The app CSS seems to start around "/* ── APP STYLES ── */"
app_css_start = target.find("/* ── APP STYLES ── */")
if app_css_start == -1:
    print("Could not find APP STYLES in index.html")
app_css_end = target.find("</style>")
app_css = target[app_css_start:app_css_end]

# 3. Combine New CSS + existing App CSS
combined_css = new_css + "\n\n" + app_css
target = re.sub(r'<style>.*?</style>', f'<style>{combined_css}</style>', target, flags=re.DOTALL)


# 4. Extract the new Body Elements (everything after <body> until <script>)
body_start = source.find('<body>') + 6
script_start = source.find('<script>', body_start)
new_body_html = source[body_start:script_start].strip()

# 5. We need to replace EVERYTHING in index.html between <body> and <!-- App Layout --> with new_body_html
# Specifically, we replace `<div id="landing-page">...</div>` and `<div class="overlay" id="auth-overlay">...</div>`
app_start = target.find('<!-- App Layout -->')
if app_start == -1:
    print("Could not find <!-- App Layout -->")
else:
    body_tag_end = target.find('<body>') + 6
    target = target[:body_tag_end] + "\n\n" + new_body_html + "\n\n  " + target[app_start:]

with open('frontend/index.html', 'w', encoding='utf-8') as f:
    f.write(target)

print("Replacement Complete.")
