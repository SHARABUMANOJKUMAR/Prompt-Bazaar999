with open(r'c:\Users\shara\OneDrive - SIDDHARTH GROUP OF INSTITUTIONS\Desktop\Prompt Bazaar\Prompt Bazaar1\Prompt Bazaar\Prompt Bazaar\PromptVerse\templates\module17.html', 'r', encoding='utf-8') as f:
    text = f.read()
    
target = '<a href="/academy" class="btn">Back to Academy</a>'
replacement = '<div style="display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">\n    <a href="/academy" class="btn">Back to Academy</a>\n    <a href="/academy/module16" class="btn">← Go back to previous module</a>\n</div>'

if target in text:
    new_text = text.replace(target, replacement)
    with open(r'c:\Users\shara\OneDrive - SIDDHARTH GROUP OF INSTITUTIONS\Desktop\Prompt Bazaar\Prompt Bazaar1\Prompt Bazaar\Prompt Bazaar\PromptVerse\templates\module17.html', 'w', encoding='utf-8') as f:
        f.write(new_text)
    print('Replaced in module 17')
else:
    print('Not found in module 17 either')
