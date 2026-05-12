import re
with open('admin-core.min.js', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(';', ';\n').replace('{', '{\n')
with open('admin-core-pretty.js', 'w', encoding='utf-8') as f:
    f.write(text)
