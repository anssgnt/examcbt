import sys

with open('script.min.js', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''updatePWAManifest(e.name||"CBT Online",e.logo)'''
replacement = '''updatePWAManifest(e.name||"CBT Online",e.icon||e.logo)'''

if target in text:
    text = text.replace(target, replacement)
    with open('script.min.js', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Patched script.min.js")
else:
    print("Target not found in script.min.js")
