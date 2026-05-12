#!/usr/bin/env node
/**
 * Phase 3: PurgeCSS - Remove unused CSS
 * Uses raw content input for reliable detection
 */

const { PurgeCSS } = require('purgecss');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

const CSS_CONFIGS = [
  {
    css: 'style-core.css',
    content: ['index.html', 'exam.html', 'admin.html', 'result.html', 'soal-editor.html',
              'script.js', 'mobile-core.js', 'exam-core.js', 'admin-core.js', 'admin-shared.js',
              'result-core.js', 'pwa-core.js', 'admin-import.js', 'admin-analytics.js']
  },
  {
    css: 'style-login-lite.css',
    content: ['index.html', 'script.js', 'mobile-core.js']
  },
  {
    css: 'style-exam-lite.css',
    content: ['exam.html', 'result.html', 'script.js', 'exam-core.js', 'result-core.js']
  },
  {
    css: 'style-admin.css',
    content: ['admin.html', 'admin-core.js', 'admin-shared.js', 'admin-import.js', 'admin-analytics.js', 'script.js']
  },
  {
    css: 'style-modals.css',
    content: ['index.html', 'exam.html', 'admin.html', 'result.html',
              'script.js', 'exam-core.js', 'admin-core.js', 'admin-shared.js', 'mobile-core.js']
  },
  {
    css: 'lazy-loading.css',
    content: ['exam.html', 'lazy-loading-core.js']
  },
  {
    css: 'style-editor.css',
    content: ['soal-editor.html', 'script.js']
  },
];

// Dynamic classes added by JavaScript that PurgeCSS can't detect statically
const SAFELIST_STANDARD = [
  // Layout/visibility states
  'active', 'show', 'open', 'hidden', 'visible', 'collapse', 'expanded',
  // UI states  
  'loading', 'loaded', 'error', 'success', 'pending', 'disabled', 'enabled',
  // Exam states
  'correct', 'wrong', 'answered', 'doubt', 'doubted', 'current',
  // Connection states
  'online', 'offline', 'ready', 'syncing', 'synced', 'connected', 'disconnected',
  // Schedule states
  'waiting', 'done', 'expired', 'closed', 'sync', 'submitted',
  // Animations
  'fade-in', 'fade-out', 'slide-in', 'slide-out', 'pop-in',
  // Admin dynamic
  'selected', 'highlighted', 'editing', 'sorting', 'filtered',
];

const SAFELIST_PATTERNS = [
  // Component prefixes that JS dynamically adds
  /^active/, /^show/, /^is-/, /^has-/,
  /^alert-/, /^badge-/, /^btn-/, /^bg-/, /^text-/,
  /^admin-/, /^mobile-/, /^exam-/, /^result-/,
  /^q-/, /^stat-/, /^kpi-/, /^schedule-/,
  /^spinner/, /^loader/, /^loading/,
  /^skeleton/, /^shimmer/,
  /^remedial/, /^float-/,
  /^custom-alert/, /^broadcast/, /^cheat/,
  /^modal-/, /^overlay/,
  /^mobile-confirm/, /^mobile-schedule/, /^mobile-profile/,
  /^mobile-search/, /^mobile-filter/, /^mobile-menu/,
  /^mobile-status/, /^mobile-sync/, /^mobile-header/,
  /^mobile-clock/, /^mobile-logout/, /^mobile-school/,
  /^green-bg/, /^blue-bg/, /^yellow-bg/, /^red-bg/, /^grey-bg/,
  /^view-result/,
  /^toggle-/, /^switch$/, /^slider$/,
  /^settings-/, /^form-/, /^table-/,
  // Admin KPI cards
  /kpi/, /^admin-card/, /^admin-kpi/, /^admin-table/,
  /^admin-sidebar/, /^admin-badge/,
  // Print styles
  /^print/, /^pd-/,
  // Cetak modal
  /^cetak/,
  // Editor
  /^soal-/, /^editor-/,
];

function minifyCSS(css) {
  let r = css;
  r = r.replace(/\/\*[\s\S]*?\*\//g, '');
  r = r.replace(/\s+/g, ' ');
  r = r.replace(/\s*{\s*/g, '{');
  r = r.replace(/\s*}\s*/g, '}');
  r = r.replace(/\s*;\s*/g, ';');
  r = r.replace(/\s*:\s*/g, ':');
  r = r.replace(/\s*,\s*/g, ',');
  r = r.replace(/;}/g, '}');
  return r.trim();
}

function formatKB(bytes) {
  return (bytes / 1024).toFixed(2) + ' KB';
}

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Phase 3: PurgeCSS — Remove Unused CSS   ║');
  console.log('╚══════════════════════════════════════════╝\n');

  let totalOriginal = 0, totalPurged = 0;

  for (const config of CSS_CONFIGS) {
    const cssPath = path.join(ROOT, config.css);
    if (!fs.existsSync(cssPath)) {
      console.log(`  ⚠️  SKIP ${config.css} (not found)`);
      continue;
    }

    const rawCSS = fs.readFileSync(cssPath, 'utf8');
    
    // Build raw content array
    const contentArray = config.content
      .filter(f => fs.existsSync(path.join(ROOT, f)))
      .map(f => {
        const ext = path.extname(f).replace('.', '') || 'html';
        return { raw: fs.readFileSync(path.join(ROOT, f), 'utf8'), extension: ext };
      });

    if (contentArray.length === 0) {
      console.log(`  ⚠️  SKIP ${config.css} (no content files)`);
      continue;
    }

    try {
      const results = await new PurgeCSS().purge({
        content: contentArray,
        css: [{ raw: rawCSS }],
        safelist: {
          standard: SAFELIST_STANDARD,
          deep: SAFELIST_PATTERNS,
          greedy: [/active$/, /show$/, /open$/, /ready$/],
        },
        // Don't remove @keyframes, @font-face, CSS variables
        fontFace: true,
        keyframes: true,
        variables: true,
      });

      if (results.length > 0) {
        const purgedCSS = results[0].css;
        const minPurgedCSS = minifyCSS(purgedCSS);
        
        const origSize = Buffer.byteLength(rawCSS, 'utf8');
        const purgedSize = Buffer.byteLength(minPurgedCSS, 'utf8');
        const savings = origSize - purgedSize;
        const pct = ((savings / origSize) * 100).toFixed(1);

        // Overwrite the .min.css with purged version
        const outName = config.css.replace('.css', '.min.css');
        fs.writeFileSync(path.join(ROOT, outName), minPurgedCSS);

        totalOriginal += origSize;
        totalPurged += purgedSize;

        console.log(`  ✅ ${config.css} → ${outName}: ${formatKB(origSize)} → ${formatKB(purgedSize)} (-${pct}%)`);
      }
    } catch (err) {
      console.log(`  ❌ ${config.css} FAILED: ${err.message}`);
    }
  }

  const totalSavings = totalOriginal - totalPurged;
  const totalPct = totalOriginal > 0 ? ((totalSavings / totalOriginal) * 100).toFixed(1) : '0.0';

  console.log('\n╔══════════════════════════════════════════╗');
  console.log(`║ CSS: ${formatKB(totalOriginal)} → ${formatKB(totalPurged)} (-${formatKB(totalSavings)}, -${totalPct}%)`);
  console.log('╚══════════════════════════════════════════╝');
}

main().catch(err => {
  console.error('PurgeCSS failed:', err);
  process.exit(1);
});
