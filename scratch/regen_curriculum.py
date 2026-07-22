import re, json
from bs4 import BeautifulSoup
import os

js_path = r'c:\Users\shara\OneDrive - SIDDHARTH GROUP OF INSTITUTIONS\Desktop\Prompt Bazaar\Prompt Bazaar1\Prompt Bazaar\Prompt Bazaar\PromptVerse\static\js\academy_curriculum.js'
with open(js_path, 'r', encoding='utf-8') as f:
    js_content = f.read()

for i in range(1, 18):
    html_path = fr'c:\Users\shara\OneDrive - SIDDHARTH GROUP OF INSTITUTIONS\Desktop\Prompt Bazaar\Prompt Bazaar1\Prompt Bazaar\Prompt Bazaar\PromptVerse\templates\module{i}.html'
    if not os.path.exists(html_path):
        continue
        
    with open(html_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')
        
    lessons = []
    for card in soup.find_all('div', class_='lesson-card'):
        h = card.find(['h2', 'h3'])
        if h:
            lessons.append(h.text.strip())
            
    lessons_json = json.dumps(lessons, ensure_ascii=False, indent=12)
    
    # Find the M{i} block and replace its lessons
    pattern = re.compile(r'(\"id\":\s*\"M' + str(i) + r'\",.*?\"lessons\":\s*\[).*?(\])', re.DOTALL)
    
    def repl(m):
        inner = lessons_json.strip()[1:-1]
        if inner.strip() == '':
            return m.group(1) + m.group(2)
        return m.group(1) + '\n' + inner + '\n        ' + m.group(2)
        
    js_content = pattern.sub(repl, js_content)

with open(js_path, 'w', encoding='utf-8') as f:
    f.write(js_content)
    
print('Curriculum updated successfully!')
