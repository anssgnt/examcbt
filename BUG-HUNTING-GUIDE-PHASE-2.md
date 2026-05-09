# Bug Hunting Guide - Phase 2 (Comprehensive Testing)

## Status
- **Phase 1-4**: ✅ Deployed & Optimized
- **Phase 5-9**: ✅ Deployed
- **Bug Fixes**: 
  - ✅ Session validation redirect loop
  - ✅ Service Worker infinite loop
  - ✅ Admin results 0 nilai indicator + re-grade

## Known Issues & Fixes Applied

### 1. ✅ Admin Results - 0 Nilai Bug (FIXED)
**Issue**: Students with 0 nilai tidak ada visual indicator
**Fix**: 
- Added red background + warning icon for 0 nilai
- Added "🔄 Re-grade" button to recalculate scores
- Function: `reGradeStudent(examId, userId, nama)`

**Testing**:
- [ ] Login to admin
- [ ] Go to Menu Hasil
- [ ] Verify 0 nilai shows with red background
- [ ] Click Re-grade button
- [ ] Verify score updates correctly

---

## Testing Checklist - Core Flows

### A. Login Flow
- [ ] **Desktop Login**
  - [ ] Select student from list
  - [ ] Verify session created
  - [ ] Check localStorage: `CBT_EXAM_SESSION` exists
  - [ ] Verify redirect to exam.html

- [ ] **Mobile Login**
  - [ ] Select student from list
  - [ ] Verify session created
  - [ ] Check localStorage: `CBT_LOGGED_USER` exists
  - [ ] Verify schedule loads

- [ ] **Multi-User Login**
  - [ ] Login as User A
  - [ ] Logout
  - [ ] Login as User B
  - [ ] Verify User A's data cleared
  - [ ] Verify User B's data correct

### B. Exam Flow
- [ ] **Start Exam**
  - [ ] Click "Mulai Ujian"
  - [ ] Verify questions load
  - [ ] Check console: no "Session not ready" errors
  - [ ] Verify timer starts

- [ ] **Answer Questions**
  - [ ] Select answer for Q1
  - [ ] Verify answer saved (check State.answers)
  - [ ] Navigate to Q2
  - [ ] Go back to Q1
  - [ ] Verify answer still selected

- [ ] **Navigation**
  - [ ] Use "Soal Sebelumnya" button
  - [ ] Use "Soal Berikutnya" button
  - [ ] Use question grid to jump
  - [ ] Verify current question updates

- [ ] **Timer**
  - [ ] Verify timer counts down
  - [ ] Verify timer display updates every second
  - [ ] Check console: no timer errors
  - [ ] Verify auto-submit when time = 0

### C. Submit Exam
- [ ] **Submit Process**
  - [ ] Click "Selesai Ujian"
  - [ ] Confirm dialog appears
  - [ ] Click "Ya, Selesai"
  - [ ] Verify loading indicator
  - [ ] Verify redirect to result page

- [ ] **Result Display**
  - [ ] Verify score displays correctly
  - [ ] Verify answer review shows
  - [ ] Verify "Kembali ke Jadwal" button works
  - [ ] Verify localStorage cleared after back

- [ ] **No Redirect Loop**
  - [ ] After submit, click "Kembali ke Jadwal"
  - [ ] Verify NOT redirected back to exam
  - [ ] Verify back to schedule page
  - [ ] Verify can select another exam

### D. Admin Dashboard
- [ ] **Dashboard Load**
  - [ ] Login as admin
  - [ ] Verify dashboard loads
  - [ ] Check console: no errors
  - [ ] Verify stats display

- [ ] **Menu Hasil**
  - [ ] Click "Menu Hasil"
  - [ ] Verify results table loads
  - [ ] Verify 0 nilai shows with red background
  - [ ] Verify pagination works

- [ ] **Re-grade Functionality**
  - [ ] Find student with 0 nilai
  - [ ] Click "🔄 Re-grade"
  - [ ] Confirm dialog
  - [ ] Verify score updates
  - [ ] Verify table refreshes

- [ ] **Delete Result**
  - [ ] Click "🗑️ Hapus"
  - [ ] Confirm dialog
  - [ ] Verify result deleted
  - [ ] Verify table refreshes

### E. Performance
- [ ] **Page Load**
  - [ ] Measure initial load time
  - [ ] Should be < 3 seconds
  - [ ] Check Network tab: all files loaded
  - [ ] Check console: no 404 errors

- [ ] **Exam Load**
  - [ ] Measure exam.html load time
  - [ ] Should be < 2 seconds
  - [ ] Verify questions load quickly
  - [ ] Check memory usage: < 50MB

- [ ] **Image Loading**
  - [ ] Verify images load smoothly
  - [ ] Check console: no image errors
  - [ ] Verify lazy loading works
  - [ ] Check cache hit rate

### F. Error Handling
- [ ] **Network Error**
  - [ ] Disconnect internet
  - [ ] Try to submit exam
  - [ ] Verify error message shows
  - [ ] Verify can retry

- [ ] **Session Timeout**
  - [ ] Wait for session to expire
  - [ ] Try to navigate
  - [ ] Verify redirect to login
  - [ ] Verify error message

- [ ] **Invalid Data**
  - [ ] Manually corrupt localStorage
  - [ ] Refresh page
  - [ ] Verify error handling
  - [ ] Verify can recover

### G. Mobile Responsiveness
- [ ] **Mobile Layout**
  - [ ] Test on mobile device
  - [ ] Verify layout responsive
  - [ ] Verify buttons clickable
  - [ ] Verify no horizontal scroll

- [ ] **Touch Events**
  - [ ] Test touch navigation
  - [ ] Test swipe gestures
  - [ ] Verify no lag
  - [ ] Verify smooth scrolling

### H. Service Worker
- [ ] **SW Registration**
  - [ ] Check console: SW registered
  - [ ] Verify only ONE SW registered
  - [ ] Check console: no infinite loop
  - [ ] Verify cache working

- [ ] **Offline Mode**
  - [ ] Go offline
  - [ ] Verify cached pages load
  - [ ] Verify images cached
  - [ ] Go online
  - [ ] Verify sync works

---

## Console Checks

### Expected Logs (Good)
```
✅ All optimization scripts loaded
✅ Application ready for Phase 1-4
[ExamCore] Session loaded. User: ...
[LazyLoader] Initializing with config: ...
[SW-Advanced] ✅ Advanced Service Worker loaded
```

### Unexpected Logs (Bad)
```
❌ Session load failed after 3 attempts
[ExamCore] ❌ Validation failed
[LazyLoader] ❌ Failed to load: ...
[SW-Advanced] Installing... (repeating infinitely)
Refused to execute script ... MIME type
```

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Page Load | < 3s | ? |
| Exam Load | < 2s | ? |
| Memory | < 50MB | ? |
| Cache Hit | > 90% | ? |
| Image Load | < 1s | ? |

---

## Bug Report Template

When finding a bug, document:

```
## Bug: [Title]

**Severity**: Critical / High / Medium / Low

**Steps to Reproduce**:
1. ...
2. ...
3. ...

**Expected Result**:
...

**Actual Result**:
...

**Console Errors**:
```
[paste error]
```

**Environment**:
- Browser: ...
- Device: ...
- OS: ...

**Screenshots**:
[attach if possible]
```

---

## Next Steps

1. **Run through all test cases** above
2. **Document any bugs** found
3. **Check console** for errors
4. **Verify performance** metrics
5. **Test on mobile** device
6. **Test offline** mode
7. **Report findings** to team

---

## Contact & Support

- **Issues**: Create issue in GitHub
- **Questions**: Check documentation
- **Performance**: Check Network tab in DevTools
- **Errors**: Check Console in DevTools
