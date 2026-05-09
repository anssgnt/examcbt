// lazy-loading-core.js - Lazy Loading Implementation for Exam Images
// Handles on-demand image loading, preloading, and caching

(function() {
  'use strict';

  // ============================================================================
  // LAZY LOADING CONFIGURATION
  // ============================================================================

  const LazyLoadConfig = {
    // Image loading strategy
    strategy: 'lazy', // 'lazy' | 'eager' | 'preload'
    
    // Preload next N questions
    preloadCount: 2,
    
    // Image quality settings
    imageQuality: {
      thumbnail: 0.3,  // 30% quality for thumbnails
      normal: 0.8,     // 80% quality for display
      high: 1.0        // 100% quality for zoom
    },
    
    // Cache settings
    cacheEnabled: true,
    cacheMaxSize: 50 * 1024 * 1024, // 50MB
    cacheVersion: 'v1',
    
    // Timeout settings
    imageLoadTimeout: 10000, // 10 seconds
    preloadTimeout: 5000,    // 5 seconds
    
    // Performance monitoring
    enableMetrics: true,
    metricsInterval: 5000 // 5 seconds
  };

  // ============================================================================
  // IMAGE LOADER CLASS
  // ============================================================================

  class ImageLoader {
    constructor(config = {}) {
      this.config = { ...LazyLoadConfig, ...config };
      this.loadingImages = new Map();
      this.cachedImages = new Map();
      this.failedImages = new Set();
      this.metrics = {
        totalLoaded: 0,
        totalFailed: 0,
        totalCached: 0,
        averageLoadTime: 0,
        loadTimes: []
      };
      
      this.init();
    }

    init() {
      console.log('[LazyLoader] Initializing with config:', this.config);
      
      // Setup Intersection Observer for lazy loading
      this.setupIntersectionObserver();
      
      // Setup cache
      if (this.config.cacheEnabled) {
        this.setupCache();
      }
      
      // Start metrics collection
      if (this.config.enableMetrics) {
        this.startMetricsCollection();
      }
    }

    // ========================================================================
    // INTERSECTION OBSERVER - Detect when images enter viewport
    // ========================================================================

    setupIntersectionObserver() {
      const options = {
        root: null,
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.01
      };

      this.observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.dataset.src;
            
            if (src && !img.src) {
              this.loadImage(img, src);
            }
          }
        });
      }, options);
    }

    // ========================================================================
    // IMAGE LOADING - Load image with error handling
    // ========================================================================

    async loadImage(imgElement, src, options = {}) {
      const startTime = performance.now();
      const key = `${src}_${options.quality || 'normal'}`;

      // Check if already loading
      if (this.loadingImages.has(key)) {
        console.log('[LazyLoader] Image already loading:', src);
        return this.loadingImages.get(key);
      }

      // Check cache first
      if (this.config.cacheEnabled && this.cachedImages.has(key)) {
        console.log('[LazyLoader] Loading from cache:', src);
        imgElement.src = this.cachedImages.get(key);
        this.metrics.totalCached++;
        return Promise.resolve();
      }

      // Check if previously failed
      if (this.failedImages.has(src)) {
        console.warn('[LazyLoader] Image previously failed:', src);
        this.showImageError(imgElement);
        return Promise.reject(new Error('Image previously failed'));
      }

      // Create loading promise
      const loadPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Image load timeout'));
        }, this.config.imageLoadTimeout);

        const img = new Image();
        
        img.onload = () => {
          clearTimeout(timeout);
          
          // Store in cache
          if (this.config.cacheEnabled) {
            this.cachedImages.set(key, src);
          }

          // Update metrics
          const loadTime = performance.now() - startTime;
          this.metrics.loadTimes.push(loadTime);
          this.metrics.totalLoaded++;
          this.updateAverageLoadTime();

          console.log(`[LazyLoader] ✅ Loaded: ${src} (${loadTime.toFixed(0)}ms)`);

          // Apply to element
          imgElement.src = src;
          imgElement.classList.add('lazy-loaded');
          imgElement.removeAttribute('data-src');

          // Stop observing
          if (this.observer) {
            this.observer.unobserve(imgElement);
          }

          resolve();
        };

        img.onerror = () => {
          clearTimeout(timeout);
          this.failedImages.add(src);
          this.metrics.totalFailed++;
          
          console.error('[LazyLoader] ❌ Failed to load:', src);
          this.showImageError(imgElement);
          reject(new Error('Image load failed'));
        };

        img.src = src;
      });

      this.loadingImages.set(key, loadPromise);

      try {
        await loadPromise;
      } finally {
        this.loadingImages.delete(key);
      }

      return loadPromise;
    }

    // ========================================================================
    // PRELOAD - Load next questions' images in background
    // ========================================================================

    async preloadNextQuestions(currentIndex, questions) {
      if (!questions || questions.length === 0) return;

      const preloadIndices = [];
      for (let i = 1; i <= this.config.preloadCount; i++) {
        const nextIndex = currentIndex + i;
        if (nextIndex < questions.length) {
          preloadIndices.push(nextIndex);
        }
      }

      console.log(`[LazyLoader] Preloading ${preloadIndices.length} questions...`);

      const preloadPromises = preloadIndices.map((index) => {
        const question = questions[index];
        return this.preloadQuestionImages(question);
      });

      try {
        await Promise.race([
          Promise.all(preloadPromises),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Preload timeout')), this.config.preloadTimeout)
          )
        ]);
      } catch (err) {
        console.warn('[LazyLoader] Preload timeout or error:', err);
      }
    }

    async preloadQuestionImages(question) {
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
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            console.log('[LazyLoader] Preloaded:', src);
            resolve();
          };
          img.onerror = () => {
            console.warn('[LazyLoader] Preload failed:', src);
            resolve(); // Don't reject, continue
          };
          img.src = src;
        });
      });

      return Promise.all(preloadPromises);
    }

    // ========================================================================
    // CACHE MANAGEMENT
    // ========================================================================

    setupCache() {
      console.log('[LazyLoader] Setting up cache...');
      
      // Try to use IndexedDB for better performance
      if ('indexedDB' in window) {
        this.setupIndexedDBCache();
      }
    }

    setupIndexedDBCache() {
      const dbName = `cbt-image-cache-${this.config.cacheVersion}`;
      const storeName = 'images';

      const request = indexedDB.open(dbName, 1);

      request.onerror = () => {
        console.warn('[LazyLoader] IndexedDB error:', request.error);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'url' });
        }
      };

      request.onsuccess = () => {
        this.idb = request.result;
        console.log('[LazyLoader] IndexedDB cache ready');
      };
    }

    async getCachedImage(src) {
      if (!this.idb) return null;

      return new Promise((resolve) => {
        const transaction = this.idb.transaction(['images'], 'readonly');
        const store = transaction.objectStore('images');
        const request = store.get(src);

        request.onsuccess = () => {
          resolve(request.result ? request.result.data : null);
        };

        request.onerror = () => {
          resolve(null);
        };
      });
    }

    async setCachedImage(src, data) {
      if (!this.idb) return;

      return new Promise((resolve) => {
        const transaction = this.idb.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        const request = store.put({ url: src, data, timestamp: Date.now() });

        request.onsuccess = () => {
          console.log('[LazyLoader] Cached image:', src);
          resolve();
        };

        request.onerror = () => {
          console.warn('[LazyLoader] Cache error:', request.error);
          resolve();
        };
      });
    }

    // ========================================================================
    // METRICS & MONITORING
    // ========================================================================

    updateAverageLoadTime() {
      if (this.metrics.loadTimes.length === 0) return;
      
      const sum = this.metrics.loadTimes.reduce((a, b) => a + b, 0);
      this.metrics.averageLoadTime = sum / this.metrics.loadTimes.length;
      
      // Keep only last 100 measurements
      if (this.metrics.loadTimes.length > 100) {
        this.metrics.loadTimes.shift();
      }
    }

    startMetricsCollection() {
      setInterval(() => {
        console.log('[LazyLoader] Metrics:', {
          totalLoaded: this.metrics.totalLoaded,
          totalFailed: this.metrics.totalFailed,
          totalCached: this.metrics.totalCached,
          averageLoadTime: this.metrics.averageLoadTime.toFixed(0) + 'ms',
          cachedSize: this.cachedImages.size,
          loadingSize: this.loadingImages.size
        });
      }, this.config.metricsInterval);
    }

    getMetrics() {
      return {
        ...this.metrics,
        cachedSize: this.cachedImages.size,
        loadingSize: this.loadingImages.size,
        failedSize: this.failedImages.size
      };
    }

    // ========================================================================
    // ERROR HANDLING
    // ========================================================================

    showImageError(imgElement) {
      imgElement.classList.add('image-error');
      imgElement.alt = 'Gambar tidak tersedia';
      
      // Show placeholder
      const placeholder = document.createElement('div');
      placeholder.className = 'image-placeholder';
      placeholder.innerHTML = '📷 Gambar tidak tersedia';
      placeholder.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 200px;
        background: #f0f0f0;
        border: 1px solid #ddd;
        border-radius: 4px;
        color: #999;
        font-size: 14px;
      `;
      
      imgElement.parentNode.insertBefore(placeholder, imgElement);
      imgElement.style.display = 'none';
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    observe(imgElement) {
      if (this.observer) {
        this.observer.observe(imgElement);
      }
    }

    unobserve(imgElement) {
      if (this.observer) {
        this.observer.unobserve(imgElement);
      }
    }

    disconnect() {
      if (this.observer) {
        this.observer.disconnect();
      }
    }

    clearCache() {
      this.cachedImages.clear();
      this.failedImages.clear();
      console.log('[LazyLoader] Cache cleared');
    }
  }

  // ============================================================================
  // GLOBAL INSTANCE
  // ============================================================================

  window.lazyLoader = new ImageLoader();

  // ============================================================================
  // INTEGRATION WITH EXAM CORE
  // ============================================================================

  // Store original renderQuestion function
  const originalRenderQuestion = window.renderQuestion;

  // Override renderQuestion to use lazy loading
  window.renderQuestion = async function(index) {
    if (!State.questions || !State.questions[index]) {
      console.error('[LazyLoading] Invalid question index:', index);
      return;
    }

    const question = State.questions[index];
    console.log(`[LazyLoading] Rendering question ${index + 1}/${State.questions.length}`);

    // Render question without images first
    renderQuestionWithoutImages(question, index);

    // Load images lazily
    loadQuestionImages(question);

    // Preload next questions in background
    window.lazyLoader.preloadNextQuestions(index, State.questions);

    // Call original render if it exists and does more
    if (originalRenderQuestion && originalRenderQuestion !== window.renderQuestion) {
      try {
        originalRenderQuestion.call(this, index);
      } catch (e) {
        console.warn('[LazyLoading] Original renderQuestion error:', e);
      }
    }
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  function renderQuestionWithoutImages(question, index) {
    const qContainer = document.getElementById('question-container');
    if (!qContainer) return;

    // Build question HTML without images
    let html = `
      <div class="question-header">
        <span class="question-number">Soal ${index + 1}</span>
        <span class="question-total">dari ${State.questions.length}</span>
      </div>
      <div class="question-text">${question.pertanyaan || ''}</div>
      <div id="question-image-container" class="question-image-container"></div>
      <div class="options-container">
    `;

    // Add options without images
    if (question.opsi && Array.isArray(question.opsi)) {
      question.opsi.forEach((opt, i) => {
        const isSelected = State.answers[question.id] === i;
        html += `
          <div class="option ${isSelected ? 'selected' : ''}">
            <input 
              type="radio" 
              name="answer" 
              value="${i}"
              id="opt-${i}"
              ${isSelected ? 'checked' : ''}
            >
            <label for="opt-${i}">
              <span class="option-text">${opt.teks || ''}</span>
              <div id="option-image-${i}" class="option-image-container"></div>
            </label>
          </div>
        `;
      });
    }

    html += '</div>';
    qContainer.innerHTML = html;

    // Re-attach event listeners
    attachQuestionEventListeners(question);
  }

  function loadQuestionImages(question) {
    // Load main question image
    if (question.gambar) {
      const container = document.getElementById('question-image-container');
      if (container) {
        const img = document.createElement('img');
        img.className = 'question-image';
        img.alt = 'Gambar Soal';
        img.style.cssText = 'max-width: 100%; height: auto; margin-top: 8px; border-radius: 4px;';
        img.dataset.src = question.gambar;
        
        container.appendChild(img);
        window.lazyLoader.observe(img);
      }
    }

    // Load option images
    if (question.opsi && Array.isArray(question.opsi)) {
      question.opsi.forEach((opt, i) => {
        if (opt.gambar) {
          const container = document.getElementById(`option-image-${i}`);
          if (container) {
            const img = document.createElement('img');
            img.className = 'option-image';
            img.alt = 'Gambar Opsi';
            img.style.cssText = 'max-width: 100%; height: auto; margin-top: 4px; border-radius: 4px;';
            img.dataset.src = opt.gambar;
            
            container.appendChild(img);
            window.lazyLoader.observe(img);
          }
        }
      });
    }
  }

  function attachQuestionEventListeners(question) {
    // Attach radio button listeners
    const radios = document.querySelectorAll('input[name="answer"]');
    radios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        const selectedValue = parseInt(e.target.value);
        State.answers[question.id] = selectedValue;
        
        // Update UI
        document.querySelectorAll('.option').forEach((opt) => {
          opt.classList.remove('selected');
        });
        e.target.closest('.option').classList.add('selected');
        
        // Save state
        if (typeof saveStateLocal === 'function') {
          saveStateLocal();
        }
      });
    });
  }

  // ============================================================================
  // EXPORT PUBLIC API
  // ============================================================================

  window.LazyLoadingAPI = {
    getMetrics: () => window.lazyLoader.getMetrics(),
    clearCache: () => window.lazyLoader.clearCache(),
    preloadQuestions: (indices, questions) => {
      return Promise.all(
        indices.map((idx) => window.lazyLoader.preloadNextQuestions(idx, questions))
      );
    },
    getConfig: () => LazyLoadConfig,
    setConfig: (config) => {
      Object.assign(LazyLoadConfig, config);
      console.log('[LazyLoading] Config updated:', LazyLoadConfig);
    }
  };

  console.log('[LazyLoading] ✅ Lazy Loading Core initialized');
})();
