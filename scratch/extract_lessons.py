import os
import re

html_path = r'c:\Users\shara\OneDrive - SIDDHARTH GROUP OF INSTITUTIONS\Desktop\Prompt Bazaar\Prompt Bazaar1\Prompt Bazaar\Prompt Bazaar\PromptVerse\templates\module1.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Split by lesson-card
cards = html.split('class="lesson-card"')[1:]
lessons = []
for card in cards:
    match = re.search(r'<h2[^>]*>(.*?)</h2>', card)
    if match:
        lessons.append(match.group(1).strip())

with open('scratch/m1_real_lessons.txt', 'w', encoding='utf-8') as out:
    for l in lessons:
        out.write(l + '\n')
