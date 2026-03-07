# Import & Export

Quak supports importing data from files and exporting your sheets for use elsewhere.

## Import

### Supported Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| CSV | `.csv` | Auto-detects delimiter (comma, semicolon, tab) |
| TSV | `.tsv` | Tab-separated values |
| JSON | `.json` | Array of objects |

### How to Import

**Drag and drop** a file anywhere onto the app, or use the import button. A preview dialog appears showing:

1. **Detected columns** with auto-inferred types
2. **Data preview** of the first rows
3. **Sheet name** (defaults to the filename)

Click **Import** to create a new sheet with the data.

### Type Inference

Quak automatically detects column types from your data:

| Data Pattern | Detected Type |
|-------------|---------------|
| `true`, `false`, `yes`, `no` | Checkbox |
| `2026-01-15`, `01/15/2026` | Date |
| `42`, `3.14`, `-100` | Number |
| Everything else | Text |

### CSV Parser

The built-in CSV parser handles:

- Custom delimiters (auto-detected)
- Quoted fields with escaped quotes
- Headers from the first row
- Mixed line endings (CRLF, LF)

## Export

Export your current sheet data as:

| Format | Description |
|--------|-------------|
| CSV | Comma-separated values with headers |
| JSON | Array of row objects |

Use the export button in the grid toolbar to download your data.
