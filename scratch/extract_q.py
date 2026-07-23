import os, re, json
res = {}
html_dir = 'templates'
for i in range(2, 17):
    fpath = os.path.join(html_dir, f'module{i}.html')
    if not os.path.exists(fpath): continue
    with open(fpath, encoding='utf-8') as f:
        txt = f.read()
    qs = re.findall(r'<h4[^>]*>(.*?)</h4>(.*?)(?=(?:<h4|<\/div>\s*<\/div>|<div class="lesson-card">))', txt, re.DOTALL)
    for q, opts in qs:
        q_clean = re.sub(r'<[^>]+>', '', q).strip()
        o_clean = {m[0]: re.sub(r'<[^>]+>', '', m[1]).strip() for m in re.findall(r'value="([A-D])"[^>]*>(?:<[^>]+>)?(.*?)</label>', opts)}
        if o_clean:
            res[q_clean] = o_clean

with open('scratch/q.json', 'w', encoding='utf-8') as f:
    json.dump(res, f, indent=2)
print("Done")
