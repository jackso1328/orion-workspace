import re

with open('src/components/ModeSelector.tsx', 'r') as f:
    content = f.read()

# Replace container style
content = re.sub(r'style=\{\{\s*position:\s*''relative'',\s*margin:\s*''0 24px 24px 24px''\s*\}\}', '', content)

# Replace button style
content = re.sub(r'style=\{\{\s*display:\s*''flex'',\s*alignItems:\s*''center'',[\s\S]*?transition:\s*''all 0\.2s ease''\s*\}\}', '', content)

# Replace dropdown style
content = re.sub(r'style=\{\{\s*position:\s*''absolute'',\s*top:\s*''calc\(100% \+ 8px\)''[\s\S]*?padding:\s*''4px''\s*\}\}', '', content)

# Replace option style
content = re.sub(r'style=\{\{\s*display:\s*''flex'',\s*alignItems:\s*''center'',\s*gap:\s*''12px''[\s\S]*?transition:\s*''background 0\.2s ease''\s*\}\}', 'className={mode-selector-option }', content)

with open('src/components/ModeSelector.tsx', 'w') as f:
    f.write(content)

with open('src/components/Sidebar.tsx', 'r') as f:
    s_content = f.read()

# Replace root aside style
s_content = re.sub(r'style=\{\{\s*overflowY:\s*''auto''\s*\}\}', '', s_content)

# Add sidebar-scroll-area
s_content = s_content.replace('<div className="sidebar-section">', '<div className="sidebar-scroll-area">\n      <div className="sidebar-section">', 1)

# Add closing tag for sidebar-scroll-area
# We find the last </div> before </aside>
s_content = re.sub(r'(</aside>)', r'</div>\n    \1', s_content)

# Add title attribute to NavLinks
s_content = re.sub(r'<NavLink([^>]+)>', r'<NavLink\1 title={r.label}>', s_content)

with open('src/components/Sidebar.tsx', 'w') as f:
    f.write(s_content)

