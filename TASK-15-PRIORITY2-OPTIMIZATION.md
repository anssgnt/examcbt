# TASK 15 - Priority 2 Optimization (Code Splitting & Lazy Loading)

## Status: PLANNING

## Objective
Implement Priority 2 performance fixes untuk reduce file sizes dan improve load time.

## Priority 2 Fixes

### 1. Split `admin-core.js` (80 KB)
**Current**: Single 80 KB file with all admin logic
**Target**: Split into logical modules

**Proposed Structure:**
```
admin-core.js (20 KB) - Core functions
├── admin-dashboard.js (15 KB) - Dashboard rendering
├── admin-monitoring.js (15 KB) - Monitoring logic
├── admin-results.js (15 KB) - Results & grading
├── admin-settings.js (10 KB) - Settings management
└── admin-broadcast.js (5 KB) - Broadcast functions
```

**Benefits:**
- Lazy load only needed modules
- Reduce initial load time
- Better code organization
- Easier maintenance

**Implementation:**
```javascript
// admin-core.js - Load modules on demand
window.loadAdminModule = async (moduleName) => {
  if (window[moduleName + 'Loaded']) return;
  const script = document.createElement('script');
  script.src = `/admin-${moduleName}.js`;
  document.head.appendChild(script);
  window[moduleName + 'Loaded'] = true;
};

// Load dashboard module when needed
window.loadAdminDashboard = async function() {
  await window.loadAdminModule('dashboard');
  // Call dashboard function
};
```

---

### 2. Lazy Load `supabase-patch.js` (70 KB)
**Current**: Loaded on every page
**Target**: Load only when needed (admin page)

**Implementation:**
```javascript
// Only load on admin.html
if (window.location.pathname.includes('admin.html')) {
  const script = document.createElement('script');
  script.src = '/supabase-patch.js';
  document.head.appendChild(script);
}
```

**Benefits:**
- Reduce initial load time on exam page
- Faster page load for students
- Only admin needs Supabase patch

---

### 3. Event Delegation for Listeners
**Current**: Many addEventListener calls
**Target**: Use event delegation

**Before:**
```javascript
document.getElementById('btn1').addEventListener('click', handler1);
document.getElementById('btn2').addEventListener('click', handler2);
document.getElementById('btn3').addEventListener('click', handler3);
// ... many more
```

**After:**
```javascript
document.addEventListener('click', (e) => {
  if (e.target.id === 'btn1') handler1();
  if (e.target.id === 'btn2') handler2();
  if (e.target.id === 'btn3') handler3();
});
```

**Benefits:**
- Reduce memory usage
- Faster initialization
- Better performance on low-end devices

---

### 4. Optimize Object Iteration
**Current**: Iterates entire objects
**Target**: Use Map/Set for better performance

**Before:**
```javascript
for (let id in data) {
  if (data.hasOwnProperty(id)) {
    // Process item
  }
}
```

**After:**
```javascript
const dataMap = new Map(Object.entries(data));
dataMap.forEach((value, key) => {
  // Process item
});
```

**Benefits:**
- Faster iteration
- Better memory usage
- Cleaner code

---

## Implementation Plan

### Phase 1: Lazy Load Supabase Patch (Easy - 15 min)
1. Add conditional loading in HTML
2. Load only on admin.html
3. Test on exam page (should be faster)

### Phase 2: Event Delegation (Medium - 30 min)
1. Identify all addEventListener calls
2. Consolidate into single listener
3. Test all buttons work

### Phase 3: Split Admin Core (Hard - 2 hours)
1. Identify logical modules
2. Extract functions into separate files
3. Implement lazy loading
4. Test all admin functions

### Phase 4: Optimize Iteration (Medium - 30 min)
1. Find all object iterations
2. Convert to Map/Set where beneficial
3. Test performance

---

## Expected Performance Gains

| Change | Impact | Effort |
|--------|--------|--------|
| Lazy load supabase-patch | -25% load time | 15 min |
| Event delegation | -10% memory | 30 min |
| Split admin-core | -30% load time | 2 hours |
| Optimize iteration | -5% CPU | 30 min |

**Total Potential Improvement**: 40-60% faster on low-end devices

---

## Deployment Strategy

### Week 1: Lazy Load Supabase Patch
- [ ] Implement conditional loading
- [ ] Test on exam page
- [ ] Deploy to Netlify
- [ ] Monitor performance

### Week 2: Event Delegation
- [ ] Consolidate listeners
- [ ] Test all buttons
- [ ] Deploy to Netlify
- [ ] Monitor memory usage

### Week 3: Split Admin Core
- [ ] Extract modules
- [ ] Implement lazy loading
- [ ] Test all admin functions
- [ ] Deploy to Netlify

### Week 4: Optimize Iteration
- [ ] Convert to Map/Set
- [ ] Test performance
- [ ] Deploy to Netlify
- [ ] Final optimization

---

## Testing Checklist

### Functional Testing
- [ ] All admin functions work
- [ ] All buttons respond
- [ ] No console errors
- [ ] Data loads correctly

### Performance Testing
- [ ] Page load time < 2s
- [ ] Admin load time < 1s
- [ ] Memory usage < 50MB
- [ ] CPU usage < 20%

### Device Testing
- [ ] Desktop (Chrome, Firefox)
- [ ] Mobile (Android 5.0+)
- [ ] Low-end device (1GB RAM)
- [ ] High-end device (8GB RAM)

---

## Rollback Plan

If issues occur:
```bash
# Revert changes
git revert <commit-hash>

# Push to GitHub
git push origin master

# Netlify auto-redeploys
```

---

## Next Steps

### Immediate (Today)
1. ✅ Plan Priority 2 fixes
2. ⏳ Start with lazy load supabase-patch
3. ⏳ Test on exam page

### Short-term (This Week)
1. ⏳ Implement event delegation
2. ⏳ Test all buttons
3. ⏳ Deploy to Netlify

### Medium-term (Next Week)
1. ⏳ Split admin-core.js
2. ⏳ Implement lazy loading
3. ⏳ Deploy to Netlify

### Long-term (Next Month)
1. ⏳ Optimize object iteration
2. ⏳ Final performance tuning
3. ⏳ Monitor production metrics

---

## Performance Analysis Reference

See `PERFORMANCE-ANALYSIS.md` for:
- Detailed bottleneck analysis
- All 9 optimization opportunities
- Implementation plan
- Performance targets

---

## Summary

**TASK 15 - Priority 2 Optimization Planning**

4 optimization opportunities:
1. Lazy load supabase-patch.js (70 KB)
2. Event delegation for listeners
3. Split admin-core.js (80 KB)
4. Optimize object iteration

**Expected Performance Gain**: 40-60% improvement
**Risk Level**: Low (backward compatible)
**Deployment**: Phased approach

---

**Status**: ✅ PLANNING COMPLETE
**Next Action**: Implement lazy load supabase-patch
**Estimated Time**: 4 weeks for all Priority 2 fixes
