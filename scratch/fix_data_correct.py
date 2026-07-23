import os
import glob

template_dir = r"c:\Users\shara\OneDrive - SIDDHARTH GROUP OF INSTITUTIONS\Desktop\Prompt Bazaar\Prompt Bazaar1\Prompt Bazaar\Prompt Bazaar\PromptVerse\templates"

html_files = glob.glob(os.path.join(template_dir, "module*.html"))

count = 0
for file_path in html_files:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    if 'data-correct="true"> data-correct="true"' in content:
        content = content.replace('data-correct="true"> data-correct="true"', 'data-correct="true"> ')
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Fixed {os.path.basename(file_path)}")
        count += 1
        
print(f"Total files fixed: {count}")
