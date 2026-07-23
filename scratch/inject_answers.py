import os, re, json

with open('scratch/answers.json', 'r', encoding='utf-8') as f:
    answers = json.load(f)

html_dir = 'templates'
for i in range(2, 17):
    fpath = os.path.join(html_dir, f'module{i}.html')
    if not os.path.exists(fpath): continue
    
    with open(fpath, 'r', encoding='utf-8') as f:
        txt = f.read()
        
    # Find the lesson card that has the quiz
    # The quiz card usually starts with: <div class="lesson-card"><h2 ...>🧠 Module X Quiz
    # Let's add data-is-quiz="true" to the lesson-card
    txt = re.sub(r'<div class="lesson-card">(<h2[^>]*>.*?Quiz)', r'<div class="lesson-card quiz-card" data-is-quiz="true">\1', txt, flags=re.IGNORECASE)
    
    # Now replace the correct answers with data-correct="true"
    # To do this safely, we will iterate over each question in the text and only modify that block
    
    # Split text by questions
    for q_text, correct_opt in answers.items():
        # Build a regex to find the question block. 
        # The question might have some formatting, so we search for the question text roughly
        escaped_q = re.escape(q_text)
        # Find the h4 block
        match = re.search(fr'<h4[^>]*>{escaped_q}</h4>(.*?)(?=<h4|</div)', txt, re.DOTALL | re.IGNORECASE)
        if match:
            options_block = match.group(1)
            # Find the correct label and input
            opt_regex = fr'(<input[^>]*value="{correct_opt}"[^>]*>)'
            # add data-correct="true"
            new_options_block = re.sub(opt_regex, r'\1 data-correct="true"', options_block)
            txt = txt.replace(options_block, new_options_block)

    with open(fpath, 'w', encoding='utf-8') as f:
        f.write(txt)
    print(f"Updated {fpath}")

print("Done injecting correct answers")
