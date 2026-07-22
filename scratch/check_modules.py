import os
import re
from bs4 import BeautifulSoup

for i in range(1, 18):
    html_path = fr'c:\Users\shara\OneDrive - SIDDHARTH GROUP OF INSTITUTIONS\Desktop\Prompt Bazaar\Prompt Bazaar1\Prompt Bazaar\Prompt Bazaar\PromptVerse\templates\module{i}.html'
    if not os.path.exists(html_path):
        continue
        
    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()
        
    lesson_card_count = html.count('class="lesson-card"')
    
    # count h2s
    soup = BeautifulSoup(html, 'html.parser')
    h2s = [h2 for h2 in soup.find_all('h2') if re.search(r'^(📖|🛠|🏆)', h2.text.strip())]
    
    print(f'Module {i}: lesson-card = {lesson_card_count}, h2 lessons = {len(h2s)}')
