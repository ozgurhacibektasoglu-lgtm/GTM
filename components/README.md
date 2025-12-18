# GTM Components

Reusable UI components for the Golf Tournament Manager.

## SmartSearch

A feature-rich search bar component with:

- ⌨️ **Keyboard navigation** - Arrow Up/Down to navigate through results
- ✨ **Auto-highlight** - First result is highlighted as you type
- ↩️ **Enter to select** - Press Enter to select highlighted item
- 🧹 **Auto-clear** - Search box clears after selection
- 🎯 **Auto-focus management** - Automatically focuses next search bar when done
- 🔍 **Escape to clear** - Press Escape to clear the search

### Basic Usage

```html
<!-- Include the script -->
<script src="../components/smart-search.js"></script>

<!-- Your search input -->
<input type="text" id="player-search" placeholder="Search players..." />

<!-- Your list container -->
<div id="players-list">
  <!-- Items will be rendered here -->
</div>
```

```javascript
// Create the SmartSearch instance
const playerSearch = new SmartSearch({
  inputId: 'player-search',
  listId: 'players-list',
  itemSelector: '.player-card',
  highlightClass: 'highlighted',
  
  // Return your current filtered items array
  getItems: () => filteredPlayers,
  
  // Called when user types - filter your data here
  onFilter: (searchTerm) => {
    filteredPlayers = allPlayers.filter(p => 
      p.name.toLowerCase().includes(searchTerm)
    );
    renderPlayers(); // Your render function
  },
  
  // Called when user presses Enter
  onSelect: (player, index) => {
    assignPlayer(player.id);
  },
  
  // Optional: Focus this element when all items are processed
  nextFocusId: 'team-search',
  
  // Optional: Check if processing is complete
  checkComplete: () => {
    return allPlayersAssigned();
  }
});

// After rendering your list, call render() to apply highlighting
function renderPlayers() {
  // ... render your player cards ...
  playerSearch.render();
}
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `inputId` | string | required | ID of the search input element |
| `listId` | string | required | ID of the list container element |
| `itemSelector` | string | required | CSS selector for list items |
| `highlightClass` | string | `'highlighted'` | Class added to highlighted item |
| `getItems` | function | `() => []` | Returns current filtered items array |
| `onFilter` | function | `() => {}` | Called when user types |
| `onSelect` | function | `() => {}` | Called when user presses Enter |
| `clearOnSelect` | boolean | `true` | Clear search box after selection |
| `autoHighlight` | boolean | `true` | Auto-highlight first result when typing |
| `nextFocusId` | string | `null` | ID of element to focus when complete |
| `checkComplete` | function | `() => false` | Check if processing is complete |

### Methods

| Method | Description |
|--------|-------------|
| `render()` | Apply highlighting to list items |
| `focus()` | Focus the search input |
| `clear()` | Clear search and reset highlighting |
| `getHighlightedIndex()` | Get current highlighted index |
| `setHighlightedIndex(index)` | Set highlighted index programmatically |

### Required CSS

```css
.player-card.highlighted {
  background: #dbeafe;
  border-color: var(--accent);
  box-shadow: 0 2px 8px rgba(2,6,23,0.15);
}
```
