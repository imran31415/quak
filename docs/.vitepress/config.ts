import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Quak',
  description: 'DuckDB-Powered Spreadsheet — Documentation',
  head: [['link', { rel: 'icon', href: '/favicon.ico' }]],

  themeConfig: {
    logo: undefined,
    siteTitle: 'Quak Docs',

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Features', link: '/features/' },
      { text: 'Getting Started', link: '/getting-started' },
      { text: 'Architecture', link: '/architecture' },
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is Quak?', link: '/' },
          { text: 'Getting Started', link: '/getting-started' },
          { text: 'Architecture', link: '/architecture' },
        ],
      },
      {
        text: 'Features',
        items: [
          { text: 'Overview', link: '/features/' },
          { text: 'Multiple Views', link: '/features/views' },
          { text: 'Cell Types', link: '/features/cell-types' },
          { text: 'SQL Query Panel', link: '/features/sql-queries' },
          { text: 'Charts & Visualization', link: '/features/charts' },
          { text: 'Import & Export', link: '/features/import-export' },
          { text: 'Search & Filtering', link: '/features/search-filtering' },
          { text: 'Undo & Redo', link: '/features/undo-redo' },
          { text: 'Sheet Management', link: '/features/sheet-management' },
          { text: 'Keyboard Shortcuts', link: '/features/keyboard-shortcuts' },
          { text: 'Responsive Design', link: '/features/responsive-design' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Tech Stack', link: '/tech-stack' },
          { text: 'Testing', link: '/testing' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com' },
    ],

    footer: {
      message: 'MIT Licensed',
      copyright: 'Quak — DuckDB-Powered Spreadsheet',
    },

    search: {
      provider: 'local',
    },
  },
})
