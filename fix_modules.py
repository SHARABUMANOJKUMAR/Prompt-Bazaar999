import re

with open('templates/academy.html', 'r', encoding='utf-8') as f:
    content = f.read()

def replacer(match):
    module_num = match.group(1)
    body = match.group(2)
    
    # Check if a button already exists
    if 'Start Module' in body:
        return match.group(0)
        
    # We want to add the button before the end of rm-body-content which ends at the last </div> before rm-module-card ends
    # Actually, we can just replace the end of rm-module-body
    
    # Let's find where to insert it. At the very end of rm-body-content
    button_html = f'''<div style="margin-top: 20px; text-align: center;"><a href="/academy/module{module_num}" class="btn btn-primary" style="text-decoration: none; display: inline-block;">Start Module {module_num}</a></div>'''
    
    return f'<span class="rm-label">Module {module_num}</span>{body}{button_html}\\n                        </div>\\n                    </div>'

# Regex to capture the module number, and the content until the end of rm-body-content.
pattern = re.compile(r'<span class=\"rm-label\">Module (\d+)</span>(.*?)\n                        </div>\n                    </div>', re.DOTALL)
new_content = pattern.sub(replacer, content)

with open('templates/academy.html', 'w', encoding='utf-8') as f:
    f.write(new_content)
