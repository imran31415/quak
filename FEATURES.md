# Quak Feature Roadmap

## Tier 1 — Highest Impact

### 1. Working Formula Engine
**Status:** Done
**Priority:** P0
**Description:** Replace the stub `formulaEngine.ts` with a real formula evaluator. Support cell references (A1, B2), ranges (A1:A10), and common functions (SUM, AVG, COUNT, MIN, MAX, IF, VLOOKUP, CONCATENATE, etc.). Formulas should recalculate when dependent cells change.

### 2. Linked Records / Lookup Columns
**Status:** Done
**Priority:** P0
**Description:** New `linked_record` cell type that references rows from other sheets. A lookup column auto-pulls values from the linked sheet (like Airtable). Leverages DuckDB JOINs across sheet tables.

### 3. Forms View
**Status:** Done
**Priority:** P0
**Description:** A 6th view type that auto-generates a submission form from a sheet's column schema. Shareable form URL, responses become new rows. Supports required fields, dropdowns, date pickers based on column types.

## Tier 2 — High Impact

### 4. Dashboard View
**Status:** Done
**Priority:** P1
**Description:** A 7th view type with drag-and-drop widgets (charts, KPIs, summary tables) powered by the SQL/DuckDB engine. Users visualize data without writing SQL.

### 5. Attachment / File Cells
**Status:** Done
**Priority:** P1
**Description:** New `file` cell type. Upload images, PDFs, documents to cells. Server stores files on disk. Cells show thumbnails/icons. Click to preview or download.

### 6. Dependent Dropdowns
**Status:** Done
**Priority:** P1
**Description:** Dropdown column options that change based on another column's value (e.g., Country → City). Configuration via column settings specifying the parent column and value-to-options mapping.

### 7. Version History / Snapshots
**Status:** Done
**Priority:** P1
**Description:** Point-in-time snapshots users can browse and restore. Build on top of the existing audit log to reconstruct past states or store periodic snapshots.

## Tier 3 — Polish & Extensibility

### 8. Cell Rich Text Formatting
**Status:** Not Started
**Priority:** P2
**Description:** Per-cell bold, italic, font color, background color (beyond conditional formatting). Store formatting metadata alongside cell values.

### 9. Webhooks & REST API Keys
**Status:** Not Started
**Priority:** P2
**Description:** Authenticated REST API for external access. Webhook triggers on data changes (row added, cell updated, etc.). Enables integrations with Zapier, n8n, custom scripts.

### 10. Automations
**Status:** Not Started
**Priority:** P2
**Description:** Rule engine: "When column X changes to Y, set column Z to W." Configurable triggers and actions to reduce manual repetitive work.

### 11. Print / PDF Export
**Status:** Not Started
**Priority:** P2
**Description:** Formatted print layouts with headers, page breaks, column widths, and conditional formatting preserved. Export as PDF or browser print dialog.

### 12. Multi-User / Real-Time Collaboration
**Status:** Not Started
**Priority:** P2
**Description:** User authentication, presence indicators, real-time sync via WebSockets, conflict resolution, user cursors. Transforms from single-user to team tool.
