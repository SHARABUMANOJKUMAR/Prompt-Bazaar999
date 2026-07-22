import os

for i in range(1, 18):
    path = fr'c:\Users\shara\OneDrive - SIDDHARTH GROUP OF INSTITUTIONS\Desktop\Prompt Bazaar\Prompt Bazaar1\Prompt Bazaar\Prompt Bazaar\PromptVerse\templates\module{i}.html'
    if not os.path.exists(path):
        continue
        
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()

    target = '<a class="btn btn-secondary" href="/academy" style="margin-bottom: 24px;">← Back to Academy Roadmap</a>'
    
    if i == 1:
        replacement = '<div style="display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">\n    <a class="btn btn-secondary" href="/academy">← Back to Academy Roadmap</a>\n    <!-- No previous module for Module 1 -->\n</div>'
    else:
        replacement = f'<div style="display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">\n    <a class="btn btn-secondary" href="/academy">← Back to Academy Roadmap</a>\n    <a class="btn btn-secondary" href="/academy/module{i-1}">← Go back to previous module</a>\n</div>'

    if target in text:
        new_text = text.replace(target, replacement)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_text)
        print(f'Replaced in module {i}')
    else:
        # Also check without style if it got removed or something
        target2 = '<a class="btn btn-secondary" href="/academy">← Back to Academy Roadmap</a>'
        # Wait, if target2 matches the sidebar, that's bad.
        # But target2 shouldn't be the sidebar because sidebar has class="sidebar-nav-item"
        if target2 in text and '<div class="module-container">' in text:
            print(f'Need to be careful with module {i}, might be already modified')
        print(f'Not found in module {i}')

