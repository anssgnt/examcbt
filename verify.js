const fs = require('fs');
const path = require('path');
const dir = '.';
const htmlFiles = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

console.log('=== HTML Dependency Check ===');
let hasErrors = false;

htmlFiles.forEach(htmlFile => {
  const content = fs.readFileSync(path.join(dir, htmlFile), 'utf8');
  
  // Find script src
  const scriptRegex = /<script[^>]+src=["']([^"']+)["']/g;
  let match;
  while ((match = scriptRegex.exec(content)) !== null) {
    let src = match[1].split('?')[0]; // Remove query params like ?v=2
    if (!src.startsWith('http') && !src.startsWith('//')) {
      if (src.startsWith('/')) src = src.substring(1); // Remove leading slash
      if (!fs.existsSync(path.join(dir, src))) {
        console.log(`❌ [${htmlFile}] Missing JS: ${src}`);
        hasErrors = true;
      }
    }
  }

  // Find stylesheet href
  const cssRegex = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/g;
  let matchCss;
  while ((matchCss = cssRegex.exec(content)) !== null) {
    let href = matchCss[1].split('?')[0];
    if (!href.startsWith('http') && !href.startsWith('//')) {
      if (href.startsWith('/')) href = href.substring(1);
      if (!fs.existsSync(path.join(dir, href))) {
        console.log(`❌ [${htmlFile}] Missing CSS: ${href}`);
        hasErrors = true;
      }
    }
  }
  
  // Find dynamic loading (e.g. DEFERRED_SCRIPTS)
  const lazyJsRegex = /DEFERRED(?:_SCRIPTS)?\s*=\s*\[(.*?)\]/g;
  let matchLazyJs;
  while ((matchLazyJs = lazyJsRegex.exec(content)) !== null) {
    const arrStr = matchLazyJs[1];
    const items = arrStr.match(/['"](.*?)['"]/g) || [];
    items.forEach(item => {
      let src = item.replace(/['"]/g, '').split('?')[0];
      if (src.startsWith('/')) src = src.substring(1);
      if (!fs.existsSync(path.join(dir, src))) {
        console.log(`❌ [${htmlFile}] Missing Lazy JS: ${src}`);
        hasErrors = true;
      }
    });
  }

  // Check lazyModules (admin.html)
  const lazyModRegex = /lazyModules\s*=\s*\{(.*?)\};/gs;
  let matchLazyMod;
  while ((matchLazyMod = lazyModRegex.exec(content)) !== null) {
    const objStr = matchLazyMod[1];
    const srcRegex = /src:\s*['"]([^'"]+)['"]/g;
    let matchSrc;
    while ((matchSrc = srcRegex.exec(objStr)) !== null) {
      let src = matchSrc[1].split('?')[0];
      if (!fs.existsSync(path.join(dir, src))) {
        console.log(`❌ [${htmlFile}] Missing LazyModule JS: ${src}`);
        hasErrors = true;
      }
    }
  }
});

if (!hasErrors) console.log('✅ All referenced files exist!');
