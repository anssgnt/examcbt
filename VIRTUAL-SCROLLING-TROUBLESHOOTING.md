# Virtual Scrolling - Troubleshooting Guide

## Common Issues & Solutions

### 1. Blank Space While Scrolling

**Symptom**: White/blank areas appear while scrolling, rows disappear and reappear

**Causes**:
- Buffer size too small
- Overscan value too low
- Row height mismatch

**Solutions**:

```javascript
// Increase buffer and overscan
const scroller = new VirtualScroller(container, items, 60, {
  bufferSize: 8,    // Increase from 5
  overscan: 5       // Increase from 3
});

// Or adjust row height if incorrect
const scroller = new VirtualScroller(container, items, 70, {
  // Ensure row height matches actual CSS height
});
```

**Prevention**:
- Always set fixed row height in CSS
- Test with different scroll speeds
- Increase buffer on slower devices

---

### 2. Slow Rendering / Jank

**Symptom**: Scrolling is choppy, FPS drops below 60

**Causes**:
- Complex renderRow function
- Heavy DOM operations
- Inefficient CSS selectors
- Too many event listeners

**Solutions**:

```javascript
// ❌ Bad: Complex calculations in renderRow
renderRow: (item, index) => {
  const processed = expensiveCalculation(item);
  const formatted = formatDate(item.date);
  const computed = calculateStats(item);
  return `<div>${processed} ${formatted} ${computed}</div>`;
}

// ✓ Good: Pre-calculate before rendering
const processedItems = items.map(item => ({
  ...item,
  processed: expensiveCalculation(item),
  formatted: formatDate(item.date),
  computed: calculateStats(item)
}));

const scroller = new VirtualScroller(container, processedItems, 60, {
  renderRow: (item) => `<div>${item.processed} ${item.formatted} ${item.computed}</div>`
});
```

**Performance Tips**:

```javascript
// Use string concatenation instead of DOM operations
renderRow: (item) => `<div>${item.name}</div>` // ✓ Fast

// Avoid inline styles
renderRow: (item) => `<div style="color: red;">${item.name}</div>` // ✗ Slow

// Use CSS classes instead
renderRow: (item) => `<div class="item-name">${item.name}</div>` // ✓ Fast

// Avoid complex selectors
// ✗ Slow: .container > div > span:nth-child(2) > .text
// ✓ Fast: .item-text
```

**Debugging**:

```javascript
// Enable debug mode
const scroller = new VirtualScroller(container, items, 60, {
  enableDebug: true
});

// Monitor metrics
setInterval(() => {
  const metrics = scroller.getMetrics();
  console.log(`Render time: ${metrics.renderTime.toFixed(2)}ms`);
  console.log(`DOM nodes: ${metrics.domNodesCount}`);
}, 1000);

// Use Chrome DevTools Performance tab
// 1. Open DevTools (F12)
// 2. Go to Performance tab
// 3. Click Record
// 4. Scroll in scroller
// 5. Click Stop
// 6. Analyze FPS and rendering time
```

---

### 3. Memory Leak

**Symptom**: Memory usage keeps increasing, browser becomes slow

**Causes**:
- Not calling destroy()
- Event listeners not removed
- ResizeObserver not disconnected
- Circular references

**Solutions**:

```javascript
// Always cleanup
const scroller = new VirtualScroller(container, items, 60);

// On page unload
window.addEventListener('beforeunload', () => {
  scroller.destroy();
});

// Or when removing from DOM
function removeScroller() {
  scroller.destroy();
  container.remove();
}

// For multiple scrollers
const scrollers = {};

function createScroller(id, items) {
  scrollers[id] = new VirtualScroller(
    document.getElementById(`container-${id}`),
    items,
    60
  );
}

function cleanupAllScrollers() {
  Object.values(scrollers).forEach(scroller => {
    scroller.destroy();
  });
  scrollers = {};
}

window.addEventListener('beforeunload', cleanupAllScrollers);
```

**Monitoring**:

```javascript
// Check memory usage
if (performance.memory) {
  setInterval(() => {
    const used = (performance.memory.usedJSHeapSize / 1048576).toFixed(2);
    const limit = (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2);
    console.log(`Memory: ${used}MB / ${limit}MB`);
  }, 5000);
}
```

---

### 4. Filter Not Working

**Symptom**: Filter function doesn't update displayed items

**Causes**:
- Filter function returns wrong type
- Filter not applied to correct scroller
- Items not updated after filter

**Solutions**:

```javascript
// ❌ Wrong: Filter returns truthy/falsy instead of boolean
scroller.filter(item => item.status); // Returns string, not boolean

// ✓ Correct: Filter returns boolean
scroller.filter(item => item.status === 'active');

// ❌ Wrong: Complex filter logic
scroller.filter(item => {
  if (item.status === 'active') {
    return item.value > 100;
  }
  return false;
});

// ✓ Correct: Simple, clear logic
scroller.filter(item => 
  item.status === 'active' && item.value > 100
);

// ❌ Wrong: Filter not applied to all scrollers
handleMonitoringFilterChange(); // Only filters one scroller

// ✓ Correct: Filter all scrollers
Object.values(window.virtualScrollers).forEach(scroller => {
  scroller.filter(item => item.status === 'active');
});
```

**Testing Filter**:

```javascript
// Test filter function separately
const testFilter = item => item.status === 'active';
const filtered = items.filter(testFilter);
console.log(`Filtered: ${filtered.length} items`);

// Then apply to scroller
scroller.filter(testFilter);
```

---

### 5. Sort Not Working

**Symptom**: Items don't sort, or sort order is wrong

**Causes**:
- Sort key doesn't exist on items
- Data type mismatch (string vs number)
- Sort not applied to correct scroller

**Solutions**:

```javascript
// ❌ Wrong: Sort key doesn't exist
scroller.sort('fullName', 'asc'); // Item has 'name', not 'fullName'

// ✓ Correct: Use existing key
scroller.sort('name', 'asc');

// ❌ Wrong: Sorting strings as numbers
scroller.sort('value', 'asc'); // "100" < "20" (string comparison)

// ✓ Correct: Convert to number first
const items = data.map(item => ({
  ...item,
  value: parseInt(item.value)
}));
scroller.updateItems(items);
scroller.sort('value', 'asc');

// ❌ Wrong: Sort direction typo
scroller.sort('name', 'ascending'); // Should be 'asc' or 'desc'

// ✓ Correct: Use 'asc' or 'desc'
scroller.sort('name', 'asc');
scroller.sort('name', 'desc');
```

**Debugging Sort**:

```javascript
// Check if sort key exists
console.log(Object.keys(items[0])); // See available keys

// Test sort function
const testSort = (a, b) => {
  if (a.name < b.name) return -1;
  if (a.name > b.name) return 1;
  return 0;
};
const sorted = [...items].sort(testSort);
console.log('Sorted:', sorted);

// Then apply to scroller
scroller.sort('name', 'asc');
```

---

### 6. Scroll Position Lost After Update

**Symptom**: Scroll position resets to top after updating items

**Causes**:
- updateItems() resets scroll position
- Filter/sort clears scroll position
- Container height changed

**Solutions**:

```javascript
// Save scroll position before update
const scrollTop = scroller.viewport.scrollTop;

// Update items
scroller.updateItems(newItems);

// Restore scroll position
scroller.viewport.scrollTop = scrollTop;

// Or use scrollToItem
const currentIndex = Math.floor(scrollTop / scroller.rowHeight);
scroller.updateItems(newItems);
scroller.scrollToItem(currentIndex, 'start');

// For filter/sort, scroll position is preserved automatically
scroller.filter(item => item.status === 'active');
// Scroll position is maintained
```

---

### 7. Container Height Issues

**Symptom**: Scroller doesn't fill container, or overflows

**Causes**:
- Container height not set
- Parent container height not set
- CSS conflicts

**Solutions**:

```html
<!-- ❌ Wrong: No height set -->
<div id="scroller"></div>

<!-- ✓ Correct: Fixed height -->
<div id="scroller" style="height: 400px;"></div>

<!-- ✓ Correct: Flex layout -->
<div style="display: flex; height: 100vh;">
  <div id="scroller" style="flex: 1;"></div>
</div>

<!-- ✓ Correct: Grid layout -->
<div style="display: grid; grid-template-rows: 1fr; height: 100vh;">
  <div id="scroller"></div>
</div>
```

**CSS Debugging**:

```javascript
// Check actual container height
const container = document.getElementById('scroller');
console.log('Container height:', container.clientHeight);
console.log('Container width:', container.clientWidth);

// Check computed styles
const styles = window.getComputedStyle(container);
console.log('Height:', styles.height);
console.log('Overflow:', styles.overflow);
```

---

### 8. Row Height Mismatch

**Symptom**: Rows overlap, gaps between rows, scrollbar position wrong

**Causes**:
- Row height in JS doesn't match CSS
- Padding/margin not accounted for
- Dynamic row heights

**Solutions**:

```javascript
// ❌ Wrong: Row height doesn't match CSS
// CSS: height: 70px; padding: 10px;
// JS: rowHeight: 60
const scroller = new VirtualScroller(container, items, 60);

// ✓ Correct: Row height includes padding
// CSS: height: 50px; padding: 10px; (total: 70px)
// JS: rowHeight: 70
const scroller = new VirtualScroller(container, items, 70);

// Measure actual row height
const tempRow = document.createElement('div');
tempRow.className = 'virtual-scroller-row';
tempRow.innerHTML = '<div>Test</div>';
container.appendChild(tempRow);
const actualHeight = tempRow.offsetHeight;
tempRow.remove();
console.log('Actual row height:', actualHeight);

// Use measured height
const scroller = new VirtualScroller(container, items, actualHeight);
```

---

### 9. Search/Filter Performance Issues

**Symptom**: Search is slow, UI freezes while typing

**Causes**:
- Filter applied on every keystroke
- Complex filter logic
- Large dataset

**Solutions**:

```javascript
// ❌ Wrong: Filter on every keystroke
document.getElementById('search').addEventListener('input', (e) => {
  scroller.filter(item => item.name.includes(e.target.value));
});

// ✓ Correct: Debounce filter
let filterTimeout;
document.getElementById('search').addEventListener('input', (e) => {
  clearTimeout(filterTimeout);
  filterTimeout = setTimeout(() => {
    scroller.filter(item => item.name.includes(e.target.value));
  }, 300); // Wait 300ms after user stops typing
});

// ✓ Correct: Case-insensitive search
let filterTimeout;
document.getElementById('search').addEventListener('input', (e) => {
  clearTimeout(filterTimeout);
  const query = e.target.value.toLowerCase();
  filterTimeout = setTimeout(() => {
    scroller.filter(item => item.name.toLowerCase().includes(query));
  }, 300);
});

// ✓ Correct: Pre-filter before scroller
const allItems = [...items];
let filterTimeout;
document.getElementById('search').addEventListener('input', (e) => {
  clearTimeout(filterTimeout);
  const query = e.target.value.toLowerCase();
  filterTimeout = setTimeout(() => {
    const filtered = allItems.filter(item => 
      item.name.toLowerCase().includes(query)
    );
    scroller.updateItems(filtered);
  }, 300);
});
```

---

### 10. Browser Compatibility Issues

**Symptom**: Scroller doesn't work in certain browsers

**Causes**:
- Missing ResizeObserver support
- Transform not supported
- Scroll event not fired

**Solutions**:

```javascript
// Check browser support
const hasResizeObserver = 'ResizeObserver' in window;
const hasTransform = 'transform' in document.body.style;

if (!hasResizeObserver || !hasTransform) {
  console.warn('Virtual Scroller not fully supported in this browser');
  // Fallback to pagination
  usePaginationInstead();
}

// Polyfill for ResizeObserver (if needed)
if (!window.ResizeObserver) {
  // Use fallback: window resize event
  window.addEventListener('resize', () => {
    scroller.updateContainerHeight();
    scroller.render();
  });
}

// Test in different browsers
// Chrome/Edge: Full support
// Firefox: Full support
// Safari: Full support (iOS 13+)
// IE11: Not supported
```

---

## Performance Checklist

- [ ] Row height is fixed and matches CSS
- [ ] renderRow function is simple (string concatenation)
- [ ] Buffer size is adequate (5-8)
- [ ] Overscan is set (3-5)
- [ ] Filter/sort debounced
- [ ] destroy() called on cleanup
- [ ] No memory leaks (check DevTools)
- [ ] 60fps scrolling (check Performance tab)
- [ ] DOM reduction 94%+ (check metrics)
- [ ] Tested with 900+ items

---

## Debug Mode

Enable comprehensive debugging:

```javascript
const scroller = new VirtualScroller(container, items, 60, {
  enableDebug: true
});

// Monitor in console
setInterval(() => {
  const metrics = scroller.getMetrics();
  console.table(metrics);
}, 1000);

// Log scroll events
scroller.options.onScroll = (data) => {
  console.log('Scroll:', data);
};
```

---

## Getting Help

1. **Check this guide** - Most issues are covered
2. **Enable debug mode** - See what's happening
3. **Check browser console** - Look for errors
4. **Run test suite** - `test-virtual-scroller.html`
5. **Review metrics** - Use `getMetrics()`
6. **Check DevTools** - Performance tab for FPS
7. **Verify configuration** - Row height, buffer, overscan

---

## Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Blank space | Increase bufferSize |
| Slow scroll | Simplify renderRow |
| Memory leak | Call destroy() |
| Filter broken | Return boolean |
| Sort wrong | Check data type |
| Height wrong | Set fixed height |
| Scroll lost | Save/restore position |
| Performance bad | Check DevTools |

---

## Contact & Support

For additional help:
- Review full documentation: `VIRTUAL-SCROLLING-IMPLEMENTATION.md`
- Check quick reference: `VIRTUAL-SCROLLING-QUICK-REFERENCE.md`
- Run test suite: `test-virtual-scroller.html`
- Enable debug mode: `enableDebug: true`
