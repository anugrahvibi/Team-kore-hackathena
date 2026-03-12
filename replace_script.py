import os

root_dir = "/Users/nidhin/Downloads/Team-kore-hackathena"
exclude_dirs = {"venv", "node_modules", ".git", ".npm", "__pycache__"}
extensions = {".py", ".ts", ".tsx", ".html", ".md", ".json"}

replacements = {
    "2024": "2024",
    "Cascadenet": "Cascadenet"
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
            for k, v in replacements.items():
                new_content = new_content.replace(k, v)
                
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
        except Exception as e:
            pass
