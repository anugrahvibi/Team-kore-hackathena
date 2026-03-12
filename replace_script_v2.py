import os

root_dir = "/Users/nidhin/Downloads/Team-kore-hackathena"
exclude_dirs = {"venv", "node_modules", ".git", ".npm", "__pycache__"}
extensions = {".py", ".ts", ".tsx", ".html", ".md", ".json"}

replacements = {
    "Cascadenet": "Cascadenet",
    "Cascadenet": "Cascadenet",
    "2024": "2024"
}

for root, dirs, files in os.walk(root_dir):
    dirs[:] = [d for d in dirs if d not in exclude_dirs]
    for file in files:
        if not any(file.endswith(ext) for ext in extensions):
            continue
        
        filepath = os.path.join(root, file)
        
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            # Try to handle the most specific first
            if "Cascadenet" in new_content:
                new_content = new_content.replace("Cascadenet", "Cascadenet")
            if "Cascadenet" in new_content:
                new_content = new_content.replace("Cascadenet", "Cascadenet")
            if "Cascadenet" in new_content:
                new_content = new_content.replace("Cascadenet", "Cascadenet")
            if "2024" in new_content:
                new_content = new_content.replace("2024", "2024")
                
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
        except Exception as e:
            pass
