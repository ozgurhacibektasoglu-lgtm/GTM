/**
 * Smart Search Component
 * A reusable search bar with keyboard navigation, auto-highlight, and more.
 * 
 * Usage:
 * 1. Include this script in your HTML: <script src="../components/smart-search.js"></script>
 * 2. Create an instance:
 * 
 *    const playerSearch = new SmartSearch({
 *      inputId: 'player-search',           // ID of the search input element
 *      listId: 'players-list',             // ID of the list container element
 *      itemSelector: '.player-card',       // CSS selector for list items
 *      highlightClass: 'highlighted',      // Class to add for highlighting
 *      getItems: () => filteredPlayers,    // Function that returns current filtered items
 *      onFilter: (searchTerm) => { ... },  // Called when user types (filter your data here)
 *      onSelect: (item, index) => { ... }, // Called when user presses Enter or selects
 *      clearOnSelect: true,                // Clear search box after selection (default: true)
 *      autoHighlight: true,                // Auto-highlight first result (default: true)
 *      nextFocusId: 'team-search',         // Optional: ID of element to focus after all items processed
 *      checkComplete: () => false,         // Optional: Function to check if processing is complete
 *    });
 * 
 * 3. Call playerSearch.render() after updating your list to sync highlighting
 */

class SmartSearch {
  constructor(options) {
    this.inputId = options.inputId;
    this.listId = options.listId;
    this.itemSelector = options.itemSelector;
    this.highlightClass = options.highlightClass || 'highlighted';
    this.getItems = options.getItems || (() => []);
    this.onFilter = options.onFilter || (() => {});
    this.onSelect = options.onSelect || (() => {});
    this.clearOnSelect = options.clearOnSelect !== false;
    this.autoHighlight = options.autoHighlight !== false;
    this.nextFocusId = options.nextFocusId || null;
    this.checkComplete = options.checkComplete || (() => false);
    
    this.highlightedIndex = -1;
    
    this._init();
  }
  
  _init() {
    const input = document.getElementById(this.inputId);
    if (!input) {
      console.warn(`SmartSearch: Input element #${this.inputId} not found`);
      return;
    }
    
    // Handle input (filtering)
    input.addEventListener('input', (e) => this._handleInput(e));
    
    // Handle keyboard navigation
    input.addEventListener('keydown', (e) => this._handleKeydown(e));
  }
  
  _handleInput(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    // Call user's filter function
    this.onFilter(searchTerm);
    
    // Auto-highlight first result if enabled
    if (this.autoHighlight && searchTerm) {
      this.highlightedIndex = 0;
    } else if (!searchTerm) {
      this.highlightedIndex = -1;
    }
    
    this.render();
  }
  
  _handleKeydown(e) {
    const items = this.getItems();
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (items.length > 0) {
        this.highlightedIndex = Math.min(this.highlightedIndex + 1, items.length - 1);
        this.render();
        this._scrollToHighlighted();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (items.length > 0) {
        this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
        this.render();
        this._scrollToHighlighted();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.highlightedIndex >= 0 && this.highlightedIndex < items.length) {
        const selectedItem = items[this.highlightedIndex];
        
        // Clear search if enabled
        if (this.clearOnSelect) {
          document.getElementById(this.inputId).value = '';
          this.highlightedIndex = -1;
        }
        
        // Call user's select handler
        this.onSelect(selectedItem, this.highlightedIndex);
        
        // Check if complete and focus next element
        this._checkAndFocusNext();
      }
    } else if (e.key === 'Escape') {
      document.getElementById(this.inputId).value = '';
      this.highlightedIndex = -1;
      this.onFilter('');
      this.render();
    }
  }
  
  _scrollToHighlighted() {
    const list = document.getElementById(this.listId);
    const highlighted = list?.querySelector(`.${this.highlightClass}`);
    if (highlighted) {
      highlighted.scrollIntoView({ block: 'nearest' });
    }
  }
  
  _checkAndFocusNext() {
    if (this.nextFocusId && this.checkComplete()) {
      setTimeout(() => {
        document.getElementById(this.nextFocusId)?.focus();
      }, 50);
    }
  }
  
  /**
   * Call this after rendering your list to apply highlighting
   */
  render() {
    const list = document.getElementById(this.listId);
    if (!list) return;
    
    const items = list.querySelectorAll(this.itemSelector);
    items.forEach((item, index) => {
      item.classList.toggle(this.highlightClass, index === this.highlightedIndex);
    });
  }
  
  /**
   * Focus the search input
   */
  focus() {
    setTimeout(() => {
      document.getElementById(this.inputId)?.focus();
    }, 50);
  }
  
  /**
   * Clear the search input and reset highlighting
   */
  clear() {
    const input = document.getElementById(this.inputId);
    if (input) {
      input.value = '';
    }
    this.highlightedIndex = -1;
  }
  
  /**
   * Get current highlighted index
   */
  getHighlightedIndex() {
    return this.highlightedIndex;
  }
  
  /**
   * Set highlighted index programmatically
   */
  setHighlightedIndex(index) {
    this.highlightedIndex = index;
    this.render();
  }
}

// Export for module systems, but also make available globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SmartSearch;
}
