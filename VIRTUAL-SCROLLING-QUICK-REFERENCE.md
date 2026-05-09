# Virtual Scrolling - Quick Reference Guide

## 🚀 Quick Start

### 1. Include Scripts

```html
<script src="modules/virtual-scroller.js"></script>
<script src="admin-monitoring-virtual-scroll.js"></script>
```

### 2. Create Container

```html
<div id="my-scroller" style="height: 400px;"></div>
```

### 3. Initialize Scroller

```javascript
const scroller = new VirtualScroller(
  document.getElementById('my-scroller'),
  items,           // Array of items
  60,              // Row height in pixels
  {
    renderRow: (item, index) => `<div>${item.name}</div>`
  }
);
```

## 📊 Common Operations

### Sort Items

```javascript
// Sort ascending
scroller.sort('name', 'asc');

// Sort descending
scroller.sort('value', 'desc');
```

### Filter Items

```javascript
// Filter by condition
scroller.filter(item => item.status === 'active');

// Clear filter
scroller.clearFilter();
```

### Update Items

```javascript
scroller.updateItems(newItems);
```

### Scroll to Item

```javascript
// Scroll to top
scroller.scrollToItem(0, 'start');

// Scroll to center
scroller.scrollToItem(100, 'center');

// Scroll to bottom
scroller.scrollToItem(items.length - 1, 'end');
```

### Get Metrics

```javascript
const metrics = scroller.getMetrics();
console.log(metrics);
// {
//   renderTime: 2.5,
//   scrollEvents: 42,
//   domNodesCount: 48,
//   domReduction: "94.67%",
//   itemsCount: 900,
//   visibleRange: "0-15",
//   renderedRange: "0-25"
// }
```

### Cleanup

```javascript
scroller.destroy();
```

## 🎯 Admin Monitoring Integration

### Initialize for Exam

```javascript
initVirtualScrollerForExam(
  'exam-001',           // Exam ID
  studentItems,         // Items array
  'exam-table-001'      // Container ID
);
```

### Render Dashboard

```javascript
renderAdminDashboardWithVirtualScroll(monitoringData);
```

### Handle Filters

```javascript
document.getElementById('mon-search').addEventListener('input', () => {
  handleMonitoringFilterChange();
});
```

### Get All Metrics

```javascript
const allMetrics = getVirtualScrollerMetrics();
// {
//   'exam-001': { ... },
//   'exam-002': { ... }
// }
```

### Cleanup All

```javascript
cleanupVirtualScrollers();
```

## ⚙️ Configuration Options

```javascript
{
  bufferSize: 5,           // Rows above/below viewport
  overscan: 3,             // Extra rows for smooth scroll
  renderRow: function,     // Custom row renderer (required)
  onScroll: function,      // Scroll callback
  enableDebug: false       // Debug logging
}
```

## 🎨 Custom Row Renderer

### Simple String

```javascript
renderRow: (item, index) => `
  <div style="padding: 10px;">
    ${index + 1}. ${item.name}
  </div>
`
```

### Complex HTML

```javascript
renderRow: (item, index) => `
  <div class="row">
    <div class="col-1">${index + 1}</div>
    <div class="col-2">${item.name}</div>
    <div class="col-3">
      <span class="badge ${item.status}">${item.status}</span>
    </div>
    <div class="col-4">
      <button onclick="handleClick('${item.id}')">Action</button>
    </div>
  </div>
`
```

### With Conditional Styling

```javascript
renderRow: (item, index) => {
  const statusClass = item.status === 'active' ? 'bg-green' : 'bg-red';
  return `
    <div class="row ${statusClass}">
      <span>${item.name}</span>
    </div>
  `;
}
```

## 📈 Performance Tips

### 1. Optimize Row Renderer

```javascript
// ❌ Slow: DOM operations
renderRow: (item) => {
  const div = document.createElement('div');
  div.innerHTML = item.name;
  return div;
}

// ✅ Fast: String concatenation
renderRow: (item) => `<div>${item.name}</div>`
```

### 2. Adjust Buffer Size

```javascript
// For smooth scrolling on slow devices
new VirtualScroller(container, items, 60, {
  bufferSize: 8,  // Increase buffer
  overscan: 5     // Increase overscan
});
```

### 3. Use Efficient Filters

```javascript
// ❌ Slow: Complex filter logic
scroller.filter(item => {
  return item.status === 'active' && 
         item.value > 100 && 
         item.name.includes('test');
});

// ✅ Fast: Pre-filter before scroller
const filtered = items.filter(item => 
  item.status === 'active' && 
  item.value > 100 && 
  item.name.includes('test')
);
scroller.updateItems(filtered);
```

### 4. Debounce Filter Changes

```javascript
let filterTimeout;
document.getElementById('search').addEventListener('input', (e) => {
  clearTimeout(filterTimeout);
  filterTimeout = setTimeout(() => {
    scroller.filter(item => 
      item.name.includes(e.target.value)
    );
  }, 300);
});
```

## 🐛 Troubleshooting

### Blank Space While Scrolling

```javascript
// Increase buffer
new VirtualScroller(container, items, 60, {
  bufferSize: 10,  // Was 5
  overscan: 5      // Was 3
});
```

### Slow Rendering

```javascript
// Simplify renderRow function
// Avoid complex calculations
// Use CSS classes instead of inline styles
```

### Memory Leak

```javascript
// Always cleanup
window.addEventListener('beforeunload', () => {
  scroller.destroy();
});
```

### Filter Not Working

```javascript
// Ensure filter returns boolean
scroller.filter(item => item.status === 'active'); // ✓
scroller.filter(item => item.status);              // ✗
```

### Scroll Position Lost

```javascript
// Save scroll position before update
const scrollTop = scroller.viewport.scrollTop;

// Update items
scroller.updateItems(newItems);

// Restore scroll position
scroller.viewport.scrollTop = scrollTop;
```

## 📋 Checklist

- [ ] Include `virtual-scroller.js` script
- [ ] Create container with fixed height
- [ ] Prepare items array
- [ ] Define `renderRow` function
- [ ] Initialize VirtualScroller
- [ ] Test with 900+ items
- [ ] Verify 60fps scrolling
- [ ] Check DOM reduction (94%+)
- [ ] Monitor memory usage
- [ ] Call `destroy()` on cleanup

## 🔍 Debugging

### Enable Debug Mode

```javascript
const scroller = new VirtualScroller(container, items, 60, {
  enableDebug: true  // Enable console logging
});
```

### Check Metrics

```javascript
setInterval(() => {
  const metrics = scroller.getMetrics();
  console.table(metrics);
}, 1000);
```

### Monitor Performance

```javascript
// In browser DevTools
// 1. Open Performance tab
// 2. Start recording
// 3. Scroll in scroller
// 4. Stop recording
// 5. Check FPS and rendering time
```

## 📚 Examples

### Example 1: Student List

```javascript
const students = [
  { id: 1, name: 'Ahmad', class: 'X-A', status: 'active' },
  { id: 2, name: 'Budi', class: 'X-B', status: 'inactive' },
  // ... 900+ more
];

const scroller = new VirtualScroller(
  document.getElementById('student-list'),
  students,
  60,
  {
    renderRow: (student, index) => `
      <div class="student-row">
        <span>${index + 1}</span>
        <span>${student.name}</span>
        <span>${student.class}</span>
        <span class="badge ${student.status}">${student.status}</span>
      </div>
    `
  }
);

// Search
document.getElementById('search').addEventListener('input', (e) => {
  scroller.filter(s => s.name.includes(e.target.value));
});

// Sort
document.getElementById('sort-btn').addEventListener('click', () => {
  scroller.sort('name', 'asc');
});
```

### Example 2: Admin Monitoring

```javascript
// Initialize for each exam
data.activeExams.forEach(exam => {
  initVirtualScrollerForExam(
    exam.id,
    exam.students,
    `exam-table-${exam.id}`
  );
});

// Handle filter changes
['mon-search', 'mon-filter-kelas', 'mon-filter-status'].forEach(id => {
  document.getElementById(id).addEventListener('change', () => {
    handleMonitoringFilterChange();
  });
});

// Get metrics
const metrics = getVirtualScrollerMetrics();
console.log('Performance:', metrics);
```

### Example 3: Infinite Scroll

```javascript
let page = 0;
const scroller = new VirtualScroller(container, items, 60, {
  renderRow: (item) => `<div>${item.name}</div>`,
  onScroll: async (scrollData) => {
    // Load more when near bottom
    if (scrollData.visibleEnd >= scrollData.itemsCount - 10) {
      const newItems = await loadMoreItems(++page);
      scroller.updateItems([...scroller.items, ...newItems]);
    }
  }
});
```

## 🎓 Learning Resources

- Full Documentation: `VIRTUAL-SCROLLING-IMPLEMENTATION.md`
- Test Suite: `test-virtual-scroller.html`
- Source Code: `modules/virtual-scroller.js`
- Integration: `admin-monitoring-virtual-scroll.js`

## 💡 Best Practices

1. **Always set fixed row height** - Required for accurate calculations
2. **Use string rendering** - Faster than DOM operations
3. **Debounce filter changes** - Prevent excessive re-renders
4. **Monitor metrics** - Track performance in production
5. **Test with real data** - Use actual dataset sizes
6. **Cleanup on destroy** - Prevent memory leaks
7. **Use CSS classes** - Faster than inline styles
8. **Avoid complex calculations** - Keep renderRow simple

## 🚨 Common Mistakes

```javascript
// ❌ Wrong: No fixed height
<div id="scroller"></div>

// ✓ Correct: Fixed height
<div id="scroller" style="height: 400px;"></div>

// ❌ Wrong: Complex renderRow
renderRow: (item) => {
  const processed = expensiveCalculation(item);
  return `<div>${processed}</div>`;
}

// ✓ Correct: Simple renderRow
renderRow: (item) => `<div>${item.name}</div>`

// ❌ Wrong: No cleanup
const scroller = new VirtualScroller(...);
// No destroy() call

// ✓ Correct: Cleanup
const scroller = new VirtualScroller(...);
window.addEventListener('beforeunload', () => {
  scroller.destroy();
});
```

## 📞 Support

For issues:
1. Check this quick reference
2. Review full documentation
3. Run test suite
4. Enable debug mode
5. Check browser console
