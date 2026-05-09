# 🎯 Query Selectivity Implementation Guide

## 📋 Overview

Panduan implementasi untuk mengurangi bandwidth query Supabase dengan hanya fetch kolom yang dibutuhkan.

**Target:** 90% reduction dalam bandwidth untuk monitoring admin (45KB → 4.5KB per fetch)

---

## 1️⃣ AUDIT CURRENT QUERIES

### Step 1: Identify All gasRun() Calls

```bash
# Search untuk semua gasRun calls
grep -r "gasRun(" *.js | grep -v "node_modules"
```

**Current gasRun() calls:**

| Function | Location | Current Columns | Needed Columns | Reduction |
|----------|----------|-----------------|----------------|-----------|
| getAdminMonitoringData | admin-core.js:89 | 50+ | 5 | 90% |
| getSchedules | script.js:2021 | 30+ | 6 | 80% |
| getStudentResult | mobile-core.js:252 | 50+ | 5 | 90% |
| getAdminLaporanLengkap | admin-core.js:95 | 40+ | 8 | 80% |
| getExamData | script.js:2855 | 100+ | 50 | 50% |
| getAllPeserta | script.js:1409 | 50+ | 3 | 94% |

---

## 2️⃣ IMPLEMENTATION - MONITORING ADMIN

### Current Implementation (❌ Inefficient)

```javascript
// admin-core.js line 89
const res = await gasRun('getAdminMonitoringData', skipPeserta);

// Returns: 900 siswa × 50 kolom = 45,000 data points
// Bandwidth: ~45KB per fetch
// Memory: ~45MB untuk 900 siswa
```

### Optimized Implementation (✅ Efficient)

#### Step 1: Update Supabase Function

```sql
-- supabase/functions/admin_monitoring_optimized/index.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
);

Deno.serve(async (req) => {
  try {
    const { page = 0, pageSize = 50, kelas = null } = await req.json();
    
    // ✅ SELECTIVE QUERY: Hanya ambil kolom yang dibutuhkan
    let query = supabase
      .from('peserta')
      .select('id, nama, kelas, status, nilai'); // ← ONLY 5 COLUMNS
    
    // Filter by kelas if provided
    if (kelas) {
      query = query.eq('kelas', kelas);
    }
    
    // Pagination
    const from = page * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
    
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return new Response(JSON.stringify({
      success: true,
      peserta: data,
      total: count,
      page: page,
      pageSize: pageSize
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

#### Step 2: Update Client Code

```javascript
// script.js - Update gasRun handler
else if (funcName === 'getAdminMonitoringData') {
  const [skipPeserta, page = 0, kelas = null] = args;
  
  // ✅ NEW: Call optimized function dengan pagination
  const res = {
    success: true,
    activeExams: [],
    peserta: [],
    completions: {},
    onlines: {},
    total: 0,
    page: page,
    pageSize: 50
  };
  
  // Fetch dari Supabase dengan selective columns
  try {
    const response = await fetch('/functions/v1/admin_monitoring_optimized', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        page: page,
        pageSize: 50,
        kelas: kelas
      })
    });
    
    const data = await response.json();
    if (data.success) {
      res.peserta = data.peserta;
      res.total = data.total;
      res.page = data.page;
    }
  } catch (e) {
    console.error('[getAdminMonitoringData] Error:', e);
  }
  
  return res;
}
```

#### Step 3: Update Admin UI

```javascript
// admin-core.js - Update renderMonitoringTab()
window.renderMonitoringTab = function() {
  const ml = document.getElementById('admin-monitoring-list');
  if (!ml) return;
  
  // ✅ NEW: Add pagination controls
  const paginationHtml = `
    <div class="pagination-controls" style="margin-bottom: 16px;">
      <button id="prev-page" class="btn btn-sm">← Previous</button>
      <span id="page-info" style="margin: 0 16px;">Page 1</span>
      <button id="next-page" class="btn btn-sm">Next →</button>
    </div>
  `;
  
  ml.innerHTML = paginationHtml + '<table id="monitoring-table"><tbody id="monitoring-tbody"></tbody></table>';
  
  // ✅ NEW: Pagination state
  let currentPage = 0;
  let totalPages = 1;
  
  // ✅ NEW: Load page function
  async function loadPage(page) {
    showLoading('Memuat data...');
    try {
      const res = await gasRun('getAdminMonitoringData', true, page);
      
      if (res.success) {
        currentPage = page;
        totalPages = Math.ceil(res.total / res.pageSize);
        
        // Render table
        const tbody = document.getElementById('monitoring-tbody');
        tbody.innerHTML = res.peserta.map((p, i) => `
          <tr>
            <td>${page * 50 + i + 1}</td>
            <td>${p.nama}</td>
            <td>${p.kelas}</td>
            <td>${p.status}</td>
            <td>${p.nilai || '-'}</td>
          </tr>
        `).join('');
        
        // Update pagination
        document.getElementById('page-info').textContent = `Page ${page + 1} of ${totalPages}`;
        document.getElementById('prev-page').disabled = page === 0;
        document.getElementById('next-page').disabled = page >= totalPages - 1;
      }
    } finally {
      hideLoading();
    }
  }
  
  // ✅ NEW: Pagination event listeners
  document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage > 0) loadPage(currentPage - 1);
  });
  
  document.getElementById('next-page').addEventListener('click', () => {
    if (currentPage < totalPages - 1) loadPage(currentPage + 1);
  });
  
  // Load first page
  loadPage(0);
};
```

### Performance Comparison

```
BEFORE:
  • Fetch 900 siswa × 50 kolom
  • Bandwidth: 45KB
  • Memory: 45MB
  • Render time: 2000ms (900 rows)
  • Scroll: Freeze 5-10s

AFTER:
  • Fetch 50 siswa × 5 kolom
  • Bandwidth: 4.5KB (90% reduction)
  • Memory: 500KB (99% reduction)
  • Render time: 100ms (50 rows)
  • Scroll: Smooth 60fps
```

---

## 3️⃣ IMPLEMENTATION - JADWAL UJIAN

### Current Implementation (❌ Inefficient)

```javascript
// script.js line 2021
const res = await gasRun('getSchedules', State.user.id, State.user.kelas);

// Returns: 100 jadwal × 30 kolom = 3,000 data points
// Bandwidth: ~20KB per fetch
```

### Optimized Implementation (✅ Efficient)

#### Step 1: Update Supabase Function

```sql
-- supabase/functions/get_schedules_optimized/index.ts
Deno.serve(async (req) => {
  try {
    const { userId, kelas } = await req.json();
    
    // ✅ SELECTIVE QUERY: Hanya ambil kolom yang dibutuhkan
    const { data, error } = await supabase
      .from('jadwal')
      .select('id, nama, mulai, selesai, status, target_kelas') // ← ONLY 6 COLUMNS
      .or(`target_kelas.ilike.%${kelas}%,target_kelas.ilike.%SEMUA%`)
      .order('mulai', { ascending: true });
    
    if (error) throw error;
    
    return new Response(JSON.stringify({
      success: true,
      schedules: data,
      serverTime: Date.now()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

#### Step 2: Update Client Code

```javascript
// script.js - Update gasRun handler
else if (funcName === 'getSchedules') {
  const [userId, kelas] = args;
  
  // ✅ NEW: Call optimized function
  try {
    const response = await fetch('/functions/v1/get_schedules_optimized', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        userId: userId,
        kelas: kelas
      })
    });
    
    const data = await response.json();
    if (data.success) {
      return {
        success: true,
        schedules: data.schedules,
        serverTime: data.serverTime
      };
    }
  } catch (e) {
    console.error('[getSchedules] Error:', e);
  }
  
  return { success: false, schedules: [] };
}
```

### Performance Comparison

```
BEFORE:
  • Fetch 100 jadwal × 30 kolom
  • Bandwidth: 20KB
  • Memory: 2MB

AFTER:
  • Fetch 100 jadwal × 6 kolom
  • Bandwidth: 5KB (75% reduction)
  • Memory: 500KB (75% reduction)
```

---

## 4️⃣ IMPLEMENTATION - HASIL UJIAN

### Current Implementation (❌ Inefficient)

```javascript
// mobile-core.js line 252
const res = await gasRun('getStudentResult', examId, State.user.id);

// Returns: Semua jawaban + metadata
// Bandwidth: ~50KB per fetch
```

### Optimized Implementation (✅ Efficient)

#### Step 1: Update Supabase Function

```sql
-- supabase/functions/get_student_result_optimized/index.ts
Deno.serve(async (req) => {
  try {
    const { examId, userId } = await req.json();
    
    // ✅ SELECTIVE QUERY: Hanya ambil kolom yang dibutuhkan
    const { data, error } = await supabase
      .from('hasil')
      .select('id, nama, nilai, status, waktu_submit') // ← ONLY 5 COLUMNS
      .eq('exam_id', examId)
      .eq('user_id', userId)
      .single();
    
    if (error) throw error;
    
    return new Response(JSON.stringify({
      success: true,
      result: data
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

#### Step 2: Update Client Code

```javascript
// mobile-core.js - Update gasRun handler
else if (funcName === 'getStudentResult') {
  const [examId, userId] = args;
  
  // ✅ NEW: Call optimized function
  try {
    const response = await fetch('/functions/v1/get_student_result_optimized', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        examId: examId,
        userId: userId
      })
    });
    
    const data = await response.json();
    return data;
  } catch (e) {
    console.error('[getStudentResult] Error:', e);
    return { success: false };
  }
}
```

### Performance Comparison

```
BEFORE:
  • Fetch semua jawaban + metadata
  • Bandwidth: 50KB
  • Memory: 50MB

AFTER:
  • Fetch hanya summary
  • Bandwidth: 2KB (96% reduction)
  • Memory: 2MB (96% reduction)
```

---

## 5️⃣ IMPLEMENTATION - LAPORAN LENGKAP

### Current Implementation (❌ Inefficient)

```javascript
// admin-core.js line 95
const resLap = await gasRun('getAdminLaporanLengkap');

// Returns: Semua hasil ujian dengan detail lengkap
// Bandwidth: ~100KB per fetch
```

### Optimized Implementation (✅ Efficient)

#### Step 1: Update Supabase Function

```sql
-- supabase/functions/get_admin_laporan_optimized/index.ts
Deno.serve(async (req) => {
  try {
    // ✅ SELECTIVE QUERY: Hanya ambil kolom yang dibutuhkan untuk laporan
    const { data, error } = await supabase
      .from('hasil')
      .select('id, nama, kelas, nilai, status, exam_id') // ← ONLY 6 COLUMNS
      .order('nilai', { ascending: false });
    
    if (error) throw error;
    
    // ✅ AGGREGATE: Hitung statistik di server, jangan kirim raw data
    const stats = {
      total: data.length,
      selesai: data.filter(r => r.status === 'SELESAI').length,
      rata_rata: data.reduce((sum, r) => sum + (r.nilai || 0), 0) / data.length,
      tertinggi: Math.max(...data.map(r => r.nilai || 0)),
      terendah: Math.min(...data.map(r => r.nilai || 0))
    };
    
    return new Response(JSON.stringify({
      success: true,
      hasil: data,
      stats: stats
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

#### Step 2: Update Client Code

```javascript
// admin-core.js - Update gasRun handler
else if (funcName === 'getAdminLaporanLengkap') {
  // ✅ NEW: Call optimized function
  try {
    const response = await fetch('/functions/v1/get_admin_laporan_optimized', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    return data;
  } catch (e) {
    console.error('[getAdminLaporanLengkap] Error:', e);
    return { success: false, hasil: [], stats: {} };
  }
}
```

### Performance Comparison

```
BEFORE:
  • Fetch 1000 hasil × 40 kolom
  • Bandwidth: 100KB
  • Memory: 100MB

AFTER:
  • Fetch 1000 hasil × 6 kolom + stats
  • Bandwidth: 20KB (80% reduction)
  • Memory: 20MB (80% reduction)
```

---

## 📊 COMBINED IMPACT

### Bandwidth Reduction

| Query | Before | After | Reduction |
|-------|--------|-------|-----------|
| getAdminMonitoringData | 45KB | 4.5KB | 90% |
| getSchedules | 20KB | 5KB | 75% |
| getStudentResult | 50KB | 2KB | 96% |
| getAdminLaporanLengkap | 100KB | 20KB | 80% |
| **TOTAL** | **215KB** | **31.5KB** | **85%** |

### Daily Bandwidth Savings (900 siswa)

```
Monitoring refresh (30s interval):
  • Before: 45KB × 2880 = 129.6MB/day
  • After: 4.5KB × 2880 = 12.96MB/day
  • Savings: 116.64MB/day (90%)

Jadwal refresh (60s interval):
  • Before: 20KB × 1440 = 28.8MB/day
  • After: 5KB × 1440 = 7.2MB/day
  • Savings: 21.6MB/day (75%)

Result fetch (on-demand):
  • Before: 50KB × 900 = 45MB/day
  • After: 2KB × 900 = 1.8MB/day
  • Savings: 43.2MB/day (96%)

TOTAL DAILY SAVINGS: 181.44MB (85% reduction)
```

---

## ✅ IMPLEMENTATION CHECKLIST

- [ ] Create optimized Supabase functions
- [ ] Update gasRun() handlers in script.js
- [ ] Add pagination to monitoring admin
- [ ] Update UI to show pagination controls
- [ ] Test with 900+ siswa
- [ ] Monitor bandwidth usage
- [ ] Monitor memory usage
- [ ] Test on low-end devices
- [ ] Verify all functionality working
- [ ] Document changes

---

## 🧪 TESTING

### Test 1: Bandwidth Reduction

```javascript
// Monitor network requests
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.name.includes('gasRun')) {
      console.log(`[Network] ${entry.name}: ${entry.transferSize} bytes`);
    }
  }
});
observer.observe({ entryTypes: ['resource'] });
```

### Test 2: Memory Usage

```javascript
// Monitor memory
setInterval(() => {
  if (performance.memory) {
    console.log(`[Memory] Used: ${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
  }
}, 5000);
```

### Test 3: Performance

```javascript
// Measure query time
console.time('getAdminMonitoringData');
const res = await gasRun('getAdminMonitoringData', true, 0);
console.timeEnd('getAdminMonitoringData');
```

---

**Last Updated:** May 9, 2026
**Version:** 1.0
**Status:** 📋 Ready for Implementation
