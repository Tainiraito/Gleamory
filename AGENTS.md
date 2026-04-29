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

| Category         | Technology     | Version       |
|------------------|----------------|---------------|
| Framework        | Vue 3          | ^3.4.21       |
| Build Tool       | Vite           | ^5.2.8        |
| CSS Framework    | Tailwind CSS   | ^3.4.3        |
| CSS Post-process | Autoprefixer   | ^10.4.19      |
| Language         | JavaScript (ES Modules) | —      |
| Data Storage     | Static JSON files | —          |

## Project Structure

```
Gleamory/
├── index.html               # HTML entry point (Vite root)
├── package.json             # Dependencies and scripts
├── vite.config.js           # Vite config with Vue plugin + @ alias
├── tailwind.config.js       # Tailwind theme (custom colors, fonts)
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
├── public/                  # Static assets (if any)
├── node_modules/            # Dependencies (gitignored)
└── src/
    ├── main.js              # Vue app entry point
    ├── App.vue              # Root layout component
    ├── components/
    │   ├── ProjectCard.vue  # Single project card
    │   ├── ProjectGrid.vue  # Responsive card grid layout
    │   └── Timeline.vue     # Timeline/activity feed
    ├── data/
    │   ├── projects.json    # Project data records
    │   └── timeline.json    # Timeline update records
    └── styles/
        └── main.css         # Tailwind directives + custom CSS
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
- `App.vue` imports both data files, wraps them in `ref()`, and passes them as props.
- All components use Vue 3 Composition API with `<script setup>`.

### Component Props

**ProjectCard.vue**
```js
props: {
  project: Object  // { id, name, description, url, status, tags, cover, version, updatedAt }
}
```

**ProjectGrid.vue**
```js
props: {
  projects: Array  // Array of project objects
}
```

**Timeline.vue**
```js
props: {
  updates: Array   // Array of update objects { id, projectId, content, date }
}
```

### Data Schema

**projects.json** — `{ projects: [...] }`

| Field       | Type    | Required | Description                              |
|-------------|---------|----------|------------------------------------------|
| id          | string  | yes      | Unique project identifier                |
| name        | string  | yes      | Display name                             |
| description | string  | yes      | One-line description                     |
| url         | string  | yes      | External URL (opens in new tab)          |
| status      | string  | no       | 开发中 \| 已上线 \| 已下线               |
| tags        | array   | no       | String tags (在线网站, 小游戏, 杂项, etc.) |
| cover       | string  | no       | Image path (empty string = no cover)     |
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
primary-pink:    #FFB7C5   (main pink)
primary-light:   #FFF0F5   (light pink background)
primary-dark:    #E8879E   (dark pink)
accent-gold:     #FFD700   (gold accent)
accent-purple:   #E6E6FA   (light purple accent)
text-primary:    #4A4A4A   (primary text)
text-secondary:  #8A8A8A   (secondary text)
bg-white:        #FFFFFF   (white)
bg-cream:        #FFFAF0   (cream background, page default)
```

All colors are defined in `tailwind.config.js` and mirrored as CSS variables in `src/styles/main.css`.

### Font

- `Noto Sans SC` (Google Fonts, loaded in `index.html`)
- Fallback: `system-ui, sans-serif`

### Animations

Two custom CSS classes in `src/styles/main.css`:

- **`.card-hover`** — smooth lift + pink shadow on hover (`translateY(-5px)` with `0.3s ease` transition)
- **`.fade-in`** — opacity + slide-up keyframe animation on mount (`0.5s ease-in`)

### Responsive Breakpoints

Uses Tailwind default breakpoints:
- Mobile: < 768px (`grid-cols-1`)
- Tablet: 768px–1023px (`md:grid-cols-2`)
- Desktop: ≥ 1024px (`lg:grid-cols-3`)

## Coding Conventions

### Vue

- **Always use** `<script setup>` with Composition API
- **No Options API** components
- Props defined with `defineProps()`, no emits used yet
- Computed properties use `computed()` from Vue
- Components are imported using relative paths from `./components/` (the `@` alias is available for `src/` imports)

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
