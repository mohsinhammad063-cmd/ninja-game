# ninja-game
### Phase 2: Pause and Control Flow
- Implemented styled confirmation modals for restarting and exiting.
- Game can be paused via the Escape or 'P' keys, or by hiding the browser tab.
- Pausing halts game logic completely by restricting `gameLoop` inside `GameManager` using `stateManager.getState()`.
- Use `node test_game.js` to run automated UI checks for the pause flows.
