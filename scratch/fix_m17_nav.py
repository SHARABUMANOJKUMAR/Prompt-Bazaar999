with open(r'c:\Users\shara\OneDrive - SIDDHARTH GROUP OF INSTITUTIONS\Desktop\Prompt Bazaar\Prompt Bazaar1\Prompt Bazaar\Prompt Bazaar\PromptVerse\templates\module17.html', 'r', encoding='utf-8') as f:
    text = f.read()

target = '<a href="/academy" style="color: #64748b; text-decoration: none; font-weight: 500;">&larr; Back to Roadmap</a>'
replacement = '<div style="display: flex; gap: 16px; align-items: center; flex-wrap: wrap;">\n                <a href="/academy" style="color: #64748b; text-decoration: none; font-weight: 500;">&larr; Back to Roadmap</a>\n                <a href="/academy/module16" style="color: #64748b; text-decoration: none; font-weight: 500;">&larr; Go back to previous module</a>\n            </div>'

if target in text:
    new_text = text.replace(target, replacement)
    with open(r'c:\Users\shara\OneDrive - SIDDHARTH GROUP OF INSTITUTIONS\Desktop\Prompt Bazaar\Prompt Bazaar1\Prompt Bazaar\Prompt Bazaar\PromptVerse\templates\module17.html', 'w', encoding='utf-8') as f:
        f.write(new_text)
    print('Replaced successfully')
else:
    print('Not found')
