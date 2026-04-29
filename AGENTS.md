# AGENTS.md — Gleamory 微光集

> **For AI agents**: This file describes the project, its conventions, and how to work on it.
> Keep this file current when adding or changing build commands, conventions, or architecture.

## Project Overview

**Gleamory** (微光集) is a personal project showcase homepage — a central landing page that displays all of the owner's projects as cards. It serves as a unified entry point and personal branding site.

- **Repository**: https://github.com/Tainiraito/Gleamory
- **Language**: Chinese (UI text), English (code identifiers)
- **License**: MIT
- **Docs**: `README.md`, `CHANGELOG.md`, `docs/requirements.md`

## Tech Stack

| Category         | Technology       | Version       |
|------------------|------------------|---------------|
| Framework        | Vue 3            | ^3.4.21       |
| UI Library       | Element Plus     | ^2.13.7       |
| Build Tool       | Vite             | ^5.2.8        |
| CSS Framework    | Tailwind CSS     | ^3.4.3        |
| CSS Post-process | Autoprefixer     | ^10.4.19       |
| Language         | JavaScript (ES Modules) | —      |
| Font             | Source Han Serif CN (local OTF) | —   |
| Data Storage     | Static JSON files | —            |

## Project Structure

```
Gleamory/
├── index.html               # HTML entry point (Vite root)
├── package.json             # Dependencies and scripts
├── vite.config.js           # Vite config with Vue plugin + @ alias
├── tailwind.config.js       # Tailwind theme (custom colors, fonts, fontSizes, borderRadius)
├── postcss.config.js        # PostCSS: tailwindcss + autoprefixer
├── .gitignore               # Git ignore rules
├── README.md                # Project readme
├── CHANGELOG.md             # Semantic versioning changelog
├── AGENTS.md                # This file
├── docs/
│   └── requirements.md      # Full requirements document (Chinese)
├── .hermes/
│   └── plans/               # Hermes agent planning documents
├── dist/                    # Production build output (gitignored)
├── public/
│   └── covers/              # Project cover images (served as static files)
├── node_modules/            # Dependencies (gitignored)
└── src/
    ├── main.js              # Vue app entry point (registers Element Plus)
    ├── App.vue              # Root layout: sticky navbar, sections, footer, back-to-top
    ├── components/
    │   ├── ProjectCard.vue  # Project card (featured + regular layouts)
    │   ├── ProjectGrid.vue  # Card layout: top 3 featured, rest in responsive grid
    │   └── Timeline.vue     # Timeline/activity feed (Element Plus timeline)
    ├── data/
    │   ├── projects.json    # Project data records (12 test projects)
    │   └── timeline.json    # Timeline update records (2 test entries)
    ├── assets/
    │   └── fonts/           # Source Han Serif CN font files (3 weights)
    └── styles/
        └── main.css         # Tailwind directives + font-face + CSS variables + utility classes
```

## Commands

### Development

```bash
npm run dev        # Start Vite dev server (HMR, localhost)
```

### Build & Preview

```bash
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
```

### Testing, Linting, Type-Checking

There are **no test, lint, or type-check commands** configured at the moment. The project uses plain JavaScript (no TypeScript). No ESLint, Prettier, or test framework is set up. When adding one, update this section and the `package.json` scripts.

## Architecture

### Data Flow

```
src/data/projects.json ──┐
                         ├──> App.vue ──> ProjectGrid.vue ──> ProjectCard.vue
src/data/timeline.json ──┘                  │
                                            └──> Timeline.vue
```

- Data is imported statically from JSON files at build time (no API/fetch).
- `App.vue` imports both data files and passes them as props.
- Timeline data is reversed (`[...updates].reverse()`) so newest entries appear first.
- All components use Vue 3 Composition API with `<script setup>`.

### Component Props

**ProjectCard.vue**
```js
props: {
  project: Object,   // { id, name, description, url, status, tags, cover, version, updatedAt }
  featured: Boolean   // top 3 projects get full-width featured layout, rest get grid cards
}
```

**ProjectGrid.vue**
```js
props: {
  projects: Array  // Array of project objects; first 3 rendered as featured, rest as grid
}
```

**Timeline.vue**
```js
props: {
  updates: Array   // Array of update objects { id, projectId, content, date } (pre-sorted descending)
}
```

### Data Schema

**projects.json** — `{ projects: [...] }`

| Field       | Type    | Required | Description                              |
|-------------|---------|----------|------------------------------------------|
| id          | string  | yes      | Unique project identifier                |
| name        | string  | yes      | Display name                             |
| description | string  | yes      | One-line description                     |
| url         | string  | yes      | External URL (opens in new tab via `window.open`) |
| status      | string  | no       | 开发中 \| 已上线 \| 已下线               |
| tags        | array   | no       | String tags (在线网站, 小游戏, 杂项, etc.) |
| cover       | string  | no       | Public URL path e.g. `"/covers/xxx.png"`; empty string = gradient placeholder |
| version     | string  | no       | e.g., "v1.0.0"                           |
| updatedAt   | string  | no       | ISO date, e.g., "2026-04-29"             |

**timeline.json** — `{ updates: [...] }`

| Field     | Type   | Required | Description               |
|-----------|--------|----------|---------------------------|
| id        | string | yes      | Unique entry identifier   |
| projectId | string | yes      | Foreign key to project.id |
| content   | string | yes      | Update description        |
| date      | string | yes      | ISO date                  |

### Vite Config

- **Plugin**: `@vitejs/plugin-vue`
- **Path alias**: `@` → `./src` (configured in `vite.config.js` and usable in imports)

## Styling & Design

### Color Palette (Tailwind Custom Colors)

```
primary-pink:     #F783AC   (main pink accent)
primary-dark:     #E05A8A   (dark pink for status badges)
primary-purple:   #B490E4   (secondary purple accent)
primary-light:    #FFF0F5   (light pink background)
purple-light:     #F3EEFF   (light purple background)
accent-gold:      #FFD700   (gold accent)
text-primary:     #2D2D2D   (primary text)
text-body:        #5A5A5A   (body text)
text-secondary:   #9A9A9A   (secondary/muted text)
bg-white:         #FFFFFF   (white)
bg-cream:         #FFFFFF   (page background, currently white)
bg-noise-start:   #FFF5F7   (gradient start)
bg-noise-end:     #F5EFFF   (gradient end)
```

All colors are defined in `tailwind.config.js` and mirrored as CSS variables in `src/styles/main.css`.

### Font

- **Source Han Serif CN** (思源宋体), loaded locally from `src/assets/fonts/`
- Three weights declared via `@font-face` in `src/styles/main.css`:
  - **Medium** (500) — body text, Span/Div/A/Button/Li/Td/Th
  - **SemiBold** (600) — section titles (h2), card titles (h3)
  - **Bold** (700) — page title (h1), hero title
- Fallback stack: `Georgia, 'Times New Roman', serif`
- No external font CDN (Google Fonts removed from `index.html`)
- Tailwind font-family config: `'"Source Han Serif CN"', Georgia, serif`
- Tailwind `font-*` weight classes mapped to override defaults: `font-normal` → 500, `font-medium` → 500, `font-semibold` → 600, `font-bold` → 700

### Tailwind Custom Utilities

**fontSize** (defined in `tailwind.config.js`):
| Key          | Size / Line-height / Weight |
|--------------|-----------------------------|
| `hero`       | 32px / 1.2 / 700            |
| `section`    | 22px / 1.3 / 600            |
| `card-title` | 18px / 1.4 / 600            |
| `body`       | 15px / 1.6 / 500            |
| `small`      | 13px / 1.5 / 500            |

**borderRadius**: `rounded-8` (8px), `rounded-12` (12px)

### Custom CSS Classes (defined in `src/styles/main.css`)

**Layout:**
- `.flex-col-min-h` — flex column with min-height 100vh (sticky footer helper)

**Hero (used in hero banner components):**
- `.hero-banner` — gradient background (#F783AC → #B490E4) with floating blur decorations
- `.hero-title` — fade-in + slide-up reveal animation (1s ease-out)
- `.hero-subtitle` — fade-in + slide-up with 0.5s delay (1.5s ease-out)

**Cards:**
- `.glass-card` — frosted glass card with hover lift + pink/ purple glow shadow
- `.featured-card` — full-width variant of glass card, min-height 320px
- `.card-cover-placeholder` — gradient placeholder (primary-light → purple-light) for cards without cover images

**Text:**
- `.section-title` — gradient text (#F783AC → #B490E4), 22px, weight 700
- `.text-gradient` — gradient text utility (pink → purple)
- `.glow-text` — pink + purple text-shadow glow

**Status:**
- `.status-badge` — status label base styling (weight 500, letter-spacing)

**Tags:**
- `.tag-item` — scale(1.05) on hover

**Scroll reveal:**
- `.reveal-on-scroll` + `.revealed` — opacity + translateY transition triggered by IntersectionObserver
- `.reveal-delay-1` through `.reveal-delay-4` — staggered delays for cascade effect

**Back to top:**
- `.back-to-top` — fixed bottom-right gradient circle button, fades in on scroll > 400px

**Timeline:**
- `.timeline-item-animate` — slide-in animation for timeline entries
- `.timeline-fade-enter-active` / `.timeline-fade-leave-active` — Vue transition classes for expand/collapse

### Responsive Breakpoints

Uses Tailwind default breakpoints:
- Mobile: < 768px (`grid-cols-1`)
- Tablet: 768px–1023px (`md:grid-cols-2`)
- Desktop: ≥ 1024px (`lg:grid-cols-3`)

## Component Details

### App.vue

- **Sticky navbar** at top with gradient translucent background (`from-primary-pink/10 via-white to-primary-purple/10`), backdrop blur, bottom shadow
- **Title**: "Gleamory 微光集" uses `.text-gradient` class (pink-to-purple gradient text)
- **Sections**: "拾光集录" (Projects) and "流光忆庭" (Timeline), each with `.section-title` h2 + English subtitle
- **Footer**: centered copyright with border-top
- **Back to top button**: fixed gradient circle, visible when scrollY > 400, smooth scroll to top
- **Scroll reveal**: IntersectionObserver adds `.revealed` class to `.reveal-on-scroll` elements on intersection

### ProjectCard.vue

Two distinct layouts controlled by the `featured` boolean prop:

**Featured (top 3):**
- Full-width card (inherits `.featured-card` styles)
- Cover image as full background with dark gradient overlay for text readability
- White text, large title (text-3xl), description, tags with glass backdrop
- Status badge with white/glass styling
- Version and date at bottom

**Regular (grid items):**
- Standard card (inherits `.glass-card` styles)
- Cover image or gradient placeholder at top (h-48 / h-32)
- Dark text with gradient-on-hover title effect
- Gradient purple/pink tags, status badge with color-coded gradient
- Glow decor elements on hover (pink + purple blur circles)
- Click handler opens `project.url` in new tab via `window.open`

**Status badge styling:**
- 开发中: pink gradient background + pink border
- 已上线: purple gradient background + purple border
- 已下线: gray background + gray border

### ProjectGrid.vue

- First 3 projects rendered individually as `<ProjectCard :featured="true" />` (full-width stacked)
- Remaining projects rendered in a `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` as regular cards

### Timeline.vue

- Uses **Element Plus** `<el-timeline>` and `<el-timeline-item>` components
- Dot color: pink-to-purple gradient circle (`#F783AC` → `#B490E4`)
- Timeline items animate in with staggered delay
- Shows first 10 entries by default; "展开全部" button reveals all; "收起" collapses back to 10
- Vue `<transition-group>` with `.timeline-fade-*` classes for expand animation (no animation on collapse)
- Content text uses `text-text-body text-body font-normal`

## Coding Conventions

### Vue

- **Always use** `<script setup>` with Composition API
- **No Options API** components
- Props defined with `defineProps()`
- Computed properties use `computed()` from Vue
- Components are imported using relative paths from `./components/` (the `@` alias is available for `src/` imports)
- Element Plus components are registered globally in `main.js` (not imported per-component)
- Lifecycle hooks: use `onMounted` / `onUnmounted` for event listeners and observers

### JavaScript

- ES modules (`"type": "module"` in `package.json`)
- Prefer `const`, use `let` only when reassignment is necessary
- Use template literals for string interpolation

### Naming

- **Vue components**: PascalCase filenames (`ProjectCard.vue`)
- **JavaScript files**: kebab-case or camelCase as appropriate
- **JSON data files**: kebab-case (`projects.json`)
- **CSS classes**: kebab-case, following Tailwind conventions

### Comments

- Comments are in Chinese
- Not verbose — only where behavior is non-obvious

### Git

- **Commit style**: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, etc.), see `.hermes/plans/` for the full spec
- **Branch naming**: `feature/xxx`, `bugfix/xxx`, `refactor/xxx`, `docs/xxx`, `chore/xxx`
- **Branches**: `main` is the default branch

## Hermes Planning

The `.hermes/plans/` directory contains AI agent planning documents used during development:
- `2026-04-29_024500-project-init-plan.md` — Project initialization and workflow plan
- `2026-04-29_031000-development-plan.md` — Detailed execution plan for all development phases

These are reference documents. New plans should follow the same naming convention: `YYYY-MM-DD_HHMMSS-<description>.md`.

## Contribution Workflow

1. Create a feature/bugfix branch from `main`
2. Develop with `npm run dev`
3. Commit using Conventional Commits format
4. Push and create a Pull Request
5. Merge to `main` after review

## Environment

- **Node.js**: LTS version recommended
- **Package manager**: npm (see `package-lock.json`)
- **OS**: Cross-platform (Linux, macOS, Windows)
