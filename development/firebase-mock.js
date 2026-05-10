// ═══════════════════════════════════════════════════════════════════════════════
// FIREBASE-MOCK.JS - Create Firebase mock before supabase-patch.js
// Load order: firebase-mock.js → supabase-patch.js → script.js
// ═══════════════════════════════════════════════════════════════════════════════

// Create minimal Firebase mock so supabase-patch.js can inject overrides
if (typeof window.firebase === 'undefined') {
  console.log('[Firebase Mock] Creating Firebase mock for Supabase patch...');
  
  // Create mock db object with all required methods
  const mockDb = {
    ref: function(path) {
      return {
        once: () => Promise.resolve({ val: () => ({}), exists: () => false }),
        set: () => Promise.resolve(),
        update: () => Promise.resolve(),
        remove: () => Promise.resolve(),
        push: () => ({ key: 'mock_' + Date.now(), set: () => Promise.resolve() }),
        on: () => {},
        off: () => {}
      };
    },
    goOffline: function() { console.log('[Firebase Mock] goOffline called'); },
    goOnline: function() { console.log('[Firebase Mock] goOnline called'); },
    ServerValue: { TIMESTAMP: Date.now() }
  };
  
  // Create mock auth object
  const mockAuth = {
    currentUser: { uid: 'mock_user' },
    onAuthStateChanged: (cb) => { 
      setTimeout(() => cb({ uid: 'mock_user' }), 100); 
      return () => {}; 
    },
    signInAnonymously: () => Promise.resolve({ user: { uid: 'mock_user' } })
  };
  
  // Create Firebase namespace
  window.firebase = {
    apps: [],
    initializeApp: function() { 
      this.apps = [{ name: '[MOCK]' }]; 
      console.log('[Firebase Mock] initializeApp called');
    },
    database: function() { 
      return mockDb; 
    },
    auth: function() { 
      return mockAuth; 
    }
  };
  
  // Create global db and auth references
  window.db = mockDb;
  window.auth = mockAuth;
  
  console.log('[Firebase Mock] ✅ Firebase mock created');
}
