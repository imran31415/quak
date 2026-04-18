# Cell Rich Text Formatting

Quak supports per-cell formatting that goes beyond conditional formatting. You can apply bold, italic, underline, strikethrough, text color, and background color to individual cells.

## Formatting Options

| Format | Description |
|--------|-------------|
| **Bold** | Makes text bold |
| *Italic* | Makes text italic |
| Underline | Adds underline decoration |
| ~~Strikethrough~~ | Strikes through text |
| Text Color | Changes the font color |
| Background Color | Changes the cell background |

## Applying Formats

1. **Select cells** — click a cell, or click and drag to select a range
2. **Use the toolbar** — the formatting toolbar appears in the grid toolbar when cells are selected
3. **Click a format button** — bold (B), italic (I), underline (U), strikethrough (S), or pick colors

Formats are applied to all selected cells at once via bulk operations.

## How It Works

Cell formats are stored in the `__quak_cell_formats` table, separate from cell data. Each format record references a sheet, row, and column, with boolean flags for each style and optional color strings.

This separation means:
- Formatting doesn't affect the underlying data
- Formats survive cell value changes
- You can clear all formatting without losing data

## Interaction with Conditional Formatting

Cell-level formatting takes priority over conditional formatting. If a cell has both a conditional format rule and a manual format, the manual format's colors will override the conditional ones.
