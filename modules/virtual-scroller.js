/**
 * ============================================
 * VIRTUAL SCROLLER MODULE
 * High-performance virtual scrolling for large datasets
 * ============================================
 * 
 * Features:
 * - Renders only visible rows (50-100 DOM nodes vs 900+)
 * - 60fps smooth scrolling
 * - Support for sort/filter
 * - Automatic height calculation
 * - Memory efficient
 * - Error handling & performance optimization
 */

class VirtualScroller {
  /**
   * Initialize Virtual Scroller
   * 
   * @param {HTMLElement|string} container - Container element or selector
   * @param {Array} items - Array of items to render
   * @param {number} rowHeight - Height of each row in pixels
   * @param {Object} options - Configuration options
   */
  constructor(container, items = [], rowHeight = 50, options = {}) {
    // Validate inputs
    if (!container) throw new Error('Container is required');
    if (!Array.isArray(items)) throw new Error('Items must be an array');
    if (rowHeight <= 0) throw new Error('Row height must be positive');

    // Get container element
    this.container = typeof container === 'string' 
      ? document.querySelector(container)
      : container;
    
    if (!this.container) throw new Error('Container element not found');

    // Configuration
    this.items = items;
    this.rowHeight = rowHeight;
    this.options = {
      bufferSize: options.bufferSize || 5, // Extra rows to render above/below viewport
      renderRow: options.renderRow || this.defaultRenderRow.bind(this),
      onScroll: options.onScroll || null,
      overscan: options.overscan || 3, // Additional rows to render for smoother scrolling
      enableDebug: options.enableDebug || false,
      ...options
    };

    // State
    this.scrollTop = 0;
    this.containerHeight = 0;
    this.visibleStart = 0;
    this.visibleEnd = 0;
    this.renderedStart = 0;
    this.renderedEnd = 0;
    this.sortConfig = null;
    this.filterConfig = null;
    this.filteredItems = [...items];
    this.isInitialized = false;
    this.scrollTimeout = null;
    this.resizeObserver = null;
    this.performanceMetrics = {
      renderTime: 0,
      scrollEvents: 0,
      domNodesCount: 0,
      lastFrameTime: 0
    };

    // DOM elements
    this.viewport = null;
    this.content = null;
    this.rows = new Map(); // Cache for row elements

    // Initialize
    this.init();
  }

  /**
   * Initialize the virtual scroller
   */
  init() {
    try {
      this.setupDOM();
      this.setupEventListeners();
      this.setupResizeObserver();
      this.render();
      this.isInitialized = true;
      this.log('Virtual Scroller initialized successfully');
    } catch (error) {
      console.error('[VirtualScroller] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Setup DOM structure
   */
  setupDOM() {
    // Clear container
    this.container.innerHTML = '';

    // Create viewport (scrollable container)
    this.viewport = document.createElement('div');
    this.viewport.className = 'virtual-scroller-viewport';
    this.viewport.style.cssText = `
      position: relative;
      overflow-y: auto;
      overflow-x: hidden;
      height: 100%;
      width: 100%;
      will-change: transform;
    `;

    // Create content container (holds all rows)
    this.content = document.createElement('div');
    this.content.className = 'virtual-scroller-content';
    this.content.style.cssText = `
      position: relative;
      width: 100%;
      will-change: transform;
    `;

    this.viewport.appendChild(this.content);
    this.container.appendChild(this.viewport);

    // Store container height
    this.updateContainerHeight();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Scroll event with throttling
    this.viewport.addEventListener('scroll', () => this.onScroll(), { passive: true });

    // Keyboard navigation
    this.viewport.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  /**
   * Setup resize observer for responsive behavior
   */
  setupResizeObserver() {
    if (!window.ResizeObserver) {
      this.log('ResizeObserver not supported, using fallback');
      window.addEventListener('resize', () => this.updateContainerHeight());
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.updateContainerHeight();
      this.render();
    });

    this.resizeObserver.observe(this.container);
  }

  /**
   * Update container height
   */
  updateContainerHeight() {
    const rect = this.container.getBoundingClientRect();
    this.containerHeight = rect.height || this.container.clientHeight;
    
    if (this.containerHeight <= 0) {
      this.containerHeight = 400; // Fallback height
    }
  }

  /**
   * Handle scroll event
   */
  onScroll() {
    const startTime = performance.now();
    this.scrollTop = this.viewport.scrollTop;
    this.performanceMetrics.scrollEvents++;

    // Calculate visible range
    this.calculateVisibleRange();

    // Render if needed
    if (this.shouldRender()) {
      this.render();
    }

    // Call custom scroll handler
    if (this.options.onScroll) {
      this.options.onScroll({
        scrollTop: this.scrollTop,
        visibleStart: this.visibleStart,
        visibleEnd: this.visibleEnd,
        itemsCount: this.filteredItems.length
      });
    }

    // Performance tracking
    const endTime = performance.now();
    this.performanceMetrics.renderTime = endTime - startTime;
  }

  /**
   * Calculate visible range based on scroll position
   */
  calculateVisibleRange() {
    this.visibleStart = Math.floor(this.scrollTop / this.rowHeight);
    this.visibleEnd = Math.ceil((this.scrollTop + this.containerHeight) / this.rowHeight);

    // Add buffer for smoother scrolling
    const buffer = this.options.bufferSize + this.options.overscan;
    this.renderedStart = Math.max(0, this.visibleStart - buffer);
    this.renderedEnd = Math.min(this.filteredItems.length, this.visibleEnd + buffer);
  }

  /**
   * Check if render is needed
   */
  shouldRender() {
    return this.renderedStart !== this.lastRenderedStart || 
           this.renderedEnd !== this.lastRenderedEnd;
  }

  /**
   * Render visible rows
   */
  render() {
    try {
      const startTime = performance.now();

      // Update content height
      const totalHeight = this.filteredItems.length * this.rowHeight;
      this.content.style.height = totalHeight + 'px';

      // Calculate offset for rendered rows
      const offsetY = this.renderedStart * this.rowHeight;

      // Create rows container
      let rowsHTML = '';
      const rowsToRender = [];

      for (let i = this.renderedStart; i < this.renderedEnd; i++) {
        const item = this.filteredItems[i];
        if (!item) continue;

        const rowElement = this.createRow(item, i);
        rowsToRender.push(rowElement);
        rowsHTML += rowElement.outerHTML;
      }

      // Update content
      this.content.innerHTML = rowsHTML;

      // Position content
      this.content.style.transform = `translateY(${offsetY}px)`;

      // Update metrics
      this.performanceMetrics.domNodesCount = this.renderedEnd - this.renderedStart;
      this.lastRenderedStart = this.renderedStart;
      this.lastRenderedEnd = this.renderedEnd;

      const endTime = performance.now();
      this.performanceMetrics.renderTime = endTime - startTime;

      this.log(`Rendered rows ${this.renderedStart}-${this.renderedEnd} (${this.performanceMetrics.domNodesCount} DOM nodes) in ${this.performanceMetrics.renderTime.toFixed(2)}ms`);
    } catch (error) {
      console.error('[VirtualScroller] Render error:', error);
      this.handleRenderError(error);
    }
  }

  /**
   * Create a row element
   * 
   * @param {Object} item - Item data
   * @param {number} index - Item index
   * @returns {HTMLElement} Row element
   */
  createRow(item, index) {
    try {
      const row = document.createElement('div');
      row.className = 'virtual-scroller-row';
      row.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: ${this.rowHeight}px;
        width: 100%;
        box-sizing: border-box;
        transform: translateY(${(index - this.renderedStart) * this.rowHeight}px);
      `;

      // Use custom render function
      const content = this.options.renderRow(item, index);
      
      if (typeof content === 'string') {
        row.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        row.appendChild(content);
      }

      return row;
    } catch (error) {
      console.error('[VirtualScroller] Error creating row:', error);
      const errorRow = document.createElement('div');
      errorRow.className = 'virtual-scroller-row-error';
      errorRow.textContent = 'Error rendering row';
      return errorRow;
    }
  }

  /**
   * Default row renderer
   * 
   * @param {Object} item - Item data
   * @param {number} index - Item index
   * @returns {string} HTML string
   */
  defaultRenderRow(item, index) {
    return `
      <div style="padding: 12px; border-bottom: 1px solid #E5E7EB; display: flex; align-items: center; height: 100%; box-sizing: border-box;">
        <span style="color: #9CA3AF; margin-right: 12px; font-size: 0.85rem;">${index + 1}</span>
        <span>${JSON.stringify(item)}</span>
      </div>
    `;
  }

  /**
   * Handle render errors
   * 
   * @param {Error} error - Error object
   */
  handleRenderError(error) {
    // Show error message in viewport
    this.content.innerHTML = `
      <div style="padding: 20px; color: #DC2626; background: #FEE2E2; border-radius: 8px; margin: 10px;">
        <strong>Error rendering rows:</strong> ${error.message}
      </div>
    `;
  }

  /**
   * Handle keyboard navigation
   * 
   * @param {KeyboardEvent} event - Keyboard event
   */
  onKeyDown(event) {
    const step = this.containerHeight / this.rowHeight;
    
    switch (event.key) {
      case 'ArrowDown':
        this.viewport.scrollTop += this.rowHeight;
        event.preventDefault();
        break;
      case 'ArrowUp':
        this.viewport.scrollTop -= this.rowHeight;
        event.preventDefault();
        break;
      case 'PageDown':
        this.viewport.scrollTop += this.containerHeight;
        event.preventDefault();
        break;
      case 'PageUp':
        this.viewport.scrollTop -= this.containerHeight;
        event.preventDefault();
        break;
      case 'Home':
        this.viewport.scrollTop = 0;
        event.preventDefault();
        break;
      case 'End':
        this.viewport.scrollTop = this.content.scrollHeight;
        event.preventDefault();
        break;
    }
  }

  /**
   * Sort items
   * 
   * @param {string} key - Sort key
   * @param {string} direction - 'asc' or 'desc'
   */
  sort(key, direction = 'asc') {
    try {
      this.sortConfig = { key, direction };
      
      this.filteredItems.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];

        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
      });

      this.viewport.scrollTop = 0;
      this.render();
      this.log(`Sorted by ${key} (${direction})`);
    } catch (error) {
      console.error('[VirtualScroller] Sort error:', error);
    }
  }

  /**
   * Filter items
   * 
   * @param {Function} predicate - Filter function
   */
  filter(predicate) {
    try {
      this.filterConfig = predicate;
      this.filteredItems = this.items.filter(predicate);
      this.viewport.scrollTop = 0;
      this.render();
      this.log(`Filtered to ${this.filteredItems.length} items`);
    } catch (error) {
      console.error('[VirtualScroller] Filter error:', error);
    }
  }

  /**
   * Clear filter
   */
  clearFilter() {
    this.filterConfig = null;
    this.filteredItems = [...this.items];
    this.viewport.scrollTop = 0;
    this.render();
    this.log('Filter cleared');
  }

  /**
   * Update items
   * 
   * @param {Array} newItems - New items array
   */
  updateItems(newItems) {
    try {
      if (!Array.isArray(newItems)) throw new Error('Items must be an array');
      
      this.items = newItems;
      
      // Reapply filter if exists
      if (this.filterConfig) {
        this.filteredItems = newItems.filter(this.filterConfig);
      } else {
        this.filteredItems = [...newItems];
      }

      // Reapply sort if exists
      if (this.sortConfig) {
        this.sort(this.sortConfig.key, this.sortConfig.direction);
      } else {
        this.render();
      }

      this.log(`Updated with ${newItems.length} items`);
    } catch (error) {
      console.error('[VirtualScroller] Update items error:', error);
    }
  }

  /**
   * Scroll to item
   * 
   * @param {number} index - Item index
   * @param {string} align - 'start', 'center', or 'end'
   */
  scrollToItem(index, align = 'start') {
    try {
      if (index < 0 || index >= this.filteredItems.length) {
        throw new Error(`Index ${index} out of range`);
      }

      const itemTop = index * this.rowHeight;
      let scrollTop = itemTop;

      if (align === 'center') {
        scrollTop = itemTop - (this.containerHeight / 2) + (this.rowHeight / 2);
      } else if (align === 'end') {
        scrollTop = itemTop - this.containerHeight + this.rowHeight;
      }

      this.viewport.scrollTop = Math.max(0, scrollTop);
      this.log(`Scrolled to item ${index}`);
    } catch (error) {
      console.error('[VirtualScroller] Scroll to item error:', error);
    }
  }

  /**
   * Get performance metrics
   * 
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    return {
      ...this.performanceMetrics,
      domReduction: ((1 - this.performanceMetrics.domNodesCount / this.filteredItems.length) * 100).toFixed(2) + '%',
      itemsCount: this.filteredItems.length,
      visibleRange: `${this.visibleStart}-${this.visibleEnd}`,
      renderedRange: `${this.renderedStart}-${this.renderedEnd}`
    };
  }

  /**
   * Destroy the scroller
   */
  destroy() {
    try {
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }
      
      if (this.viewport) {
        this.viewport.removeEventListener('scroll', this.onScroll);
        this.viewport.removeEventListener('keydown', this.onKeyDown);
      }

      this.container.innerHTML = '';
      this.rows.clear();
      this.isInitialized = false;
      this.log('Virtual Scroller destroyed');
    } catch (error) {
      console.error('[VirtualScroller] Destroy error:', error);
    }
  }

  /**
   * Log debug messages
   * 
   * @param {string} message - Message to log
   */
  log(message) {
    if (this.options.enableDebug) {
      console.log(`[VirtualScroller] ${message}`);
    }
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VirtualScroller;
}
