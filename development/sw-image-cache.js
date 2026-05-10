// sw-image-cache.js - Service Worker Image Caching Strategy
// This file is imported by sw.js to handle image caching

const IMAGE_CACHE_NAME = 'cbt-images-v1';
const IMAGE_CACHE_MAX_SIZE = 50 * 1024 * 1024; // 50MB

// ============================================================================
// IMAGE CACHE INITIALIZATION
// ============================================================================

/**
 * Initialize image cache on Service Worker install
 */
function initImageCache() {
  console.log('[SW-ImageCache] Initializing image cache...');
  
  // Create cache if it doesn't exist
  caches.open(IMAGE_CACHE_NAME).then((cache) => {
    console.log('[SW-ImageCache] Cache opened:', IMAGE_CACHE_NAME);
  }).catch((err) => {
    console.error('[SW-ImageCache] Cache error:', err);
  });
}

// ============================================================================
// IMAGE FETCH HANDLER
// ============================================================================

/**
 * Handle image fetch requests with cache-first strategy
 * @param {Request} request - The fetch request
 * @returns {Promise<Response>} The response
 */
async function handleImageFetch(request) {
  const url = new URL(request.url);
  
  // Skip non-image requests
  if (!isImageRequest(url)) {
    return fetch(request);
  }

  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW-ImageCache] Serving from cache:', url.pathname);
      return cachedResponse;
    }

    // Fetch from network
    console.log('[SW-ImageCache] Fetching from network:', url.pathname);
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.status === 200) {
      const responseToCache = networkResponse.clone();
      cacheImage(request, responseToCache);
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW-ImageCache] Fetch error:', error);
    
    // Return offline placeholder
    return createOfflinePlaceholder();
  }
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * Cache an image response
 * @param {Request} request - The request
 * @param {Response} response - The response to cache
 */
async function cacheImage(request, response) {
  try {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    
    // Check cache size before adding
    const cacheSize = await getCacheSize();
    if (cacheSize > IMAGE_CACHE_MAX_SIZE) {
      console.warn('[SW-ImageCache] Cache size exceeded, cleaning up...');
      await cleanupCache();
    }

    await cache.put(request, response);
    console.log('[SW-ImageCache] Cached:', request.url);
  } catch (error) {
    console.error('[SW-ImageCache] Cache error:', error);
  }
}

/**
 * Get total cache size in bytes
 * @returns {Promise<number>} Total cache size
 */
async function getCacheSize() {
  try {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    const keys = await cache.keys();
    
    let totalSize = 0;
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
    
    return totalSize;
  } catch (error) {
    console.error('[SW-ImageCache] Size calculation error:', error);
    return 0;
  }
}

/**
 * Clean up old cache entries (LRU strategy)
 */
async function cleanupCache() {
  try {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    const keys = await cache.keys();
    
    // Remove oldest 20% of entries
    const removeCount = Math.ceil(keys.length * 0.2);
    for (let i = 0; i < removeCount; i++) {
      await cache.delete(keys[i]);
      console.log('[SW-ImageCache] Removed:', keys[i].url);
    }
  } catch (error) {
    console.error('[SW-ImageCache] Cleanup error:', error);
  }
}

/**
 * Clear all image cache
 */
async function clearImageCache() {
  try {
    await caches.delete(IMAGE_CACHE_NAME);
    console.log('[SW-ImageCache] Cache cleared');
  } catch (error) {
    console.error('[SW-ImageCache] Clear error:', error);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if request is for an image
 * @param {URL} url - The URL to check
 * @returns {boolean} True if it's an image request
 */
function isImageRequest(url) {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const pathname = url.pathname.toLowerCase();
  
  return imageExtensions.some((ext) => pathname.endsWith(ext));
}

/**
 * Create offline placeholder image
 * @returns {Response} Placeholder response
 */
function createOfflinePlaceholder() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <rect width="200" height="200" fill="#f0f0f0"/>
      <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999" font-size="14">
        Offline
      </text>
    </svg>
  `;
  
  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-store'
    }
  });
}

// ============================================================================
// PRELOAD IMAGES
// ============================================================================

/**
 * Preload images for a question
 * @param {Object} question - The question object
 */
async function preloadQuestionImages(question) {
  if (!question) return;

  const images = [];

  // Collect main question image
  if (question.gambar) {
    images.push(question.gambar);
  }

  // Collect option images
  if (question.opsi && Array.isArray(question.opsi)) {
    question.opsi.forEach((opt) => {
      if (opt.gambar) {
        images.push(opt.gambar);
      }
    });
  }

  // Preload all images
  const preloadPromises = images.map((src) => {
    return fetch(src)
      .then((response) => {
        if (response.status === 200) {
          const request = new Request(src);
          return cacheImage(request, response.clone());
        }
      })
      .catch((err) => {
        console.warn('[SW-ImageCache] Preload error:', src, err);
      });
  });

  return Promise.all(preloadPromises);
}

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

/**
 * Handle messages from clients
 * @param {ExtendableMessageEvent} event - The message event
 */
function handleMessage(event) {
  const { type, data } = event.data;

  switch (type) {
    case 'PRELOAD_IMAGES':
      event.waitUntil(
        preloadQuestionImages(data.question)
          .then(() => {
            event.ports[0].postMessage({ success: true });
          })
          .catch((err) => {
            event.ports[0].postMessage({ success: false, error: err.message });
          })
      );
      break;

    case 'CLEAR_IMAGE_CACHE':
      event.waitUntil(
        clearImageCache()
          .then(() => {
            event.ports[0].postMessage({ success: true });
          })
          .catch((err) => {
            event.ports[0].postMessage({ success: false, error: err.message });
          })
      );
      break;

    case 'GET_CACHE_SIZE':
      event.waitUntil(
        getCacheSize()
          .then((size) => {
            event.ports[0].postMessage({ success: true, size });
          })
          .catch((err) => {
            event.ports[0].postMessage({ success: false, error: err.message });
          })
      );
      break;

    default:
      console.warn('[SW-ImageCache] Unknown message type:', type);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Export functions for use in sw.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initImageCache,
    handleImageFetch,
    cacheImage,
    getCacheSize,
    cleanupCache,
    clearImageCache,
    preloadQuestionImages,
    handleMessage
  };
}

// Make functions available globally in Service Worker context
self.initImageCache = initImageCache;
self.handleImageFetch = handleImageFetch;
self.cacheImage = cacheImage;
self.getCacheSize = getCacheSize;
self.cleanupCache = cleanupCache;
self.clearImageCache = clearImageCache;
self.preloadQuestionImages = preloadQuestionImages;
self.handleMessage = handleMessage;

console.log('[SW-ImageCache] ✅ Image cache module loaded');
