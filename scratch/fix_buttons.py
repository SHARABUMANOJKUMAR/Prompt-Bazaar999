import os
import re

html_dir = 'templates'

for i in range(1, 18):
    filepath = os.path.join(html_dir, f'module{i}.html')
    if not os.path.exists(filepath):
        continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Find the top nav
    top_nav_match = re.search(r'<div style="display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">.*?</div>', content, re.DOTALL)
    top_nav_html = ""
    if top_nav_match:
        top_nav_html = top_nav_match.group(0)
        content = content.replace(top_nav_html, '')
        
    # Find the next nav
    next_nav_match = re.search(r'<!-- Navigation to Next Module -->\s*<div style="text-align: right; margin-top: 40px; margin-bottom: 20px;">.*?</div>', content, re.DOTALL)
    next_nav_html = ""
    if next_nav_match:
        next_nav_html = next_nav_match.group(0)
        content = content.replace(next_nav_html, '')
        
    # If this is module 17, the back button is at the top
    if i == 17:
        pass # Handle module 17 specifically if needed
        
    # Now, find the end of the module-container to inject them
    # Usually it's </main>
    # We will inject them right before </main>
    
    injection = ""
    if next_nav_html or top_nav_html:
        injection += '<div class="module-navigation-footer" style="display: flex; flex-direction: column; align-items: center; gap: 20px; margin-top: 50px; margin-bottom: 50px;">\n'
        
        if next_nav_html:
            # Modify next nav to center it
            next_nav_html = next_nav_html.replace('text-align: right;', 'text-align: center;')
            injection += next_nav_html + '\n'
            
        if top_nav_html:
            # Modify top nav to center it
            top_nav_html = top_nav_html.replace('margin-bottom: 24px;', 'margin-bottom: 0; justify-content: center;')
            injection += top_nav_html + '\n'
            
        injection += '</div>\n'
        
    if injection:
        # insert before </main> or </div>\n</main>
        # Let's just replace </main> with the injection + </main>
        content = content.replace('</main>', injection + '</main>')
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
            
    print(f"Processed module{i}.html")
