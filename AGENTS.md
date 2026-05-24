# AGENTS.md — Gleamory 微光集

> **For AI agents**: This file describes the project, its conventions, and how to work on it.
> Keep this file current when adding or changing build commands, conventions, or architecture.

## Project Overview

**Gleamory** (微光集) is a personal project showcase homepage — a central landing page that displays all of the owner's projects as cards with a magazine-style editorial layout. It serves as a unified entry point and personal branding site.

- **Repository**: https://github.com/Tainiraito/Gleamory
- **Language**: Chinese (UI text), English (code identifiers)
- **License**: MIT
- **Docs**: `README.md`, `CHANGELOG.md`, `docs/requirements.md`

## Tech Stack

| Category         | Technology                | Version            |
| ---------------- | ------------------------- | ------------------ |
| Framework        | React                     | ^19.0.0            |
| Language         | TypeScript                | ^5.8               |
| Build Tool       | Vite                      | ^7.0 (inferred)    |
| CSS Framework    | Tailwind CSS              | ^4.3.0             |
| Animation        | Framer Motion             | ^12.0.0            |
| Linter           | ESLint                    | ^10.3.0 (flat cfg) |
| Formatter        | Prettier                  | ^3.8.3             |
| Font (primary)   | Source Han Serif CN (OTF) | — (local, 3 wts)   |
| Font (poetry)    | LXGW WenKai (GoogleFonts) | —                  |
| Data Storage     | Static JSON files         | —                  |
| Deploy           | GitHub Pages (Actions)    | —                  |

## Project Structure

```
Gleamory/
├── index.html               # HTML entry point
├── package.json             # Dependencies and scripts
├── vite.config.ts           # Vite config: @tailwindcss/vite + @vitejs/plugin-react + @ alias
├── tsconfig.json            # TypeScript project references (app + node)
├── tsconfig.app.json        # TS config for src/ (strict, react-jsx, @/ path alias)
├── tsconfig.node.json       # TS config for vite.config.ts
├── eslint.config.js         # ESLint flat config (react-hooks + typescript-eslint)
├── .prettierrc              # Prettier config (no semi, single quote, printWidth 100)
├── .gitignore               # Git ignore rules
├── AGENTS.md                # This file
├── CHANGELOG.md             # Semantic versioning changelog
├── README.md                # Project readme
├── components.json          # shadcn/ui config (initialized but unused)
├── .github/
│   └── workflows/
│       └── deploy.yml       # GitHub Actions: npm ci → build → deploy Pages
├── docs/
│   └── requirements.md      # Full requirements document (Chinese)
├── public/
│   ├── covers/              # Project cover images (served as static files)
│   ├── CNAME                # Custom domain: gleamory.lovelysia.top
│   └── favicon.svg          # Pink-purple gradient star favicon
├── src/
│   ├── main.tsx             # React entry point (StrictMode + createRoot)
│   ├── App.tsx              # Root layout: floating logo, project grid, calendar+poem, timeline, footer
│   ├── vite-env.d.ts        # Vite client type declarations
│   ├── components/
│   │   ├── FloatingLogo.tsx # Fixed top-left brand text
│   │   ├── ProjectGrid.tsx  # Magazine grid: featured (7cols) + secondary (5cols) + list
│   │   ├── ProjectCard.tsx  # Card component (featured/secondary variant)
│   │   ├── CalendarCard.tsx # Live calendar display (current month + today highlight)
│   │   ├── PoemCard.tsx     # Daily poem (API with local JSON fallback)
│   │   ├── Timeline.tsx     # Update timeline (Framer Motion staggered animation)
│   │   ├── Footer.tsx       # Footer with copyright + GitHub link
│   │   └── metronome/       # 节拍器组件
│   │       └── Metronome.tsx# 核心组件：拍点/音色选择/小节管理/BPM控制
│   ├── hooks/
│   │   └── useMetronome.ts  # 节拍器 Web Audio API + 播放控制 + 变速模式 hook
│   ├── types/
│   │   ├── index.ts         # TypeScript type definitions (Project, Update, etc.)
│   │   └── metronome.ts     # 节拍器类型定义（Beat, Measure, MetronomeConfig, TempoChangeConfig）
│   ├── data/
│   │   ├── projects.json    # Project data records
│   │   ├── timeline.json    # Timeline update records
│   │   ├── poems.json       # Fallback poem collection (31 poems)
│   │   └── beatSounds.ts    # 6种节拍音色配置（Web Audio合成参数）+ 音色预设
│   ├── assets/
│   │   └── fonts/           # Source Han Serif CN font files (3 weights)
│   ├── pages/
│   │   ├── GachaSimulator.tsx # 翻牌抽卡模拟器 (#/gacha-simulator)
│   │   ├── PianoPage.tsx      # 极简钢琴 (#/piano)
│   │   └── MetronomePage.tsx  # 节拍器 (#/metronome)
│   └── styles/
│       └── globals.css      # Tailwind v4 @import + @theme + CSS vars + font-face + scrollbar
```

## Commands

### Development

```bash
npm run dev        # Start Vite dev server (HMR, localhost)
```

### Build & Preview

```bash
npm run build      # tsc -b + vite build → dist/
npm run preview    # Preview production build locally
```

### Linting & Formatting

```bash
npm run lint       # ESLint check (.ts, .tsx)
npm run format     # Prettier auto-format (src/**/*.{ts,tsx,css}, *.{json,md})
```

The project uses **ESLint** (flat config, `eslint.config.js`) with `typescript-eslint` and `eslint-plugin-react-hooks`, plus **Prettier** (`.prettierrc`, semi-free, single quotes, printWidth 100). No test framework.

## Architecture

### Data Flow

```
src/data/projects.json ──┐
                         ├──> App.tsx ──> ProjectGrid.tsx ──> ProjectCard.tsx
src/data/timeline.json ──┘        │
                                   ├── CalendarCard.tsx (self-contained, JS Date)
                                   ├── PoemCard.tsx (self-contained, API + fallback)
                                   └── Timeline.tsx (receives updates prop)
```

- Data is imported statically from JSON files at build time (no API/fetch).
- `App.tsx` imports all data and passes relevant props to children.
- `CalendarCard` and `PoemCard` are self-contained with no props from App.
- `PoemCard` fetches from `v1.jinrishici.com` API on mount; falls back to local `poems.json` on failure.
- Components use arrow functions with named exports.

### Component Props

**ProjectCard.tsx**
```ts
interface ProjectCardProps {
  project: Project
  index: number
  variant: 'featured' | 'secondary'
}
// featured: full-width with large image; secondary: padded inset image + text
```

**ProjectGrid.tsx**
```ts
interface ProjectGridProps {
  projects: Project[]
}
// Magazine layout: first project 7cols featured, second 5cols secondary, rest as list
```

**Timeline.tsx**
```ts
interface TimelineProps {
  updates: Update[]
}
// Shows first 5 by default; "显示全部" expands; "收起" collapses
```

### Data Schema

**projects.json** — `{ projects: [...] }`

| Field       | Type   | Required | Description                                                                   |
| ----------- | ------ | -------- | ----------------------------------------------------------------------------- |
| id          | string | yes      | Unique project identifier                                                     |
| name        | string | yes      | Display name                                                                  |
| description | string | yes      | One-line description                                                          |
| url         | string | yes      | External URL (opens in new tab via `<a target="_blank">`)                     |
| status      | string | no       | 开发中 \| 已上线 \| 已下线                                                    |
| tags        | array  | no       | String tags (在线网站, 小游戏, 杂项, etc.)                                    |
| cover       | string | no       | Public URL path e.g. `"/covers/xxx.png"`; empty string = elevated placeholder |
| version     | string | no       | e.g., "v1.0.0"                                                                |
| updatedAt   | string | no       | ISO date, e.g., "2026-04-29"                                                  |

**timeline.json** — `{ updates: [...] }`

| Field     | Type   | Required | Description               |
| --------- | ------ | -------- | ------------------------- |
| id        | string | yes      | Unique entry identifier   |
| projectId | string | yes      | Foreign key to project.id |
| content   | string | yes      | Update description        |
| date      | string | yes      | ISO date                  |

### Vite Config

- **Plugins**: `@tailwindcss/vite` (Tailwind v4), `@vitejs/plugin-react`
- **Path alias**: `@` → `./src` (configured in `vite.config.ts` + `tsconfig.app.json`)
- **Watch polling**: enabled for WSL compatibility (`usePolling: true`, 500ms interval)

## Styling & Design

### Design System — "素笺 (Clean Editorial)"

Warm paper-toned magazine aesthetic with pink accent touches.

- **Background**: `#f7f4ef` (warm rice paper)
- **Card background**: `#ffffff` (white)
- **Primary text**: `#2c2a30` (soft black)
- **Secondary text**: `#6b6570` (muted gray-purple)
- **Accent**: `#f783ac` (pink)
- **Lines/borders**: `rgba(44,42,48,0.06)`
- **Shadows**: subtle `0 2px 8px rgba(44,42,48,0.04)`

All CSS custom properties are defined in `src/styles/globals.css` under `:root`.

### Tailwind v4 Theme (CSS-based, no config file)

```css
@theme inline {
  --font-display: 'Source Han Serif CN', Georgia, serif;
  --font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-kai: 'LXGW WenKai', 'KaiTi', serif;
}
```

**Note**: Tailwind v4 uses `@theme` in CSS instead of `tailwind.config.js`. All theme tokens are in `globals.css`.

### Fonts

- **Display (titles)**: Source Han Serif CN (思源宋体), local OTF from `src/assets/fonts/`
  - Medium (500) — body text
  - SemiBold (600) — section / card titles
  - Bold (700) — page title
- **Sans (body)**: system-ui stack (no custom font)
- **Kai (poetry block)**: LXGW WenKai (霞鹜文楷) via Google Fonts

### Animations

- **Project cards**: Framer Motion `motion.a` — fade-in + slide-up on scroll with staggered delay (index * 0.12s), hover lift (-2px) + shadow transition
- **Timeline**: Framer Motion — fade-in + slide from left (0.08s staggered)
- **Global**: smooth transitions on hover effects

### Layout

- **Magazine grid**: `grid-cols-1 md:grid-cols-12` with 7/5 split for first two projects
- **List**: full-width stacked cards for remaining projects
- **Calendar + Poem side-by-side**: 5/7 column split on md+
- **Timeline**: centered full-width with decorative horizontal rule header

## Components

### App.tsx
- HashRouter with Routes:
  - `/` — Homepage (`FloatingLogo` + `ProjectGrid` + `CalendarCard` + `PoemCard` + `Timeline` + `Footer`)
  - `/gacha-simulator` — `GachaSimulator.tsx` (翻牌抽卡)
  - `/piano` — `PianoPage.tsx` (极简钢琴)
  - `/metronome` — `MetronomePage.tsx` (节拍器)
- Homepage layout:

### ProjectCard.tsx
Wraps each project in a Framer Motion `<motion.a>` targeting `_blank`.
- Accent pink line at top (48px)
- Cover image: full-width for featured, white-bordered inset for secondary
- Placeholder when no cover: elevated background with aspect-ratio 16/9
- Title, description, tags (bordered pills), status badge (pink-bordered)

### ProjectGrid.tsx
Magazine layout:
- Project[0] → 7 cols featured card
- Project[1] → 5 cols secondary card + "Coming Soon" placeholder
- Projects[2+] → full list of secondary cards with 8px gap

### CalendarCard.tsx
Self-contained calendar component rendering current month using `useMemo`.
- Weekday headers (一二三四五六日)
- Grid of day cells with dimmed prev/next months
- Today highlighted with pink border circle

### PoemCard.tsx
- On mount: fetch from `v1.jinrishici.com` API (8s timeout)
- On success: display poem content, title, author in kai font
- On failure: fallback to local `poems.json` using `(date + 30) % length` index
- Loading state: "加载中..."

### Timeline.tsx
- Vertical line + dot-per-entry layout
- Dot: pink-bordered circle with page-background fill
- Shows first 5 by default; "显示全部 (N)" button toggles all
- Staggered fade-in from left (0.08s delay per item)

## Coding Conventions

### React
- Functional components with arrow functions
- Props typed via `interface` (not inline)
- Use `useState` / `useEffect` / `useMemo` from React
- `motion.*` components from Framer Motion for animated elements
- Imports use `@/` path alias from `src/` (e.g., `import ProjectGrid from '@/components/ProjectGrid'`)

### TypeScript
- Strict mode enabled
- `tsc -b` for type checking before build
- No `any` — use proper types or `unknown`
- JSON imports cast via `as` type assertion

### JavaScript
- ES modules (`"type": "module"` in `package.json`)
- Prefer `const`, use `let` only when reassignment is necessary
- Use template literals for string interpolation

### Styling
- Tailwind utility classes for layout and spacing
- Inline styles for CSS custom properties (e.g., `style={{ color: 'var(--accent-pink)' }}`)
- CSS custom properties in `globals.css` for design tokens
- Scoped animation configuration in Framer Motion props

### Naming
- **React components**: PascalCase filenames (`ProjectCard.tsx`)
- **Other files**: kebab-case (`globals.css`, `vite.config.ts`)
- **JSON data files**: kebab-case (`projects.json`)

### Comments
- Comments are in Chinese
- Not verbose — only where behavior is non-obvious

### Git
- **Commit style**: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, etc.)
- **Branches**: `main` is the default branch, `archive/*` for archived versions

## GitHub Pages Deployment

Triggered by push to `main` branch via `.github/workflows/deploy.yml`:
1. Checkout → setup Node 20 → `npm ci` → `npm run build`
2. Upload `dist/` as Pages artifact
3. Deploy via `actions/deploy-pages@v4`

Custom domain: `gleamory.lovelysia.top` (Cloudflare DNS proxy).

## New Project / New Page Workflow

When adding a new project feature (e.g., a new page like metronome/piano/gacha):

1. **Hermes agent**: Load the local `gleamory-manager` Hermes skill first (`~/.hermes/skills/workflow/gleamory-manager/`) for full workflow details, project paths, and conventions.

2. **Development**: Work on a feature branch (`feature/<name>`), use `superpowers` workflow (brainstorming → plan → subagent-driven-development).

3. **Data updates** (required after feature is done):
   - `src/data/projects.json` — add project entry (id, name, description, url=`#/page`, tags, version, updatedAt)
   - `src/data/timeline.json` — add launch update entry
   - `CHANGELOG.md` — record feature under `[Unreleased] > Added`

4. **Build & lint**: `npm run build` → `npm run lint` (must pass before commit)

5. **Publish**:
   - Feature branch → merge to `main`
   - `git push origin main`
   - GitHub Actions auto-deploys to `gleamory.lovelysia.top` (~1-2 min)

## Environment

- **Node.js**: v20 (GitHub Actions), LTS recommended locally
- **Package manager**: npm (see `package-lock.json`)
- **OS**: Cross-platform (Linux, macOS, Windows — polling mode for WSL)
