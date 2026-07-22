with open(r'c:\Users\shara\OneDrive - SIDDHARTH GROUP OF INSTITUTIONS\Desktop\Prompt Bazaar\Prompt Bazaar1\Prompt Bazaar\Prompt Bazaar\PromptVerse\templates\module1.html', 'r', encoding='utf-8') as f:
    text = f.read()
print('Count of lesson-card:', text.count('class="lesson-card"'))
