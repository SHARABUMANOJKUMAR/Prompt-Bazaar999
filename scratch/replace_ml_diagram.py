import re

path = r'c:\Users\shara\OneDrive - SIDDHARTH GROUP OF INSTITUTIONS\Desktop\Prompt Bazaar\Prompt Bazaar1\Prompt Bazaar\Prompt Bazaar\PromptVerse\templates\module1.html'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

replacement = '<div class="diagram-box" style="padding: 0; background: none; border: none; box-shadow: none;">\n                    <img src="https://res.cloudinary.com/dwv8kc9vb/image/upload/v1784734598/Gemini_Generated_Image_5zmjr65zmjr65zmj_irgcwz.png" alt="How ML Works" style="width: 100%; max-width: 600px; display: block; margin: 0 auto; border-radius: 12px; box-shadow: 0 8px 16px rgba(0,0,0,0.1);">\n                </div>'

pattern = re.compile(r'<div class="diagram-box">\s*Thousands of spam emails\s*<br/>\s*↓\s*<br/>\s*ML learns patterns\s*<br/>\s*↓\s*<br/>\s*New\s*email\s*<br/>\s*↓\s*<br/>\s*Spam / Not Spam\s*</div>', re.DOTALL)

if pattern.search(text):
    text = pattern.sub(replacement, text)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(text)
    print('Replaced successfully via regex')
else:
    print('Regex failed')
