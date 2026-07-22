import os
import re

for i in range(1, 18):
    path = fr'c:\Users\shara\OneDrive - SIDDHARTH GROUP OF INSTITUTIONS\Desktop\Prompt Bazaar\Prompt Bazaar1\Prompt Bazaar\Prompt Bazaar\PromptVerse\templates\module{i}.html'
    if not os.path.exists(path):
        continue
        
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()

    # The current line is roughly:
    # <a class="btn btn-secondary" href="/academy" style="margin-bottom: 24px;">← Back to Academy Roadmap</a>
    # We will use regex to find this and replace it.
    
    # regex pattern
    pattern = re.compile(r'<a[^>]*href="/academy"[^>]*>.*?Back to Academy Roadmap.*?</a>', re.DOTALL)
    
    if i == 1:
        replacement = '<div style="display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">\n    <a class="btn btn-secondary" href="/academy">← Back to Academy Roadmap</a>\n</div>'
    else:
        replacement = f'<div style="display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">\n    <a class="btn btn-secondary" href="/academy">← Back to Academy Roadmap</a>\n    <a class="btn btn-secondary" href="/academy/module{i-1}">← Go back to previous module</a>\n</div>'

    if pattern.search(text):
        new_text = pattern.sub(replacement, text)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_text)
        print(f'Replaced in module {i}')
    else:
        # It's possible the button is already wrapped in our div from a previous run
        print(f'Not found in module {i}')

