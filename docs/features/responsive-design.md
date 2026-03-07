# Responsive Design

Quak adapts to any screen size — from wide desktop monitors to mobile phones.

## Desktop Layout

On desktop, the app displays:

- **Sidebar** (left) — sheet list and management
- **Main area** (center) — spreadsheet grid with toolbar
- **Query panel** (bottom) — SQL editor and results

<img src="/screenshots/desktop.png" alt="Quak desktop layout" style="max-width: 800px; width: 100%; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.12);" />

## Mobile Layout

On smaller screens, the layout shifts to:

- **Header** with hamburger menu
- **Full-width grid** — all available screen space for your data
- **Bottom navigation bar** — switch between Sheets and SQL views
- **Slide-over sidebar** — opens on top of the grid when needed

<div style="max-width: 320px;">
  <img src="/screenshots/mobile.png" alt="Quak mobile layout" style="width: 100%; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.12);" />
</div>

## Breakpoints

The app detects mobile layout automatically using a width threshold. The UI store tracks the mobile state and components adapt:

- Sidebar collapses to a slide-over panel
- Bottom navigation replaces the SQL button
- Grid columns scroll horizontally
- Touch-friendly tap targets for cell editing

## Toast Notifications

Toast messages appear at the top of the screen on desktop and bottom on mobile, keeping them visible without blocking content.
