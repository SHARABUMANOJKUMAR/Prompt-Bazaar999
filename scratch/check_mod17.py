with open(r'c:\Users\shara\OneDrive - SIDDHARTH GROUP OF INSTITUTIONS\Desktop\Prompt Bazaar\Prompt Bazaar1\Prompt Bazaar\Prompt Bazaar\PromptVerse\templates\module17.html', 'r', encoding='utf-8') as f:
    text = f.read()
    
idx = text.find('<div class="capstone-container">')
if idx != -1:
    print(text[idx:idx+500])
