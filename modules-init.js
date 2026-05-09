/**
 * Module Initialization
 * Phase 5: Advanced ES Modules
 */

console.log('[Modules] Initializing...');

// Initialize all modules
Promise.all([
  import('./modules/loader.js').then(({ moduleLoader }) => {
    window.moduleLoader = moduleLoader;
    console.log('✅ Module loader initialized');
    return moduleLoader;
  }).catch(err => console.error('❌ Module loader error:', err)),

  import('./modules/core.js').then(({ stateManager }) => {
    window.stateManager = stateManager;
    console.log('✅ State manager initialized');
    return stateManager;
  }).catch(err => console.error('❌ State manager error:', err)),

  import('./modules/cache.js').then(({ cacheManager }) => {
    window.cacheManager = cacheManager;
    console.log('✅ Cache manager initialized');
    return cacheManager;
  }).catch(err => console.error('❌ Cache manager error:', err)),

  import('./modules/monitoring.js').then(({ performanceMonitor }) => {
    window.performanceMonitor = performanceMonitor;
    console.log('✅ Performance monitor initialized');
    return performanceMonitor;
  }).catch(err => console.error('❌ Performance monitor error:', err)),

  import('./modules/api.js').then(({ apiClient }) => {
    window.apiClient = apiClient;
    console.log('✅ API client initialized');
    return apiClient;
  }).catch(err => console.error('❌ API client error:', err)),

  import('./modules/ui.js').then(({ uiManager }) => {
    window.uiManager = uiManager;
    console.log('✅ UI manager initialized');
    return uiManager;
  }).catch(err => console.error('❌ UI manager error:', err)),

  import('./modules/sync.js').then(({ syncManager }) => {
    window.syncManager = syncManager;
    console.log('✅ Sync manager initialized');
    return syncManager;
  }).catch(err => console.error('❌ Sync manager error:', err)),

  import('./modules/utils.js').then(({ utils }) => {
    window.utils = utils;
    console.log('✅ Utils initialized');
    return utils;
  }).catch(err => console.error('❌ Utils error:', err)),
]).then(() => {
  console.log('✅ All modules initialized successfully');
  
  // Emit custom event
  window.dispatchEvent(new CustomEvent('modulesReady', {
    detail: {
      moduleLoader: window.moduleLoader,
      stateManager: window.stateManager,
      cacheManager: window.cacheManager,
      performanceMonitor: window.performanceMonitor,
      apiClient: window.apiClient,
      uiManager: window.uiManager,
      syncManager: window.syncManager,
      utils: window.utils,
    }
  }));
}).catch(err => {
  console.error('❌ Module initialization failed:', err);
  window.dispatchEvent(new CustomEvent('modulesError', {
    detail: { error: err }
  }));
});

// Listen for modules ready
window.addEventListener('modulesReady', (e) => {
  console.log('[Modules] Ready event fired');
  console.log('[Modules] Available modules:', Object.keys(e.detail));
});

// Listen for modules error
window.addEventListener('modulesError', (e) => {
  console.error('[Modules] Error event fired:', e.detail.error);
});

// Export for testing
export const initModules = () => {
  return new Promise((resolve) => {
    if (window.moduleLoader) {
      resolve(window);
    } else {
      window.addEventListener('modulesReady', () => resolve(window));
    }
  });
};
