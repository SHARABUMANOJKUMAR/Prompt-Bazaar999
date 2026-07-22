import os

file_path = r"c:\Users\shara\OneDrive - SIDDHARTH GROUP OF INSTITUTIONS\Desktop\Prompt Bazaar\Prompt Bazaar1\Prompt Bazaar\Prompt Bazaar\PromptVerse\templates\academy.html"

print(f"Checking encoding of {file_path}...")
try:
    with open(file_path, 'rb') as f:
        raw = f.read()
    
    # Try decoding as UTF-8
    try:
        raw.decode('utf-8')
        print("Success: The file is already valid UTF-8.")
    except UnicodeDecodeError as e:
        print(f"Error decoding UTF-8: {e}")
        # Decode using latin-1 which accepts all bytes, and write back as valid UTF-8
        text = raw.decode('latin-1')
        
        # Also clean up any potential raw invalid bytes or weird curly quotes
        # that might cause decode errors on Werkzeug
        with open(file_path, 'w', encoding='utf-8') as f_out:
            f_out.write(text)
        print("Successfully re-saved file with clean UTF-8 encoding.")
except Exception as ex:
    print(f"Exception: {ex}")
