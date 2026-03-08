# Dark Mode

Quak supports three theme modes: **Light**, **Dark**, and **System** (follows your OS preference). The theme persists across sessions via localStorage.

## Theme Toggle

Click the theme button in the header (or the **Theme** button in the mobile bottom nav) to cycle through modes:

1. **Light** (sun icon) — bright backgrounds, dark text
2. **Dark** (moon icon) — dark backgrounds, light text
3. **System** (monitor icon) — automatically matches your OS `prefers-color-scheme` setting

<img src="/screenshots/grid-view.png" alt="Light mode" style="max-width: 800px; width: 100%; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.12);" />

<img src="/screenshots/grid-view-dark.png" alt="Dark mode" style="max-width: 800px; width: 100%; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.12);" />

## All Views Support Dark Mode

Every view adapts to the selected theme:

### Kanban

<img src="/screenshots/kanban-view-dark.png" alt="Kanban dark mode" style="max-width: 800px; width: 100%; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.12);" />

### Calendar

<img src="/screenshots/calendar-view-dark.png" alt="Calendar dark mode" style="max-width: 800px; width: 100%; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.12);" />

### Gallery

<img src="/screenshots/gallery-view-dark.png" alt="Gallery dark mode" style="max-width: 800px; width: 100%; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.12);" />

## Technical Details

- **Tailwind CSS `dark:` variants** — all 42+ components use Tailwind's class-based dark mode strategy
- **AG Grid theme switching** — the grid dynamically switches between `colorSchemeLight` and `colorSchemeDark`
- **FOUC prevention** — an inline script in `<head>` applies the `dark` class before React hydrates, preventing a white flash on reload
- **Smooth transitions** — background and border colors transition over 150ms for a polished feel
- **Recharts dark mode** — chart axes, grids, and tooltips adapt to the active theme
- **System preference listener** — when set to "System", the theme reacts live to OS-level changes via `matchMedia`

## Mobile

The mobile bottom navigation includes a dedicated **Theme** button alongside Sheets, SQL, and AI.

<div style="display: flex; gap: 16px;">
  <img src="/screenshots/mobile.png" alt="Mobile light" style="width: 280px; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.12);" />
  <img src="/screenshots/mobile-dark.png" alt="Mobile dark" style="width: 280px; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.12);" />
</div>
