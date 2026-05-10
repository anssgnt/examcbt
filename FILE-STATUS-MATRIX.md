# QUICK REFERENCE - FILE STATUS MATRIX

## ACTIVE FILES (27)

| File | Type | Loaded In | Version | Status |
|------|------|-----------|---------|--------|
| script.js | Core | index, exam, result, admin | 9/10* | CRITICAL |
| supabase-adapter.js | DB | index, exam, result, admin | 2 | CRITICAL |
| supabase-patch.js | DB | index, exam, result, admin | 2/8* | CRITICAL |
| firebase-mock.js | Compat | index, exam, admin | - | IMPORTANT |
| mobile-core.js | Mobile | index | 4 | ACTIVE |
| pwa-core.js | PWA | index | 4 | ACTIVE |
| exam-core.js | Exam | exam | 4 | CRITICAL |
| result-core.js | Result | result | 2 | ACTIVE |
| lazy-loading-core.js | Perf | exam | - | ACTIVE |
| sw-image-cache.js | SW | exam | - | ACTIVE |
| predictive-cache.js | Cache | exam | - | ACTIVE |
| differential-sync.js | Sync | exam | - | ACTIVE |
| data-compression.js | Compress | exam | - | ACTIVE |
| exam-advanced-integration.js | Exam | exam | - | ACTIVE |
| db-pool.js | DB | exam | - | ACTIVE |
| redis-cache.js | Cache | exam | - | ACTIVE |
| realtime-sync.js | Sync | exam | - | ACTIVE |
| performance-monitor.js | Monitor | exam | - | ACTIVE |
| error-tracker.js | Error | exam | - | ACTIVE |
| queue-system.js | Queue | index | 3 | ACTIVE |
| admin-auth.js | Admin | index | 1 | ACTIVE |
| admin-shared.js | Admin | admin | 1 | ACTIVE |
| admin-import.js | Admin | admin | 2 | ACTIVE |
| admin-analytics.js | Admin | admin | 1 | ACTIVE |
| admin-core.js | Admin | admin | 2 | CRITICAL |
| sw-advanced.js | SW | exam (registered) | - | ACTIVE |
| modules-init.js | Module | exam | - | ACTIVE |

*Version inconsistency detected

---

## DEPRECATED FILES (6) - CANDIDATES FOR ARCHIVING

| File | Reason | Replaced By | Recommendation |
|------|--------|-------------|-----------------|
| admin-monitoring-optimized.js | Merged into admin-core.js | admin-core.js | ARCHIVE |
| admin-monitoring-virtual-scroll.js | Merged into admin-core.js | admin-core.js | ARCHIVE |
| db-connection.js | Replaced by connection pooling | db-pool.js | ARCHIVE |
| query-selectivity-optimized-handlers.js | Not used anywhere | - | ARCHIVE |
| redis-connection.js | Replaced by caching layer | redis-cache.js | ARCHIVE |
| server-websocket.js | Not used anywhere | - | ARCHIVE |

---

## ACTION ITEMS

### Priority 1 (Do Now):
- [ ] Create deprecated/ folder
- [ ] Move 6 deprecated files to deprecated/ folder
- [ ] Update version numbers in HTML files

### Priority 2 (This Week):
- [ ] Test application after archiving
- [ ] Update documentation
- [ ] Commit changes to git

### Priority 3 (Ongoing):
- [ ] Monitor for new unused files
- [ ] Keep version numbers synchronized
- [ ] Quarterly cleanup review

---

## NOTES

1. **Version Inconsistencies**:
   - script.js: v=9 in index.html should be v=10
   - supabase-patch.js: v=2 in admin.html should be v=8

2. **Service Workers**:
   - sw-advanced.js is registered dynamically in exam.html
   - Not loaded as a regular script tag

3. **Module System**:
   - modules-init.js is loaded as ES6 module (type="module")
   - Initializes other modules at runtime

4. **Admin Panel**:
   - admin-core.js is the main admin module
   - admin-shared.js, admin-import.js, admin-analytics.js are utilities
   - Old monitoring files (admin-monitoring-*.js) are deprecated

5. **Database Layer**:
   - db-pool.js replaces db-connection.js
   - redis-cache.js replaces redis-connection.js
   - Both provide better performance and pooling

