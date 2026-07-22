from bs4 import BeautifulSoup
import re

html_path = r'c:\Users\shara\OneDrive - SIDDHARTH GROUP OF INSTITUTIONS\Desktop\Prompt Bazaar\Prompt Bazaar1\Prompt Bazaar\Prompt Bazaar\PromptVerse\templates\module1.html'
with open(html_path, 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

container = soup.find('div', class_='module-container')
if not container:
    print('Module container not found!')
    exit(1)

# Step 1: Unwrap all existing lesson-cards inside the container
for card in container.find_all('div', class_='lesson-card'):
    card.unwrap()

# Step 2: Now we have a flat list of elements. Group them into new lesson-cards.
elements = list(container.children)

new_container = soup.new_tag('div', attrs={'class': 'module-container'})

current_card = None
lesson_h2_pattern = re.compile(r'^(📖\s*Lesson|🛠\s*Mini Project)')

for el in elements:
    # If the element is an h2 and matches our lesson pattern
    if el.name == 'h2' and el.text and lesson_h2_pattern.search(el.text.strip()):
        # Create a new lesson card
        current_card = soup.new_tag('div', attrs={'class': 'lesson-card'})
        new_container.append(current_card)
        current_card.append(el)
    else:
        # If we have an active lesson card, append to it
        if current_card is not None:
            current_card.append(el)
        else:
            # Elements before the first lesson card (like the title, back button, intro text)
            new_container.append(el)

# Replace the old container with the new container
container.replace_with(new_container)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(str(soup))

print('Successfully re-wrapped all lessons in module1.html')
