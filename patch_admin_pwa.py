import sys

with open('admin-core.min.js', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update loadAdminSettings
target1 = '''const d=document.getElementById("cfgLogoPreview");if(d){const e=a(s,"logo",null);d.innerHTML=e?`<img src="${e}" style="max-width:100%; max-height:100%; object-fit:contain;">`:'<span class="text-muted" style="font-size:0.7rem;">No Logo</span>',window.adminState.tempLogoBase64=e}'''
replacement1 = '''const d=document.getElementById("cfgLogoPreview");if(d){const e=a(s,"logo",null);d.innerHTML=e?`<img src="${e}" style="max-width:100%; max-height:100%; object-fit:contain;">`:'<span class="text-muted" style="font-size:0.7rem;">No Logo</span>',window.adminState.tempLogoBase64=e}const di=document.getElementById("cfgIconPreview");if(di){const ei=a(s,"icon",null);di.innerHTML=ei?`<img src="${ei}" style="max-width:100%; max-height:100%; object-fit:contain;">`:'<span class="text-muted" style="font-size:0.7rem;">No Icon</span>',window.adminState.tempIconBase64=ei}'''

text = text.replace(target1, replacement1)

# 2. Add listener for cfgIconInput
target2 = '''t.readAsDataURL(a)}),window.saveAdminSettings='''
replacement2 = '''t.readAsDataURL(a)}),safeAddListener("cfgIconInput","change",e=>{const a=e.target.files[0];if(!a)return;if(a.size>1048576)return showCustomAlert("File Terlalu Besar","Ukuran file melebihi 1MB.","📁"),void(e.target.value="");const t=new FileReader;t.onload=e=>{const a=e.target.result;window.adminState.tempIconBase64=a;const t=document.getElementById("cfgIconPreview");t&&(t.innerHTML=`<img src="${a}" style="max-width:100%; max-height:100%; object-fit:contain;">`)},t.readAsDataURL(a)}),window.saveAdminSettings='''

text = text.replace(target2, replacement2)

# 3. Update saveAdminSettings
target3 = '''const a={name:safeGetValue("cfgSchoolName").trim(),sub:safeGetValue("cfgSchoolSub").trim(),logo:window.adminState.tempLogoBase64};'''
replacement3 = '''const a={name:safeGetValue("cfgSchoolName").trim(),sub:safeGetValue("cfgSchoolSub").trim(),logo:window.adminState.tempLogoBase64,icon:window.adminState.tempIconBase64};'''

text = text.replace(target3, replacement3)

with open('admin-core.min.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("Done")
