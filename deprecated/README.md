# Deprecated Files Archive

This folder contains JavaScript files that are no longer used in the active codebase. They have been archived for historical reference and potential future use.

## Files in This Archive

### 1. admin-monitoring-optimized.js
- **Reason**: Functionality merged into `admin-core.js`
- **Replaced By**: `admin-core.js`
- **Last Used**: Phase 2-3 optimization
- **Notes**: Old optimized monitoring module for admin panel

### 2. admin-monitoring-virtual-scroll.js
- **Reason**: Functionality merged into `admin-core.js`
- **Replaced By**: `admin-core.js`
- **Last Used**: Phase 2-3 optimization
- **Notes**: Old virtual scroll monitoring for admin panel

### 3. db-connection.js
- **Reason**: Replaced by connection pooling implementation
- **Replaced By**: `db-pool.js`
- **Last Used**: Phase 1-2
- **Notes**: Old database connection module without pooling

### 4. query-selectivity-optimized-handlers.js
- **Reason**: Not referenced anywhere in codebase
- **Replaced By**: None (functionality integrated elsewhere)
- **Last Used**: Phase 3
- **Notes**: Old query optimization handlers - functionality may be in other modules

### 5. redis-connection.js
- **Reason**: Replaced by caching layer implementation
- **Replaced By**: `redis-cache.js`
- **Last Used**: Phase 2
- **Notes**: Old Redis connection module without caching layer

### 6. server-websocket.js
- **Reason**: Not referenced anywhere in codebase
- **Replaced By**: None (functionality in `realtime-sync.js`)
- **Last Used**: Phase 2
- **Notes**: Old WebSocket server implementation

## Active Replacements

| Deprecated File | Active Replacement | Status |
|---|---|---|
| admin-monitoring-optimized.js | admin-core.js | ✅ Merged |
| admin-monitoring-virtual-scroll.js | admin-core.js | ✅ Merged |
| db-connection.js | db-pool.js | ✅ Replaced |
| query-selectivity-optimized-handlers.js | (integrated) | ✅ Integrated |
| redis-connection.js | redis-cache.js | ✅ Replaced |
| server-websocket.js | realtime-sync.js | ✅ Replaced |

## How to Restore

If you need to restore any of these files:

```bash
# Move file back to root
mv deprecated/filename.js ../filename.js

# Update git
git add filename.js
git commit -m "restore: Restore deprecated file filename.js"
```

## Archive Date

- **Created**: May 10, 2026
- **Reason**: Code cleanup and optimization
- **Total Files Archived**: 6
- **Total Size Saved**: ~150 KB

## Notes

- These files are kept for historical reference
- Do NOT load these files in HTML pages
- Consider deleting after 6 months if not needed
- All functionality has been migrated to active files

---

**Last Updated**: May 10, 2026
