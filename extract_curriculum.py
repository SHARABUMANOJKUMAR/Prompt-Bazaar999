import os
import re
import json

# Setup paths
TEMPLATES_DIR = r"c:\Users\shara\OneDrive - SIDDHARTH GROUP OF INSTITUTIONS\Desktop\Prompt Bazaar\Prompt Bazaar1\Prompt Bazaar\Prompt Bazaar\PromptVerse\templates"
CURRICULUM_JS = r"c:\Users\shara\OneDrive - SIDDHARTH GROUP OF INSTITUTIONS\Desktop\Prompt Bazaar\Prompt Bazaar1\Prompt Bazaar\Prompt Bazaar\PromptVerse\static\js\academy_curriculum.js"

# Phase configuration
PHASE_MAPPING = {
    1: "🟢 Phase 1 — AI Foundations",
    2: "🟢 Phase 2 — Prompt Engineering Core",
    3: "🟢 Phase 2 — Prompt Engineering Core",
    4: "🟢 Phase 2 — Prompt Engineering Core",
    5: "🟡 Phase 3 — Advanced Prompt Engineering",
    6: "🟡 Phase 3 — Advanced Prompt Engineering",
    7: "🟡 Phase 3 — Advanced Prompt Engineering",
    8: "🟠 Phase 4 — Multimodal AI",
    9: "🟠 Phase 4 — Multimodal AI",
    10: "🔵 Phase 5 — Enterprise AI",
    11: "🔵 Phase 5 — Enterprise AI",
    12: "🔵 Phase 5 — Enterprise AI",
    13: "🟣 Phase 6 — AI Application Development",
    14: "🟣 Phase 6 — AI Application Development",
    15: "🟣 Phase 6 — AI Application Development",
    16: "🔴 Phase 7 — Production & Deployment",
    17: "🔴 Phase 7 — Production & Deployment"
}

# Module titles mapping (from academy.html)
MODULE_TITLES = {
    1: "AI & Generative AI Foundations",
    2: "Prompt Engineering Fundamentals",
    3: "Basic Prompting Techniques",
    4: "Intermediate Prompt Engineering",
    5: "Advanced Prompt Engineering",
    6: "Professional Prompt Frameworks",
    7: "Domain-Specific Prompting",
    8: "AI Image Prompt Engineering",
    9: "AI Video Prompt Engineering",
    10: "RAG (Retrieval-Augmented Generation)",
    11: "AI Agents",
    12: "AI Automation",
    13: "LLM Application Development",
    14: "Prompt Optimization",
    15: "AI Safety & Security",
    16: "Enterprise Prompt Engineering",
    17: "🎓 Capstone: Build Prompt Bazaar"
}

def clean_title(title_text):
    # Remove HTML tags if any
    title_text = re.sub(r'<[^>]+>', '', title_text)
    # Remove emojis and special characters
    title_text = re.sub(r'[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]', '', title_text)
    # Remove prefixes like "Lesson X:", "Lesson X :", "📖 Lesson X:", etc.
    title_text = re.sub(r'^\s*(?:Lesson|Mini Project|Assignment|Project)\s*\d+\s*[:\-]\s*', '', title_text, flags=re.IGNORECASE)
    title_text = re.sub(r'^\s*Lesson\s*\d+\s*', '', title_text, flags=re.IGNORECASE)
    # Trim and clean double spaces
    title_text = title_text.strip()
    return title_text

def extract_lessons_from_html(file_path):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return []
    
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # We want to extract content inside <div class="lesson-card"...> or similar
    # Simple state machine to parse lesson cards and their first H2
    # Find all occurrences of lesson-card
    lesson_blocks = []
    
    # A regex to find all <div class="[anything containing lesson-card]">
    # We will find positions of <div class="[^"]*lesson-card
    matches = list(re.finditer(r'<div\s+[^>]*class=["\'][^"\']*\blesson-card\b[^"\']*["\']', content))
    
    for i, match in enumerate(matches):
        start_pos = match.start()
        end_pos = matches[i+1].start() if i+1 < len(matches) else len(content)
        block = content[start_pos:end_pos]
        
        # Find the first H2 in this block
        h2_match = re.search(r'<h2[^>]*>(.*?)</h2>', block, re.DOTALL)
        if h2_match:
            raw_title = h2_match.group(1).strip()
            cleaned = clean_title(raw_title)
            lesson_blocks.append(cleaned)
        else:
            # Fallback if no H2
            lesson_blocks.append(f"Lesson {i+1}")
            
    return lesson_blocks

def main():
    curriculum = []
    
    for i in range(1, 18):
        file_name = f"module{i}.html"
        file_path = os.path.join(TEMPLATES_DIR, file_name)
        
        lessons = extract_lessons_from_html(file_path)
        print(f"Module {i}: Extracted {len(lessons)} lessons")
        
        curriculum.append({
            "id": f"M{i}",
            "num": i,
            "title": MODULE_TITLES.get(i, f"Module {i}"),
            "phase": PHASE_MAPPING.get(i, None),
            "lessons": lessons
        })
        
    # Format as Javascript
    js_content = f"""/**
 * Prompt Engineering Master Course — Full Curriculum (Dynamically Synchronized)
 * 17 Modules | 7 Phases | Automatically generated from textbook templates
 */
const ACADEMY_CURRICULUM = {json.dumps(curriculum, indent=4)};
"""
    
    with open(CURRICULUM_JS, "w", encoding="utf-8") as f:
        f.write(js_content)
        
    print(f"Curriculum successfully written to {CURRICULUM_JS}")

if __name__ == "__main__":
    main()
