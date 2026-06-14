# Known Defects Optimization Design

## Goal

Improve Gleamory's verified correctness, maintainability, delivery checks, and initial-load performance without adding product features, changing public routes, introducing a backend, or redesigning the existing UI.

## Scope

### Correctness

- Restore the previous document title when a routed page unmounts instead of clearing it.
- Sort timeline entries by their ISO date rather than assuming JSON insertion order.
- Remove the no-op piano cleanup interval and close or release audio resources on unmount.
- Fix the `GachaSimulator` memo dependency warning.
- Add the missing Open Graph image referenced by `index.html`.

### Test Integrity

- Make `GachaSimulator` consume the tested helpers in `src/lib/gacha.ts` for parsing, deduplication, shuffling, and persisted-state validation.
- Align the helper state types with the currently shipped flip-card interaction model.
- Add regression tests before changing each extracted behavior.
- Add focused tests for title restoration and timeline sorting.

### Performance

- Lazy-load non-home routes with `React.lazy` and `Suspense`.
- Convert the three Source Han Serif CN fonts from OTF to WOFF2 and update font declarations.
- Convert large project covers to WebP, update data references, and retain only assets still referenced by the application.
- Keep the existing visual hierarchy, typography weights, routes, and visible content.

### Delivery

- Run tests, lint, and build in the GitHub Pages workflow before deployment.
- Keep deployment on Node.js 20 and GitHub Pages.

### Documentation

- Update `AGENTS.md` and `README.md` to describe the actual React/Vitest architecture and current files.
- Replace stale implementation details in `docs/requirements.md` with a concise current-state product and acceptance reference.
- Remove inaccurate or duplicated unreleased changelog entries, including the nonexistent Sakana route.
- Record these fixes under the unreleased changelog.

## Architecture

The application remains a static React SPA using `HashRouter`. The home page and shared shell stay in the entry bundle; each tool or plugin page becomes a separate lazy-loaded route chunk. Static JSON remains the project catalog and timeline source.

Pure behavior is kept in small library functions and tested directly. React components consume those functions instead of maintaining duplicate implementations. No state-management dependency or server-side layer is introduced.

## Data Flow

### Project Catalog

`src/data/projects.json` remains authoritative for project cards. Cover paths will change from PNG to optimized WebP files, but the schema and public card behavior remain unchanged.

### Timeline

`Timeline` receives static entries and delegates ordering to a pure date-sort helper. Invalid dates retain deterministic source order after valid dated entries.

### Gacha

`GachaSimulator` owns UI state, while `src/lib/gacha.ts` owns:

- text parsing;
- optional deduplication;
- Fisher-Yates shuffling;
- preset-compatible state validation;
- session storage serialization and fallback.

The UI state shape is the only supported persisted schema after this change. Existing incompatible or corrupt session data falls back to the default preset.

## Error Handling

- Failed or malformed session storage reads fall back to a valid default state.
- Font and cover optimization must preserve original source files until the generated replacements have been validated in a production build; obsolete originals are removed only after references are updated.
- Lazy route loading uses a lightweight page fallback and does not alter route URLs.
- The poetry API keeps its current timeout and local fallback behavior.

## Testing Strategy

1. Add failing unit tests for timeline ordering, title restoration, gacha parsing/deduplication, and persisted-state validation.
2. Run each focused test to verify the expected failure.
3. Implement the minimum production change.
4. Re-run focused tests and then the complete suite.
5. Run ESLint with zero warnings.
6. Run the production build and inspect route chunks and total asset sizes.
7. Perform a browser smoke test of the home page and every public route at desktop and mobile widths.

## Acceptance Criteria

- `npm test` passes with tests covering the production gacha helper model.
- `npm run lint` reports zero errors and zero warnings.
- `npm run build` succeeds.
- Returning from any tool page restores `Gleamory 微光集` as the document title.
- Timeline order is date-based and deterministic.
- All existing public hash routes still render.
- Social metadata references an existing image.
- Non-home pages are emitted as separate JavaScript chunks.
- Font assets use WOFF2 and are materially smaller than the current OTF files.
- Project cover assets are optimized and all referenced images load.
- GitHub Actions executes test, lint, and build before deployment.
- Project documentation matches the implemented architecture and feature set.

## Explicit Non-Goals

- No new tools, routes, backend, authentication, analytics, or cloud synchronization.
- No visual redesign or broad component-library migration.
- No rewrite of the metronome, piano, or plugin detail pages solely to reduce file length.
- No public route renaming or data schema expansion beyond what is needed for tested persistence.
