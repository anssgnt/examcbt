// ═══════════════════════════════════════════════════════════════════════════════
// FIREBASE-MOCK.JS - Create Firebase mock before supabase-patch.js
// Load order: firebase-mock.js → supabase-patch.js → script.js
// ═══════════════════════════════════════════════════════════════════════════════

// Create minimal Firebase mock so supabase-patch.js can inject overrides
if (typeof window.firebase === 'undefined') {
  console.log('[Firebase Mock] Creating Firebase mock for Supabase patch...');
  
  window.firebase = {
    apps: [],
    initializeApp: function() { 
      this.apps = [{ name: '[MOCK]' }]; 
      console.log('[Firebase Mock] initializeApp called');
    },
    database: function() { 
      return { ref: () => ({}) }; 
    },
    auth: function() { 
      return { currentUser: null }; 
    }
  };
  
  // Create placeholder db and auth
  window.db = { ref: () => ({}) };
  window.auth = { currentUser: null };
  
  console.log('[Firebase Mock] ✅ Firebase mock created');
}
