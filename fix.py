with open('templates/academy.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
current_module = None

for i, line in enumerate(lines):
    # Find module number
    if '<span class="rm-label">Module ' in line:
        # extract number
        parts = line.split('Module ')[1]
        current_module = parts.split('<')[0]
        
    if current_module and i >= 2 and '</div>' in line.strip() and len(line) - len(line.lstrip()) == 16:
        if '</div>' in lines[i-1].strip() and len(lines[i-1]) - len(lines[i-1].lstrip()) == 20:
            if '</div>' in lines[i-2].strip() and len(lines[i-2]) - len(lines[i-2].lstrip()) == 24:
                button_html = f'                            <div style="margin-top: 20px; padding-bottom: 20px; text-align: center;"><a href="/academy/module{current_module}" class="btn btn-primary" style="text-decoration: none; display: inline-block;">Start Module {current_module}</a></div>\n'
                new_lines.insert(-2, button_html)
                current_module = None
                
    new_lines.append(line)

with open('templates/academy.html', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
