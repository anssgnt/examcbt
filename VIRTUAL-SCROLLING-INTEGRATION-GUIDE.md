# Virtual Scrolling Integration Guide

## Step-by-Step Integration with Admin Monitoring

### Step 1: Include Required Scripts

Add these scripts to `admin.html` before closing `</body>`:

```html
<!-- Virtual Scroller Module -->
<script src="modules/virtual-scroller.js"></script>

<!-- Virtual Scroller CSS -->
<link rel="stylesheet" href="modules/virtual-scroller.css">

<!-- Admin Monitoring with Virtual Scroll -->
<script src="admin-monitoring-virtual-scroll.js"></script>
```

**Location in admin.html**:
```html
  </body>
  <!-- Add before closing body tag -->
  <script src="modules/virtual-scroller.js"></script>
  <link rel="stylesheet" href="modules/virtual-scroller.css">
  <script src="admin-monitoring-virtual-scroll.js"></script>
</html>
```

---

### Step 2: Update Monitoring Tab HTML

The monitoring tab container needs proper structure. Verify in `admin.html`:

```html
<!-- Tab: Monitoring -->
<div id="tab-monitoring" class="admin-tab-content" style="display:none;">
  <div class="admin-card" style="margin-bottom:16px;">
    <div style="display:flex;gap:15px;align-items:center;flex-wrap:wrap;">
      <div style="display:flex;align-items:center;gap:8px;">
        <input type="checkbox" id="chkAbsenMode" style="width:18px;height:18px;" onchange="renderAdminDashboard()">
        <label for="chkAbsenMode" style="font-size:0.85rem;font-weight:600;">Mode Absensi</label>
      </div>
      <div style="flex:1;min-width:180px;">
        <input type="text" id="mon-search" class="form-control" placeholder="Cari nama..." oninput="handleMonitoringFilterChange()">
      </div>
      <select id="mon-filter-kelas" class="form-control" style="width:140px;" onchange="handleMonitoringFilterChange()">
        <option value="all">Semua Kelas</option>
      </select>
      <select id="mon-filter-status" class="form-control" style="width:180px;" onchange="handleMonitoringFilterChange()">
        <option value="all">Semua Status</option>
        <option value="SELESAI">Selesai</option>
        <option value="MENGERJAKAN">Mengerjakan</option>
        <option value="BELUM">Belum Mulai</option>
        <option value="SYNCED">Sudah Sinkron Soal</option>
        <option value="NOT_SYNCED">Belum Sinkron Soal</option>
      </select>
    </div>
  </div>
  <div id="admin-monitoring-list" style="display:flex;flex-direction:column;gap:16px;"></div>
</div>
```

**Key Changes**:
- Changed `oninput="renderAdminDashboard()"` to `oninput="handleMonitoringFilterChange()"`
- Changed `onchange="renderAdminDashboard()"` to `onchange="handleMonitoringFilterChange()"`

---

### Step 3: Update Admin Core Functions

In `admin-core.js` or where monitoring is loaded, replace:

```javascript
// OLD: Using pagination
window.renderAdminDashboard = function() {
  renderAdminDashboardOptimized(window.adminState.monitor);
};

// NEW: Using virtual scrolling
window.renderAdminDashboard = function() {
  renderAdminDashboardWithVirtualScroll(window.adminState.monitor);
};
```

---

### Step 4: Update Monitoring Load Function

Replace the monitoring load function:

```javascript
// OLD
window.loadAdminMonitoring = async function() {
  showLoading('Memuat data monitoring...');
  try {
    const res = await gasRun('getAdminMonitoringDataOptimized', true);
    if (res.success) {
      window.adminState.monitor = res;
      renderAdminDashboardOptimized(res);
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    hideLoading();
  }
};

// NEW
window.loadAdminMonitoring = async function() {
  showLoading('Memuat data monitoring...');
  try {
    const res = await gasRun('getAdminMonitoringDataOptimized', true);
    if (res.success) {
      window.adminState.monitor = res;
      renderAdminDashboardWithVirtualScroll(res);
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    hideLoading();
  }
};
```

---

### Step 5: Add Cleanup on Page Unload

Add to `admin-core.js`:

```javascript
// Cleanup virtual scrollers when leaving admin page
window.addEventListener('beforeunload', () => {
  cleanupVirtualScrollers();
});

// Also cleanup when switching tabs
document.querySelectorAll('.admin-sidebar-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    // Cleanup scrollers when leaving monitoring tab
    if (!btn.dataset.tab.includes('monitoring')) {
      cleanupVirtualScrollers();
    }
  });
});
```

---

### Step 6: Update Tab Switching

Ensure monitoring tab properly initializes virtual scrollers:

```javascript
// In tab switching code
document.querySelectorAll('.admin-sidebar-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    const tabId = this.dataset.tab;
    
    // Hide all tabs
    document.querySelectorAll('.admin-tab-content').forEach(tab => {
      tab.style.display = 'none';
    });
    
    // Show selected tab
    document.getElementById(tabId).style.display = 'flex';
    
    // Load monitoring data if monitoring tab
    if (tabId === 'tab-monitoring') {
      loadAdminMonitoring();
    }
  });
});
```

---

### Step 7: Verify Filter Integration

Ensure filter handlers are properly connected:

```javascript
// In admin-core.js or admin-monitoring-virtual-scroll.js
document.addEventListener('DOMContentLoaded', () => {
  // Setup filter event listeners
  const filterElements = [
    'mon-search',
    'mon-filter-kelas',
    'mon-filter-status',
    'chkAbsenMode'
  ];

  filterElements.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      if (element.type === 'checkbox') {
        element.addEventListener('change', handleMonitoringFilterChange);
      } else {
        element.addEventListener('input', handleMonitoringFilterChange);
        element.addEventListener('change', handleMonitoringFilterChange);
      }
    }
  });
});
```

---

### Step 8: Test Integration

1. **Open Admin Panel**
   - Navigate to admin.html
   - Login with admin credentials

2. **Go to Monitoring Tab**
   - Click "Monitoring" in sidebar
   - Should load with virtual scrolling

3. **Test Scrolling**
   - Scroll through student list
   - Should be smooth (60fps)
   - No blank spaces

4. **Test Filters**
   - Search by name
   - Filter by class
   - Filter by status
   - Should update instantly

5. **Check Performance**
   - Open DevTools (F12)
   - Go to Performance tab
   - Record while scrolling
   - Check FPS (should be 58-60)

6. **Verify Metrics**
   - Open Console
   - Run: `getVirtualScrollerMetrics()`
   - Should show DOM reduction 94%+

---

## Configuration Tuning

### For Slow Devices

```javascript
// In admin-monitoring-virtual-scroll.js
window.initVirtualScrollerForExam = function(examId, items, containerId) {
  const scroller = new VirtualScroller(
    document.getElementById(containerId),
    items,
    60,
    {
      bufferSize: 8,    // Increase from 5
      overscan: 5,      // Increase from 3
      enableDebug: false
    }
  );
  // ...
};
```

### For High-Performance Devices

```javascript
// Reduce buffer for faster rendering
{
  bufferSize: 3,
  overscan: 2
}
```

### For Large Datasets (1000+ items)

```javascript
// Increase buffer to prevent blank space
{
  bufferSize: 10,
  overscan: 5
}
```

---

## Monitoring Performance

### Real-time Metrics

```javascript
// Add to admin dashboard
setInterval(() => {
  const metrics = getVirtualScrollerMetrics();
  console.log('Virtual Scroller Metrics:', metrics);
  
  // Update UI with metrics
  Object.entries(metrics).forEach(([examId, metric]) => {
    console.log(`Exam ${examId}:`);
    console.log(`  - DOM Reduction: ${metric.domReduction}`);
    console.log(`  - Render Time: ${metric.renderTime.toFixed(2)}ms`);
    console.log(`  - Scroll Events: ${metric.scrollEvents}`);
  });
}, 5000);
```

### Performance Dashboard Widget

```html
<!-- Add to admin dashboard -->
<div class="admin-card" style="margin-top: 16px;">
  <h3 style="margin: 0 0 12px 0;">Virtual Scroller Performance</h3>
  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
    <div style="background: #F1F5F9; padding: 12px; border-radius: 8px;">
      <div style="font-size: 0.75rem; color: #64748B; font-weight: 600;">DOM Reduction</div>
      <div id="perf-dom-reduction" style="font-size: 1.5rem; font-weight: 700; color: #1E293B;">--</div>
    </div>
    <div style="background: #F1F5F9; padding: 12px; border-radius: 8px;">
      <div style="font-size: 0.75rem; color: #64748B; font-weight: 600;">Render Time</div>
      <div id="perf-render-time" style="font-size: 1.5rem; font-weight: 700; color: #1E293B;">--</div>
    </div>
    <div style="background: #F1F5F9; padding: 12px; border-radius: 8px;">
      <div style="font-size: 0.75rem; color: #64748B; font-weight: 600;">DOM Nodes</div>
      <div id="perf-dom-nodes" style="font-size: 1.5rem; font-weight: 700; color: #1E293B;">--</div>
    </div>
    <div style="background: #F1F5F9; padding: 12px; border-radius: 8px;">
      <div style="font-size: 0.75rem; color: #64748B; font-weight: 600;">Scroll Events</div>
      <div id="perf-scroll-events" style="font-size: 1.5rem; font-weight: 700; color: #1E293B;">--</div>
    </div>
  </div>
</div>

<script>
// Update performance metrics
setInterval(() => {
  const metrics = getVirtualScrollerMetrics();
  if (Object.keys(metrics).length > 0) {
    const firstMetric = Object.values(metrics)[0];
    document.getElementById('perf-dom-reduction').textContent = firstMetric.domReduction;
    document.getElementById('perf-render-time').textContent = firstMetric.renderTime.toFixed(2) + 'ms';
    document.getElementById('perf-dom-nodes').textContent = firstMetric.domNodesCount;
    document.getElementById('perf-scroll-events').textContent = firstMetric.scrollEvents;
  }
}, 1000);
</script>
```

---

## Troubleshooting Integration

### Virtual Scroller Not Showing

```javascript
// Check if scripts are loaded
console.log('VirtualScroller:', typeof VirtualScroller);
console.log('initVirtualScrollerForExam:', typeof initVirtualScrollerForExam);

// Check if container exists
console.log('Container:', document.getElementById('exam-table-exam-001'));
```

### Filters Not Working

```javascript
// Verify filter function is called
window.handleMonitoringFilterChange = function() {
  console.log('Filter change triggered');
  // ... rest of function
};

// Check if scrollers exist
console.log('Virtual Scrollers:', window.virtualScrollers);
```

### Memory Issues

```javascript
// Monitor memory usage
if (performance.memory) {
  setInterval(() => {
    const used = (performance.memory.usedJSHeapSize / 1048576).toFixed(2);
    console.log(`Memory: ${used}MB`);
  }, 5000);
}

// Ensure cleanup
window.addEventListener('beforeunload', () => {
  console.log('Cleaning up virtual scrollers...');
  cleanupVirtualScrollers();
});
```

---

## Rollback Plan

If issues occur, rollback to pagination:

```javascript
// Revert to old rendering function
window.renderAdminDashboard = function() {
  renderAdminDashboardOptimized(window.adminState.monitor);
};

// Remove virtual scroll scripts
// - Remove <script src="modules/virtual-scroller.js"></script>
// - Remove <link rel="stylesheet" href="modules/virtual-scroller.css">
// - Remove <script src="admin-monitoring-virtual-scroll.js"></script>

// Revert filter handlers
document.getElementById('mon-search').addEventListener('input', () => {
  renderAdminDashboard();
});
```

---

## Performance Targets

After integration, verify:

| Metric | Target | How to Check |
|--------|--------|-------------|
| DOM Reduction | 94%+ | `getVirtualScrollerMetrics()` |
| Render Time | <16.67ms | DevTools Performance tab |
| Scroll FPS | 58-60fps | DevTools Performance tab |
| Memory Stable | ±5MB | DevTools Memory tab |
| Search Response | <300ms | Manual test |

---

## Next Steps

1. ✅ Include scripts
2. ✅ Update HTML
3. ✅ Update functions
4. ✅ Add cleanup
5. ✅ Test integration
6. ✅ Tune configuration
7. ✅ Monitor performance
8. ✅ Deploy to production

---

## Support

For integration issues:
1. Check this guide
2. Review troubleshooting section
3. Enable debug mode
4. Check browser console
5. Run test suite
