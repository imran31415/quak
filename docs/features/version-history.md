# Version History & Snapshots

Quak lets you take point-in-time snapshots of any sheet and restore them later. This gives you a lightweight versioning system without external tools.

## Creating Snapshots

Click the **clock icon** in the grid toolbar to open the Version History panel. Then click **Create Snapshot** to save the current state. You can optionally add a label (e.g., "Before cleanup", "Q1 Final").

Each snapshot captures:
- All column definitions (names, types, options)
- All row data at that moment
- A version number (auto-incremented)

## Browsing & Preview

The Version History panel shows all snapshots ordered newest-first, with:
- Version badge (v1, v2, ...)
- Label (if provided)
- Row count
- Timestamp

Click **Preview** on any snapshot to open a read-only modal showing the data as it was at that point.

## Restoring Snapshots

Click **Restore** on any snapshot to roll back the sheet. Before restoring, Quak automatically creates a "Pre-restore auto-save" snapshot so you never lose the current state.

Restoring replaces:
- The physical DuckDB table (dropped and recreated)
- Column metadata in `__quak_sheets`
- All row data

## Automatic Snapshots

Auto-save snapshots are created before every restore operation. They're labeled "Pre-restore auto-save (vN)" and can be restored like any other snapshot.

## Deleting Snapshots

Click the trash icon on any snapshot to permanently delete it. This is irreversible.

## How It Works

Snapshots are stored in the `__quak_snapshots` table with columns and rows serialized as JSON. This means snapshots are self-contained — they don't depend on the current table schema.
