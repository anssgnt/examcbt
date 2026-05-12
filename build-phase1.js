#!/usr/bin/env node
/**
 * Phase 1 Build Script - CBT Optimization
 * ========================================
 * Tasks:
 * 1.1 Fix missing scripts in soal-editor.html and result.html (done in HTML)
 * 1.2 Extract inline CSS from soal-editor.html → style-editor.css (already done)
 * 1.3 Minify all CSS and JS files
 * 1.4 Remove unused CSS (basic approach - strip comments, whitespace)
 */

const fs = require('fs');
const path = require('path');
const { minify: terserMinify } = require('terser');

const ROOT = __dirname; // temp directory

// ============ FILE LISTS ============
const CSS_FILES = [
  'style.css',
  'style-core.css',
  'style-login.css',
  'style-exam.css',
  'style-admin.css',
  'style-modals.css',
  'style-editor.css',
  'lazy-loading.css',
  'style-login-lite.css',
  'style-exam-lite.css',
];

const JS_FILES = [
  'script.js',
  'supabase-patch.js',
  'supabase-adapter.js',
  'admin-core.js',
  'admin-shared.js',
  'admin-import.js',
  'admin-analytics.js',
  'admin-auth.js',
  'exam-core.js',
  'exam-advanced-integration.js',
  'mobile-core.js',
  'firebase-mock.js',
  'queue-system.js',
  'modules-init.js',
  'pwa-core.js',
  'result-core.js',
  'lazy-loading-core.js',
  'data-compression.js',
  'differential-sync.js',
  'predictive-cache.js',
  'error-tracker.js',
  'performance-monitor.js',
  'sw-advanced.js',
  'sw-image-cache.js',
  'realtime-sync.js',
  'db-pool.js',
  'redis-cache.js',
];

// ============ CSS MINIFIER (Pure Node.js) ============
function minifyCSS(css) {
  let result = css;
  
  // Remove CSS comments
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Remove multiple newlines/spaces
  result = result.replace(/\s+/g, ' ');
  
  // Remove spaces around special characters
  result = result.replace(/\s*{\s*/g, '{');
  result = result.replace(/\s*}\s*/g, '}');
  result = result.replace(/\s*;\s*/g, ';');
  result = result.replace(/\s*:\s*/g, ':');
  result = result.replace(/\s*,\s*/g, ',');
  
  // Fix media query spacing
  result = result.replace(/@media\(/g, '@media (');
  result = result.replace(/@media\s+\(/g, '@media(');
  
  // Remove last semicolon before closing brace
  result = result.replace(/;}/g, '}');
  
  // Remove leading/trailing whitespace  
  result = result.trim();
  
  return result;
}

// ============ MAIN BUILD ============
async function build() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  CBT Phase 1 Build - Minification        ║');
  console.log('╚══════════════════════════════════════════╝\n');
  
  const report = {
    css: { files: [], totalOriginal: 0, totalMinified: 0 },
    js: { files: [], totalOriginal: 0, totalMinified: 0 },
  };
  
  // ---- CSS Minification ----
  console.log('📄 Minifying CSS files...');
  for (const file of CSS_FILES) {
    const srcPath = path.join(ROOT, file);
    if (!fs.existsSync(srcPath)) {
      console.log(`  ⚠️  SKIP ${file} (not found)`);
      continue;
    }
    
    const original = fs.readFileSync(srcPath, 'utf8');
    const minified = minifyCSS(original);
    const outName = file.replace('.css', '.min.css');
    const outPath = path.join(ROOT, outName);
    
    fs.writeFileSync(outPath, minified);
    
    const origSize = Buffer.byteLength(original, 'utf8');
    const minSize = Buffer.byteLength(minified, 'utf8');
    const savings = origSize - minSize;
    const pct = ((savings / origSize) * 100).toFixed(1);
    
    report.css.files.push({ file, outName, origSize, minSize, savings, pct });
    report.css.totalOriginal += origSize;
    report.css.totalMinified += minSize;
    
    console.log(`  ✅ ${file} → ${outName} (${formatBytes(origSize)} → ${formatBytes(minSize)}, -${pct}%)`);
  }
  
  // ---- JS Minification ----
  console.log('\n📦 Minifying JS files...');
  for (const file of JS_FILES) {
    const srcPath = path.join(ROOT, file);
    if (!fs.existsSync(srcPath)) {
      console.log(`  ⚠️  SKIP ${file} (not found)`);
      continue;
    }
    
    const original = fs.readFileSync(srcPath, 'utf8');
    const origSize = Buffer.byteLength(original, 'utf8');
    
    try {
      const result = await terserMinify(original, {
        compress: {
          dead_code: true,
          drop_console: false, // Keep console.log for debugging
          drop_debugger: true,
          passes: 2,
          pure_getters: true,
          unsafe_math: false,
          conditionals: true,
          comparisons: true,
          evaluate: true,
          booleans: true,
          loops: true,
          unused: true,
          hoist_funs: true,
          hoist_vars: false,
          if_return: true,
          join_vars: true,
          sequences: true,
          collapse_vars: true,
          reduce_vars: true,
        },
        mangle: {
          toplevel: false,  // Don't mangle top-level names (they might be referenced from HTML)
          reserved: [
            // Firebase/Supabase globals
            'firebase', 'supabase', 'db', 'window',
            // Functions referenced from HTML onclick handlers
            'doLogin', 'togglePass', 'doLogout', 'showApp',
            'saveCurrentSoal', 'addNewSoal', 'deleteSoal', 'doDeleteSoal',
            'navSoal', 'loadQ', 'onBankChange', 'onTipeChange',
            'openPreviewModal', 'closePreview', 'navPrev', 'renderPreview',
            'openNewBankModal', 'closeNewBankModal', 'createNewBank',
            'toggleSidebar', 'setKunci', 'onKompleksChk', 'onOpsiImg',
            'removeGambar', 'applyGambarUrl', 'markDirty', 'autoResize',
            'closeCustomAlert',
          ],
        },
        output: {
          comments: false,
          beautify: false,
        },
      });
      
      if (result.code) {
        const minified = result.code;
        const outName = file.replace('.js', '.min.js');
        const outPath = path.join(ROOT, outName);
        
        fs.writeFileSync(outPath, minified);
        
        const minSize = Buffer.byteLength(minified, 'utf8');
        const savings = origSize - minSize;
        const pct = ((savings / origSize) * 100).toFixed(1);
        
        report.js.files.push({ file, outName, origSize, minSize, savings, pct });
        report.js.totalOriginal += origSize;
        report.js.totalMinified += minSize;
        
        console.log(`  ✅ ${file} → ${outName} (${formatBytes(origSize)} → ${formatBytes(minSize)}, -${pct}%)`);
      }
    } catch (err) {
      console.log(`  ❌ ${file} FAILED: ${err.message}`);
      // Fall back: copy original as-is
      const outName = file.replace('.js', '.min.js');
      fs.copyFileSync(srcPath, path.join(ROOT, outName));
      report.js.files.push({ file, outName: outName, origSize, minSize: origSize, savings: 0, pct: '0.0' });
      report.js.totalOriginal += origSize;
      report.js.totalMinified += origSize;
    }
  }
  
  // ---- Summary Report ----
  const cssSavings = report.css.totalOriginal - report.css.totalMinified;
  const jsSavings = report.js.totalOriginal - report.js.totalMinified;
  const totalSavings = cssSavings + jsSavings;
  const totalOriginal = report.css.totalOriginal + report.js.totalOriginal;
  
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║           BUILD REPORT                    ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║ CSS: ${formatBytes(report.css.totalOriginal)} → ${formatBytes(report.css.totalMinified)} (-${formatBytes(cssSavings)}, -${((cssSavings / report.css.totalOriginal) * 100).toFixed(1)}%)`);
  console.log(`║ JS:  ${formatBytes(report.js.totalOriginal)} → ${formatBytes(report.js.totalMinified)} (-${formatBytes(jsSavings)}, -${((jsSavings / report.js.totalOriginal) * 100).toFixed(1)}%)`);
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║ TOTAL: ${formatBytes(totalOriginal)} → ${formatBytes(totalOriginal - totalSavings)} (-${formatBytes(totalSavings)}, -${((totalSavings / totalOriginal) * 100).toFixed(1)}%)`);
  console.log('╚══════════════════════════════════════════╝');
  
  // Write JSON report
  fs.writeFileSync(path.join(ROOT, 'build-report.json'), JSON.stringify(report, null, 2));
  console.log('\n📊 Report saved to build-report.json');
  
  return report;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
