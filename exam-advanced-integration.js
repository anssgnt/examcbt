/**
 * EXAM ADVANCED INTEGRATION
 * 
 * Integration predictive cache, differential sync, dan compression
 * dengan exam core untuk performa maksimal.
 * 
 * Features:
 * - Predictive caching untuk next questions
 * - Differential sync untuk answer changes
 * - Data compression untuk storage
 */

// ============================================================================
// INITIALIZATION
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {
  console.log('[Exam-Advanced] Initializing...');

  // Record exam start
  if (window.predictiveCache && State && State.user) {
    window.predictiveCache.recordAction(State.user.id, 'examStart', {
      examId: State.config.id_ujian,
      questionCount: State.questions.length,
      timestamp: Date.now()
    });
  }

  // Initialize differential sync
  if (window.differentialSync) {
    window.differentialSync.init();
  }

  console.log('[Exam-Advanced] ✅ Initialized');
});

// ============================================================================
// PREDICTIVE CACHING
// ============================================================================

/**
 * Override renderQuestion untuk predictive caching
 */
if (typeof window.renderQuestion !== 'undefined') {
  const originalRenderQuestion = window.renderQuestion;
  
  window.renderQuestion = async function(index) {
    // Record action
    if (window.predictiveCache && State && State.user) {
      window.predictiveCache.recordAction(State.user.id, 'nextQuestion', {
        questionIndex: index,
        totalQuestions: State.questions.length,
        timestamp: Date.now()
      });
    }

    // Preload predicted next question
    if (window.predictiveCache && State && State.questions) {
      try {
        await window.predictiveCache.preloadPredicted(
          State.user.id,
          index,
          State.questions
        );
      } catch (err) {
        console.warn('[Exam-Advanced] Preload error:', err);
      }
    }

    // Call original
    return originalRenderQuestion.call(this, index);
  };
}

// ============================================================================
// DIFFERENTIAL SYNC
// ============================================================================

/**
 * Override saveStateLocal untuk differential sync
 */
if (typeof window.saveStateLocal !== 'undefined') {
  const originalSaveStateLocal = window.saveStateLocal;
  
  window.saveStateLocal = function() {
    // Record change
    if (window.differentialSync && State) {
      const key = `answer_${State.currentIndex}`;
      const value = State.answers[State.currentIndex];
      window.differentialSync.recordChange(key, value);
    }

    // Call original
    return originalSaveStateLocal.call(this);
  };
}

// ============================================================================
// DATA COMPRESSION
// ============================================================================

/**
 * Compress dan store exam state
 */
async function compressExamState() {
  try {
    if (!window.DataCompression || !State) return;

    const stateData = {
      currentIndex: State.currentIndex,
      answers: State.answers,
      timeSpent: State.timeSpent,
      timestamp: Date.now()
    };

    await window.DataCompression.storeCompressed(
      `/exam-state/${State.config.id_ujian}`,
      stateData
    );

    console.log('[Exam-Advanced] Exam state compressed and stored');
  } catch (err) {
    console.warn('[Exam-Advanced] Compress state error:', err);
  }
}

/**
 * Restore compressed exam state
 */
async function restoreExamState() {
  try {
    if (!window.DataCompression || !State) return;

    const stateData = await window.DataCompression.getCompressed(
      `/exam-state/${State.config.id_ujian}`
    );

    if (stateData) {
      console.log('[Exam-Advanced] Exam state restored from compression');
      return stateData;
    }
  } catch (err) {
    console.warn('[Exam-Advanced] Restore state error:', err);
  }

  return null;
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

/**
 * Listen untuk data sync events
 */
window.addEventListener('dataSync', (e) => {
  console.log('[Exam-Advanced] Data synced:', e.detail.changes);
  
  // Update UI if needed
  if (e.detail.changes) {
    Object.keys(e.detail.changes).forEach(key => {
      if (key.startsWith('answer_')) {
        // Update answer in UI
        const index = parseInt(key.split('_')[1]);
        if (State && State.answers) {
          State.answers[index] = e.detail.changes[key];
        }
      }
    });
  }
});

/**
 * Compress state sebelum unload
 */
window.addEventListener('beforeunload', () => {
  compressExamState();
  
  // Sync pending changes
  if (window.differentialSync) {
    window.differentialSync.syncNow();
  }
});

/**
 * Compress state periodically
 */
setInterval(() => {
  compressExamState();
}, 60000); // Every 1 minute

// ============================================================================
// METRICS & MONITORING
// ============================================================================

/**
 * Get advanced metrics
 */
function getAdvancedMetrics() {
  const metrics = {
    predictiveCache: window.predictiveCache ? window.predictiveCache.getMetrics() : null,
    differentialSync: window.differentialSync ? window.differentialSync.getMetrics() : null,
    timestamp: Date.now()
  };

  return metrics;
}

/**
 * Log metrics
 */
function logAdvancedMetrics() {
  const metrics = getAdvancedMetrics();
  console.log('[Exam-Advanced] Metrics:', metrics);
  return metrics;
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.compressExamState = compressExamState;
  window.restoreExamState = restoreExamState;
  window.getAdvancedMetrics = getAdvancedMetrics;
  window.logAdvancedMetrics = logAdvancedMetrics;
}

console.log('[Exam-Advanced] ✅ Integration loaded');
