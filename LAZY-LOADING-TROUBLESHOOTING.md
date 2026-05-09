# 🔧 LAZY LOADING - TROUBLESHOOTING GUIDE

## 🚨 Common Issues & Solutions

---

## Issue 1: Images Not Loading

### Symptoms
- Images show placeholder
- Console shows "Failed to load"
- Exam works but images missing

### Root Causes
1. Image URL is incorrect
2. CORS headers not set
3. Image file doesn't exist
4. Network timeout
5. Server error (404, 500)

### Diagnosis

```javascript
// Check failed images count
const m = window.LazyLoadingAPI.getMetrics();
console.log('Failed images:', m.totalFailed);

// Check specific image
const img = document.querySelector('img[data-src]');
console.log('Image src:', img.dataset.src);

// Check network in DevTools
// Network tab → Filter by images → Check status codes
```

### Solutions

#### Solution 1: Verify Image URL
```javascript
// Check if URL is valid
const url = 'path/to/image.jpg';
fetch(url).then(r => console.log('Status:', r.status));
```

#### Solution 2: Check CORS Headers
```javascript
// Server should return:
// Access-Control-Allow-Origin: *
// Access-Control-Allow-Methods: GET, HEAD, OPTIONS

// Test CORS
fetch('image-url', { mode: 'cors' })
  .then(r => console.log('CORS OK'))
  .catch(e => console.log('CORS Error:', e));
```

#### Solution 3: Verify File Exists
```bash
# Check if file exists on server
curl -I https://server.com/images/soal-1.jpg
# Should return 200 OK
```

#### Solution 4: Increase Timeout
```javascript
// Increase timeout to 15 seconds
window.LazyLoadingAPI.setConfig({ imageLoadTimeout: 15000 });
```

#### Solution 5: Check Server Logs
```bash
# Check server error logs
tail -f /var/log/nginx/error.log
tail -f /var/log/apache2/error.log
```

---

## Issue 2: High Memory Usage

### Symptoms
- Memory > 50MB
- Slow scrolling
- Browser lag/freeze
- "Out of memory" errors

### Root Causes
1. Too many images cached
2. Preload count too high
3. Memory leak in image loading
4. Large image files
5. Browser cache not clearing

### Diagnosis

```javascript
// Check memory usage
const mem = performance.memory.usedJSHeapSize / 1024 / 1024;
console.log('Memory:', mem.toFixed(1), 'MB');

// Check cached images
const m = window.LazyLoadingAPI.getMetrics();
console.log('Cached images:', m.cachedSize);

// Monitor memory over time
setInterval(() => {
  const mem = performance.memory.usedJSHeapSize / 1024 / 1024;
  console.log('Memory:', mem.toFixed(1), 'MB');
}, 5000);
```

### Solutions

#### Solution 1: Reduce Preload Count
```javascript
// Default: preload 2 questions
// Reduce to 1
window.LazyLoadingAPI.setConfig({ preloadCount: 1 });

// Or disable preload
window.LazyLoadingAPI.setConfig({ preloadCount: 0 });
```

#### Solution 2: Clear Cache
```javascript
// Clear all caches
window.LazyLoadingAPI.clearCache();

// Or clear periodically
setInterval(() => {
  window.LazyLoadingAPI.clearCache();
}, 60000); // Every 60 seconds
```

#### Solution 3: Reduce Image Quality
```javascript
// Compress images before upload
// Use WebP format instead of JPEG
// Resize large images
```

#### Solution 4: Monitor on Low-End Devices
```javascript
// Detect low-end device
const isLowEnd = navigator.deviceMemory < 4;
if (isLowEnd) {
  window.LazyLoadingAPI.setConfig({ preloadCount: 0 });
}
```

#### Solution 5: Implement Cache Cleanup
```javascript
// Clear cache every 5 minutes
setInterval(() => {
  const m = window.LazyLoadingAPI.getMetrics();
  if (m.cachedSize > 30) {
    window.LazyLoadingAPI.clearCache();
    console.log('Cache cleared');
  }
}, 300000);
```

---

## Issue 3: Slow Image Loading

### Symptoms
- Images take > 2 seconds to load
- Preload not working
- Slow navigation between questions
- Network requests taking long

### Root Causes
1. Slow network connection
2. Large image files
3. Server response time slow
4. Preload timeout too short
5. Too many concurrent requests

### Diagnosis

```javascript
// Check average load time
const m = window.LazyLoadingAPI.getMetrics();
console.log('Avg load time:', m.averageLoadTime, 'ms');

// Check network speed
const connection = navigator.connection;
console.log('Effective type:', connection?.effectiveType);
console.log('Downlink:', connection?.downlink, 'Mbps');

// Check server response time
const start = performance.now();
fetch('image-url').then(() => {
  const time = performance.now() - start;
  console.log('Response time:', time, 'ms');
});
```

### Solutions

#### Solution 1: Increase Timeout
```javascript
// Increase timeout to 15 seconds
window.LazyLoadingAPI.setConfig({ imageLoadTimeout: 15000 });

// Increase preload timeout
window.LazyLoadingAPI.setConfig({ preloadTimeout: 10000 });
```

#### Solution 2: Detect Slow Network
```javascript
// Detect 3G/4G
const connection = navigator.connection;
if (connection?.effectiveType === '3g') {
  // Increase timeout for slow networks
  window.LazyLoadingAPI.setConfig({ imageLoadTimeout: 20000 });
}
```

#### Solution 3: Optimize Images
```javascript
// Use WebP format (smaller file size)
// Compress JPEG/PNG
// Resize large images
// Use CDN for faster delivery
```

#### Solution 4: Reduce Concurrent Requests
```javascript
// Limit preload to 1 question
window.LazyLoadingAPI.setConfig({ preloadCount: 1 });
```

#### Solution 5: Check Server Performance
```bash
# Check server CPU/memory
top
free -h

# Check disk I/O
iostat -x 1

# Check network
iftop
```

---

## Issue 4: Service Worker Not Caching

### Symptoms
- Images not cached
- Offline mode doesn't work
- Cache size shows 0
- Service Worker not registered

### Root Causes
1. Service Worker not registered
2. Cache storage quota exceeded
3. HTTPS not enabled
4. Service Worker script error
5. Browser cache disabled

### Diagnosis

```javascript
// Check Service Worker registration
navigator.serviceWorker.getRegistrations().then((regs) => {
  console.log('Service Workers:', regs);
  regs.forEach(reg => console.log('State:', reg.active?.state));
});

// Check cache storage
caches.keys().then((names) => {
  console.log('Caches:', names);
  names.forEach(name => {
    caches.open(name).then(cache => {
      cache.keys().then(keys => {
        console.log(`${name}: ${keys.length} items`);
      });
    });
  });
});

// Check cache quota
navigator.storage?.estimate().then(estimate => {
  console.log('Cache quota:', estimate.quota / 1024 / 1024, 'MB');
  console.log('Cache usage:', estimate.usage / 1024 / 1024, 'MB');
});
```

### Solutions

#### Solution 1: Verify Service Worker Registration
```javascript
// Check if registered
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => console.log('Registered:', reg))
    .catch(err => console.error('Error:', err));
}
```

#### Solution 2: Check HTTPS
```javascript
// Service Worker requires HTTPS (except localhost)
console.log('Protocol:', window.location.protocol);
// Should be: https:
```

#### Solution 3: Clear Old Caches
```javascript
// Delete old cache versions
caches.keys().then((names) => {
  names.forEach(name => {
    if (name !== 'cbt-images-v1') {
      caches.delete(name);
    }
  });
});
```

#### Solution 4: Check Cache Quota
```javascript
// Request persistent storage
navigator.storage?.persist().then(persistent => {
  console.log('Persistent:', persistent);
});

// Increase quota if needed
navigator.storage?.estimate().then(estimate => {
  if (estimate.usage > estimate.quota * 0.9) {
    console.warn('Cache quota almost full');
  }
});
```

#### Solution 5: Check Service Worker Errors
```javascript
// Open DevTools → Application → Service Workers
// Check for errors in console
// Check Service Worker script for syntax errors
```

---

## Issue 5: Offline Mode Not Working

### Symptoms
- App doesn't work offline
- Images not available offline
- Preloaded images not accessible
- Error messages when offline

### Root Causes
1. Service Worker not caching images
2. Images not preloaded
3. Cache cleared on logout
4. Network request not intercepted
5. Offline detection not working

### Diagnosis

```javascript
// Check if offline
console.log('Online:', navigator.onLine);

// Check cached images
caches.open('cbt-images-v1').then(cache => {
  cache.keys().then(keys => {
    console.log('Cached images:', keys.length);
  });
});

// Test offline mode
// DevTools → Network → Offline
// Try to load image
```

### Solutions

#### Solution 1: Preload Images Before Offline
```javascript
// Preload all questions before going offline
const questions = State.questions;
window.LazyLoadingAPI.preloadQuestions(
  questions.map((_, i) => i),
  questions
);
```

#### Solution 2: Verify Service Worker Caching
```javascript
// Check if Service Worker is caching
// DevTools → Application → Cache Storage
// Should see 'cbt-images-v1' with images
```

#### Solution 3: Test Offline Mode
```javascript
// Simulate offline
navigator.onLine = false;

// Try to load image
const img = new Image();
img.src = 'cached-image-url';
img.onload = () => console.log('Offline image loaded');
img.onerror = () => console.log('Offline image failed');
```

#### Solution 4: Implement Offline Detection
```javascript
// Detect when going offline
window.addEventListener('offline', () => {
  console.log('Going offline');
  // Show offline indicator
});

window.addEventListener('online', () => {
  console.log('Back online');
  // Hide offline indicator
});
```

#### Solution 5: Fallback for Offline
```javascript
// Show cached images when offline
if (!navigator.onLine) {
  // Use cached images
  // Show offline message
  // Disable sync
}
```

---

## Issue 6: Preload Not Working

### Symptoms
- Next question images not preloaded
- Slow navigation between questions
- Preload timeout errors
- Preload count shows 0

### Root Causes
1. Preload disabled (preloadCount = 0)
2. Preload timeout too short
3. Network too slow
4. Images not found
5. Preload function not called

### Diagnosis

```javascript
// Check preload config
const config = window.LazyLoadingAPI.getConfig();
console.log('Preload count:', config.preloadCount);
console.log('Preload timeout:', config.preloadTimeout);

// Check if preload is working
const m = window.LazyLoadingAPI.getMetrics();
console.log('Cached images:', m.totalCached);

// Monitor preload
window.addEventListener('beforeunload', () => {
  const m = window.LazyLoadingAPI.getMetrics();
  console.log('Final metrics:', m);
});
```

### Solutions

#### Solution 1: Enable Preload
```javascript
// Check if preload is enabled
window.LazyLoadingAPI.setConfig({ preloadCount: 2 });
```

#### Solution 2: Increase Preload Timeout
```javascript
// Increase timeout to 10 seconds
window.LazyLoadingAPI.setConfig({ preloadTimeout: 10000 });
```

#### Solution 3: Reduce Preload Count
```javascript
// If network is slow, reduce preload
window.LazyLoadingAPI.setConfig({ preloadCount: 1 });
```

#### Solution 4: Check Network
```javascript
// Check network speed
const connection = navigator.connection;
console.log('Effective type:', connection?.effectiveType);
console.log('Downlink:', connection?.downlink, 'Mbps');

// If slow, increase timeout
if (connection?.effectiveType === '3g') {
  window.LazyLoadingAPI.setConfig({ preloadTimeout: 15000 });
}
```

#### Solution 5: Verify Images Exist
```javascript
// Check if preload images exist
const questions = State.questions;
questions.slice(0, 3).forEach((q, i) => {
  if (q.gambar) {
    fetch(q.gambar).then(r => {
      console.log(`Question ${i} image:`, r.status);
    });
  }
});
```

---

## Issue 7: Console Errors

### Error: "Image load timeout"

**Cause:** Image took > 10 seconds to load

**Solution:**
```javascript
// Increase timeout
window.LazyLoadingAPI.setConfig({ imageLoadTimeout: 15000 });
```

### Error: "Failed to load image"

**Cause:** Image URL invalid or server error

**Solution:**
```javascript
// Check image URL
console.log('Image URL:', img.dataset.src);

// Verify file exists
fetch(img.dataset.src).then(r => console.log('Status:', r.status));
```

### Error: "Cache quota exceeded"

**Cause:** Cache storage full

**Solution:**
```javascript
// Clear cache
window.LazyLoadingAPI.clearCache();

// Or reduce preload
window.LazyLoadingAPI.setConfig({ preloadCount: 1 });
```

### Error: "Service Worker registration failed"

**Cause:** HTTPS not enabled or script error

**Solution:**
```javascript
// Check HTTPS
console.log('Protocol:', window.location.protocol);

// Check Service Worker script for errors
// DevTools → Console → Check for errors
```

---

## 🔍 Debug Checklist

- [ ] Check console for errors
- [ ] Verify image URLs are correct
- [ ] Check network tab for failed requests
- [ ] Monitor memory usage
- [ ] Check Service Worker registration
- [ ] Verify cache storage
- [ ] Test offline mode
- [ ] Check preload metrics
- [ ] Monitor load times
- [ ] Test on different devices

---

## 📊 Performance Monitoring

### Monitor in Real-Time

```javascript
// Monitor every 5 seconds
setInterval(() => {
  const m = window.LazyLoadingAPI.getMetrics();
  const mem = performance.memory.usedJSHeapSize / 1024 / 1024;
  
  console.log({
    loaded: m.totalLoaded,
    failed: m.totalFailed,
    cached: m.totalCached,
    avgTime: m.averageLoadTime.toFixed(0) + 'ms',
    memory: mem.toFixed(1) + 'MB'
  });
}, 5000);
```

### Create Performance Report

```javascript
// Generate report
function generateReport() {
  const m = window.LazyLoadingAPI.getMetrics();
  const mem = performance.memory.usedJSHeapSize / 1024 / 1024;
  
  return {
    timestamp: new Date().toISOString(),
    metrics: m,
    memory: mem.toFixed(1) + 'MB',
    online: navigator.onLine,
    connection: navigator.connection?.effectiveType
  };
}

// Log report
console.log(generateReport());
```

---

## 📞 Getting Help

### Check Documentation
- Read LAZY-LOADING-IMPLEMENTATION.md
- Read LAZY-LOADING-QUICK-REFERENCE.md
- Check API reference

### Debug Steps
1. Check console for errors
2. Monitor metrics
3. Check network tab
4. Verify configuration
5. Test on different device

### Report Issue
Include:
- Error message
- Console logs
- Metrics
- Device info
- Network speed
- Steps to reproduce

---

**Version:** 1.0
**Status:** ✅ Production Ready
**Last Updated:** May 9, 2026

