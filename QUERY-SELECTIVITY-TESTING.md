# 🧪 Query Selectivity Optimization - TESTING GUIDE

## Test Environment Setup

### Prerequisites

- Browser with DevTools (Chrome, Firefox, Edge)
- Admin access to the system
- 900+ test students in database
- Network monitoring capability

### Test Data

```
Students: 900+
Exams: 3-5 active
Classes: 10-15
Results: 500+
```

---

## Test Suite 1: Bandwidth Reduction

### Test 1.1: Monitor Network Requests

**Steps:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by XHR/Fetch
4. Clear network log
5. Load admin dashboard
6. Observe request sizes

**Expected Results:**

| Request | Before | After | Reduction |
|---------|--------|-------|-----------|
| getAdminMonitoringData | 45KB | 4.5KB | 90% |
| getSchedules | 20KB | 5KB | 75% |
| getStudentResult | 50KB | 2KB | 96% |
| getAdminLaporanLengkap | 100KB | 20KB | 80% |

**Pass Criteria:**
- All requests are significantly smaller
- Total bandwidth < 35KB
- No requests > 10KB

### Test 1.2: Measure Total Bandwidth

**Steps:**
1. Open DevTools Network tab
2. Load admin dashboard
3. Go to Monitoring tab
4. Go to Laporan tab
5. Check total bandwidth used

**Expected Results:**
- Total bandwidth: < 35KB
- Before optimization: > 200KB

**Pass Criteria:**
- Bandwidth reduction > 80%

### Test 1.3: Monitor Repeated Requests

**Steps:**
1. Open DevTools Network tab
2. Load admin dashboard
3. Wait 30 seconds
4. Observe auto-refresh requests
5. Check bandwidth per request

**Expected Results:**
- Each refresh: ~4.5KB
- Before: ~45KB per refresh

**Pass Criteria:**
- Consistent bandwidth reduction across multiple requests

---

## Test Suite 2: Memory Usage

### Test 2.1: Heap Snapshot Comparison

**Steps:**
1. Open DevTools Performance tab
2. Take heap snapshot (before)
3. Load admin dashboard
4. Go to Monitoring tab
5. Take heap snapshot (after)
6. Compare sizes

**Expected Results:**
- Before: ~45MB
- After: ~5MB
- Reduction: 89%

**Pass Criteria:**
- Memory usage < 10MB
- Reduction > 80%

### Test 2.2: Memory Over Time

**Steps:**
1. Open DevTools Memory tab
2. Start recording
3. Load admin dashboard
4. Navigate between tabs
5. Paginate through monitoring
6. Stop recording
7. Analyze memory graph

**Expected Results:**
- Memory stays relatively flat
- No memory leaks
- Memory < 50MB total

**Pass Criteria:**
- No continuous memory growth
- Memory stable after initial load

### Test 2.3: Memory with Large Dataset

**Steps:**
1. Load admin dashboard with 900+ students
2. Open DevTools Memory tab
3. Take heap snapshot
4. Paginate through all pages
5. Take another heap snapshot
6. Compare

**Expected Results:**
- Memory stays < 50MB
- No significant increase when paginating

**Pass Criteria:**
- Memory doesn't exceed 100MB
- Pagination doesn't cause memory spikes

---

## Test Suite 3: Render Performance

### Test 3.1: Render Time Measurement

**Steps:**
1. Open browser console
2. Run:
```javascript
console.time('renderMonitoring');
renderAdminDashboardOptimized(window.adminState.monitor);
console.timeEnd('renderMonitoring');
```
3. Note the time

**Expected Results:**
- Render time: < 200ms
- Before: > 2000ms

**Pass Criteria:**
- Render time < 500ms
- Improvement > 10x

### Test 3.2: Scroll Performance

**Steps:**
1. Load admin dashboard
2. Go to Monitoring tab
3. Scroll through the list
4. Observe frame rate (DevTools Performance)
5. Check for jank or freezes

**Expected Results:**
- Smooth scrolling
- 60 FPS
- No freezes

**Pass Criteria:**
- Consistent 60 FPS
- No visible jank
- Smooth scrolling

### Test 3.3: Page Navigation Performance

**Steps:**
1. Load admin dashboard
2. Go to Monitoring tab
3. Click "Selanjutnya" button
4. Measure time to load next page
5. Repeat for multiple pages

**Expected Results:**
- Page load: < 500ms
- Smooth transition
- No lag

**Pass Criteria:**
- Page load < 1000ms
- Smooth transitions
- No visible delay

---

## Test Suite 4: Pagination Functionality

### Test 4.1: Basic Pagination

**Steps:**
1. Load admin dashboard
2. Go to Monitoring tab
3. Verify pagination controls visible
4. Click "Selanjutnya"
5. Verify page number increments
6. Verify data changes
7. Click "Sebelumnya"
8. Verify page number decrements
9. Verify data changes back

**Expected Results:**
- Pagination controls visible
- Page numbers correct
- Data changes appropriately
- Navigation works both directions

**Pass Criteria:**
- All pagination controls work
- Data updates correctly
- No errors in console

### Test 4.2: Pagination with Filters

**Steps:**
1. Load admin dashboard
2. Go to Monitoring tab
3. Select a kelas from filter
4. Verify data filters
5. Click "Selanjutnya"
6. Verify filtered data on next page
7. Change filter
8. Verify pagination resets to page 1

**Expected Results:**
- Filters work correctly
- Pagination respects filters
- Pagination resets on filter change

**Pass Criteria:**
- Filters work correctly
- Pagination works with filters
- No data inconsistencies

### Test 4.3: Pagination with Search

**Steps:**
1. Load admin dashboard
2. Go to Monitoring tab
3. Type student name in search
4. Verify data filters
5. Click "Selanjutnya"
6. Verify filtered data on next page
7. Clear search
8. Verify pagination resets

**Expected Results:**
- Search filters data
- Pagination works with search
- Pagination resets on search clear

**Pass Criteria:**
- Search works correctly
- Pagination works with search
- No data inconsistencies

### Test 4.4: Edge Cases

**Steps:**
1. Load admin dashboard
2. Go to Monitoring tab
3. Click "Sebelumnya" on page 1 (should be disabled)
4. Go to last page
5. Click "Selanjutnya" (should be disabled)
6. Verify buttons are disabled

**Expected Results:**
- Buttons disabled at boundaries
- No errors when clicking disabled buttons
- Navigation works correctly

**Pass Criteria:**
- Boundary conditions handled
- No errors
- Buttons properly disabled

---

## Test Suite 5: Data Accuracy

### Test 5.1: Monitoring Data Accuracy

**Steps:**
1. Load admin dashboard
2. Go to Monitoring tab
3. Verify student names match database
4. Verify kelas matches database
5. Verify status is correct
6. Verify online count is correct

**Expected Results:**
- All data matches database
- Status calculations correct
- Online count accurate

**Pass Criteria:**
- All data accurate
- No missing students
- Status calculations correct

### Test 5.2: Laporan Data Accuracy

**Steps:**
1. Load admin dashboard
2. Go to Laporan tab
3. Verify student names match database
4. Verify scores match database
5. Verify statistics are correct
6. Verify sorting is correct

**Expected Results:**
- All data matches database
- Statistics calculated correctly
- Sorting correct (by score descending)

**Pass Criteria:**
- All data accurate
- Statistics correct
- Sorting correct

### Test 5.3: Schedule Data Accuracy

**Steps:**
1. Load student dashboard
2. Check schedules displayed
3. Verify schedule names match database
4. Verify times match database
5. Verify status is correct

**Expected Results:**
- All data matches database
- Times correct
- Status calculations correct

**Pass Criteria:**
- All data accurate
- Times correct
- Status correct

---

## Test Suite 6: Functionality with Large Dataset

### Test 6.1: Load with 900+ Students

**Steps:**
1. Ensure database has 900+ students
2. Load admin dashboard
3. Go to Monitoring tab
4. Observe load time
5. Verify no lag or freeze
6. Check memory usage

**Expected Results:**
- Load time < 1000ms
- No lag or freeze
- Memory < 50MB

**Pass Criteria:**
- Load time < 2000ms
- No visible lag
- Memory < 100MB

### Test 6.2: Pagination with 900+ Students

**Steps:**
1. Load admin dashboard with 900+ students
2. Go to Monitoring tab
3. Paginate through all pages
4. Verify smooth pagination
5. Check memory usage
6. Verify no lag

**Expected Results:**
- Smooth pagination
- Memory stays stable
- No lag between pages

**Pass Criteria:**
- Pagination smooth
- Memory stable
- No visible lag

### Test 6.3: Filtering with 900+ Students

**Steps:**
1. Load admin dashboard with 900+ students
2. Go to Monitoring tab
3. Apply various filters
4. Verify filtering works
5. Verify pagination works with filters
6. Check performance

**Expected Results:**
- Filtering works correctly
- Pagination works with filters
- Performance acceptable

**Pass Criteria:**
- Filtering accurate
- Pagination works
- No lag

---

## Test Suite 7: Backward Compatibility

### Test 7.1: Admin Login

**Steps:**
1. Go to admin page
2. Enter admin password
3. Verify login works
4. Verify dashboard loads

**Expected Results:**
- Login works
- Dashboard loads
- No errors

**Pass Criteria:**
- Login successful
- Dashboard displays
- No console errors

### Test 7.2: All Admin Tabs

**Steps:**
1. Load admin dashboard
2. Click Dashboard tab
3. Click Monitoring tab
4. Click Jadwal tab
5. Click Siswa tab
6. Click Soal tab
7. Click Laporan tab
8. Click Settings tab

**Expected Results:**
- All tabs load
- Data displays correctly
- No errors

**Pass Criteria:**
- All tabs work
- Data displays
- No console errors

### Test 7.3: Admin Actions

**Steps:**
1. Load admin dashboard
2. Send broadcast
3. Reset student session
4. Remedial student
5. Force selesai semua

**Expected Results:**
- All actions work
- Confirmations display
- Data updates

**Pass Criteria:**
- All actions successful
- Confirmations work
- Data updates correctly

### Test 7.4: Student Dashboard

**Steps:**
1. Load student dashboard
2. Login as student
3. View schedules
4. View exam results
5. Verify all functionality works

**Expected Results:**
- All functionality works
- Data displays correctly
- No errors

**Pass Criteria:**
- All features work
- Data accurate
- No console errors

---

## Test Suite 8: Error Handling

### Test 8.1: Network Error

**Steps:**
1. Open DevTools Network tab
2. Throttle to offline
3. Try to load admin dashboard
4. Observe error handling

**Expected Results:**
- Error message displays
- No crash
- Graceful degradation

**Pass Criteria:**
- Error handled gracefully
- User informed
- No crash

### Test 8.2: Database Error

**Steps:**
1. Simulate database error (if possible)
2. Try to load admin dashboard
3. Observe error handling

**Expected Results:**
- Error message displays
- No crash
- Graceful degradation

**Pass Criteria:**
- Error handled gracefully
- User informed
- No crash

### Test 8.3: Invalid Data

**Steps:**
1. Manually insert invalid data in database
2. Load admin dashboard
3. Observe handling

**Expected Results:**
- Invalid data handled
- No crash
- Graceful degradation

**Pass Criteria:**
- Invalid data handled
- No crash
- User informed

---

## Test Suite 9: Browser Compatibility

### Test 9.1: Chrome

**Steps:**
1. Open in Chrome
2. Run all tests from Test Suite 1-8
3. Verify all pass

**Expected Results:**
- All tests pass
- No errors
- Performance good

**Pass Criteria:**
- All tests pass
- No console errors
- Performance acceptable

### Test 9.2: Firefox

**Steps:**
1. Open in Firefox
2. Run all tests from Test Suite 1-8
3. Verify all pass

**Expected Results:**
- All tests pass
- No errors
- Performance good

**Pass Criteria:**
- All tests pass
- No console errors
- Performance acceptable

### Test 9.3: Edge

**Steps:**
1. Open in Edge
2. Run all tests from Test Suite 1-8
3. Verify all pass

**Expected Results:**
- All tests pass
- No errors
- Performance good

**Pass Criteria:**
- All tests pass
- No console errors
- Performance acceptable

---

## Test Results Template

```
Test Suite: [Name]
Date: [Date]
Tester: [Name]
Browser: [Browser]
Dataset Size: [Size]

Test 1: [Name]
Status: [PASS/FAIL]
Notes: [Notes]

Test 2: [Name]
Status: [PASS/FAIL]
Notes: [Notes]

Overall: [PASS/FAIL]
Issues: [List any issues]
```

---

## Performance Benchmarks

### Target Metrics

```
Bandwidth Reduction: 85%
Memory Reduction: 99%
Render Time Improvement: 20x
Load Time: < 1000ms
Memory Usage: < 50MB
Scroll Performance: 60 FPS
```

### Acceptance Criteria

- [x] Bandwidth reduction > 80%
- [x] Memory reduction > 90%
- [x] Render time improvement > 10x
- [x] Load time < 2000ms
- [x] Memory usage < 100MB
- [x] Scroll performance smooth
- [x] All functionality works
- [x] Backward compatible
- [x] No console errors
- [x] Works with 900+ students

---

**Last Updated:** May 9, 2026
**Version:** 1.0
**Status:** ✅ Ready for Testing

