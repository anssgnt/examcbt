import json

with open('supabase-patch.min.js', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('if("getAdminMonitoringData"===a)')
if start != -1:
    print(text[start:start+1000])
