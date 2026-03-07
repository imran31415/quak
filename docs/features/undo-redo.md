# Undo & Redo

Quak maintains a full undo/redo stack so you can safely experiment with your data.

## Supported Operations

The following actions can be undone and redone:

| Operation | Description |
|-----------|-------------|
| Cell edits | Changing the value of any cell |
| Row additions | Adding new rows |
| Row deletions | Deleting single or multiple rows |
| Column additions | Adding new columns |
| Column deletions | Removing columns |
| Column renames | Changing column names |
| Column type changes | Converting between cell types |

## Usage

### Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Undo | `Ctrl+Z` (or `Cmd+Z` on Mac) |
| Redo | `Ctrl+Y` or `Ctrl+Shift+Z` |

### Toolbar Buttons

The grid toolbar shows undo/redo buttons. They are grayed out when there's nothing to undo or redo.

## How It Works

- Actions are pushed onto a stack (max **50 actions**)
- When you undo, the action moves to the redo stack
- Making a new edit after undoing clears the redo stack
- Each undo/redo operation syncs with the server to keep data consistent
