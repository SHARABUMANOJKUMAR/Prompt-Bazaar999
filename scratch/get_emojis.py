import os, re
from bs4 import BeautifulSoup
emojis = set()
for i in range(1, 18):
    html_path = fr'c:\Users\shara\OneDrive - SIDDHARTH GROUP OF INSTITUTIONS\Desktop\Prompt Bazaar\Prompt Bazaar1\Prompt Bazaar\Prompt Bazaar\PromptVerse\templates\module{i}.html'
    if not os.path.exists(html_path):
        continue
    with open(html_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')
    for h2 in soup.find_all('h2'):
        text = h2.text.strip()
        if text:
            c = text[0]
            if not c.isalnum() and c not in ' "\'<>()[]{}':
                emojis.add(c)

with open('scratch/all_emojis.txt', 'w', encoding='utf-8') as f:
    f.write(''.join(list(emojis)))
