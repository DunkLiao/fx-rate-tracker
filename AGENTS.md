# Repository Guidelines

## Project Structure & Module Organization

This is a Vite React 19 app with an Express API server. Front-end source lives in `src/`: `src/App.tsx` coordinates the dashboard, `src/components/` contains UI panels, `src/types.ts` defines shared currency and response types, and `src/index.css` holds global styling. The server entrypoint is `server.ts`, which serves API routes such as `/api/rates` and `/api/history` and bundles separately for production. Static entry files are `index.html` and `metadata.json`; reusable media should be placed in `assets/`.

## Build, Test, and Development Commands

- `npm install`: install React, Vite, Express, Tailwind, and TypeScript tooling.
- `npm run dev`: run the local Express/Vite development server through `tsx server.ts`.
- `npm run lint`: run `tsc --noEmit` for TypeScript validation.
- `npm run build`: build the Vite client and bundle `server.ts` to `dist/server.cjs`.
- `npm start`: run the production bundle after a successful build.
- `npm run clean`: remove `dist/`; on Windows PowerShell, use `Remove-Item -Recurse -Force dist` if `rm -rf` is unavailable.

## Coding Style & Naming Conventions

Use TypeScript with React function components and hooks. Keep component filenames in PascalCase, such as `CurrencyChart.tsx`, and keep shared interfaces in `src/types.ts`. Prefer explicit interfaces for API payloads and currency records. Use two-space indentation in JSON and keep import groups readable: React/core imports, third-party libraries, then local modules. The project uses the `@/*` alias for root-relative imports when helpful.

## Testing Guidelines

No dedicated test framework is configured yet. Before submitting changes, run `npm run lint` and, for user-facing behavior, smoke-test `npm run dev` in a browser. If tests are added later, place them near the related module as `*.test.ts` or `*.test.tsx`, and cover API route behavior plus key currency conversion interactions.

## Commit & Pull Request Guidelines

This checkout has no `.git` history, so no local commit convention can be inferred. Use concise, imperative commit messages, optionally with Conventional Commit prefixes such as `feat:`, `fix:`, or `docs:`. Pull requests should describe the change, list verification commands, note environment changes, and include screenshots for visible UI updates.

## Security & Configuration Tips

Do not commit secrets or generated `dist/` output. Keep local-only environment values in `.env.local` if future features require them.
