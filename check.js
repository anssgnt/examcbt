const fs = require('fs');

console.log("=== Analisis Mendalam File HTML ===");

const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));

let totalErrors = 0;

htmlFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  let fileErrors = 0;
  
  // 1. Cek Tag HTML yang belum tertutup dengan baik (Basic Check)
  const openDivs = (content.match(/<div/g) || []).length;
  const closeDivs = (content.match(/<\/div>/g) || []).length;
  if (openDivs !== closeDivs) {
    console.log(`⚠️ [${f}] Mismatch <div>: Terbuka ${openDivs}, Tertutup ${closeDivs}`);
    fileErrors++;
  }

  // 2. Cek Syntax Error di Inline Script
  const scripts = content.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
  scripts.forEach(s => {
    const codeMatch = s.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    if (codeMatch && codeMatch[1].trim().length > 0) {
      const code = codeMatch[1];
      if (code.includes('function') || code.includes('const ') || code.includes('let ')) {
        try {
          // Wrap in function to check syntax without executing
          new Function(code);
        } catch (e) {
          console.log(`❌ [${f}] Syntax error pada inline script: ${e.message}`);
          fileErrors++;
        }
      }
    }
  });

  // 3. Cek Missing Attributes or Empty Src
  const emptySrc = content.match(/src=["']["']/g);
  if (emptySrc) {
    console.log(`⚠️ [${f}] Ditemukan atribut src kosong: ${emptySrc.length} instance`);
    fileErrors++;
  }

  // 4. Cek Duplicate IDs (yang bisa bikin script bingung)
  const idRegex = /id=["']([^"']+)["']/g;
  let match;
  const ids = [];
  while ((match = idRegex.exec(content)) !== null) {
    ids.push(match[1]);
  }
  const duplicates = ids.filter((item, index) => ids.indexOf(item) !== index);
  if (duplicates.length > 0) {
    const uniqueDuplicates = [...new Set(duplicates)];
    // Hanya laporkan ID penting yang duplikat
    const criticalDupes = uniqueDuplicates.filter(id => !id.startsWith('path') && !id.startsWith('svg'));
    if (criticalDupes.length > 0) {
      console.log(`⚠️ [${f}] ID Duplikat ditemukan: ${criticalDupes.join(', ')}`);
      // Warning saja, fileErrors tidak ditambah
    }
  }

  if (fileErrors === 0) {
    console.log(`✅ [${f}] Struktur dan Script Inline Aman.`);
  } else {
    totalErrors += fileErrors;
  }
});

console.log("\n=== Analisis Script (JS) Terser ===");
const jsFiles = fs.readdirSync('.').filter(f => f.endsWith('.min.js'));
jsFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.length === 0) {
    console.log(`❌ [${f}] File Kosong!`);
    totalErrors++;
  }
});
if (totalErrors === 0) console.log(`✅ Semua file JS minified terisi dengan baik.`);

console.log("\n=== Kesimpulan ===");
if (totalErrors === 0) {
  console.log("✅ Analisis Selesai. Tidak ditemukan kerusakan fatal pada struktur HTML maupun script.");
} else {
  console.log(`❌ Ditemukan ${totalErrors} masalah yang perlu diperbaiki.`);
}
