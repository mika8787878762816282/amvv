# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Vite dev server on http://localhost:8080 (host '::')
npm run build    # Production build to dist/
npm run lint     # ESLint over the repo
npm run preview  # Preview the production build
```

There is no test runner configured. `tsc` is not wired into a script — type checking happens implicitly via the Vite SWC plugin and the IDE; `tsconfig.json` sets `noEmit: true`, `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`.

Edge function (Deno, run from `supabase/functions/create-user/`):

```bash
deno task start  # serves index.ts locally for create-user
```

N8N workflows (run from `n8n/`):

```bash
node deploy_all_workflows.js  # POSTs every *.json workflow to the n8n instance
node activate_workflows.js
node get_webhooks.js
```

Production deploy (script in repo root): `node netlify_deploy.js` creates an anonymous Netlify site and uploads `dist/` via the Netlify API.

## Architecture

This is a single-tenant internal SaaS dashboard for a French renovation business. The frontend is a React + Vite + Tailwind + shadcn/ui SPA that talks to Supabase (DB/Auth/Storage) and proxies all heavy work — PDF generation, AI rendering, lead scraping, social autopost — to webhooks on an external **n8n** instance.

### Three-tier shape

1. **React SPA** (`src/`) — single page, no real router-driven navigation. `App.tsx` only has three routes (`/login`, `/`, `/admin/users`); everything else inside the dashboard is a tab switch on `activeTab` state in `src/pages/Dashboard.tsx`. Adding a new "page" means: register a new id in `allMenuItems`, render its component conditionally on `activeTab === "id"`, and add the id to the default `enabled_features` array if it should be on by default.
2. **Supabase** — Postgres tables in `supabase/migrations/`, an Edge Function in `supabase/functions/create-user/` (Deno, uses service-role key to provision auth users + profiles), Auth, and Storage. The typed client lives in `src/integrations/supabase/client.ts` and the hand-maintained `Database` type is in `src/integrations/supabase/types.ts` (not generated — keep it in sync with migrations manually, several queries already cast to `any` to bypass drift).
3. **n8n** — workflow JSON in `n8n/*.json`. The app never calls Gemini/Anthropic/Google Maps directly; it POSTs JSON payloads to webhook paths (`/generer-devis`, `/visualisation-ia`, `/demande-avis-client`, `/devis-to-facture`, `/search-leads`, `/prospecting-send`, `/facebook-autopost`, `/linkedin-connect`, `/linkedin-post-secure`, ...). The base URL and individual paths are configurable per-company in `company_settings.n8n_config` and per-user in `profiles.n8n_config` (user config overrides company config in `Dashboard.handleSendDocument`).

### Auth + RBAC

`AuthProvider` (`src/contexts/AuthContext.tsx`) wraps the app and exposes `{ session, user, profile, loading, signOut, refreshProfile }`. The `profile` row carries `role` ('admin' | 'user'), `enabled_features` (string[] of menu ids), and `n8n_config` (per-user webhook overrides). The `profiles` table is auto-populated by the `on_auth_user_created` trigger (see `20240218_create_profiles.sql`); the `create-user` edge function then patches role/features for admin-created users.

`Dashboard.tsx` filters the sidebar from `enabledFeatures`. Note the two "soft" overrides currently hard-coded there: `parametres` and `linkedin_auto` are always visible, and `users` is gated on `profile?.role === 'admin'`. `AdminRoute` in `App.tsx` deliberately allows access when `profile === null` to avoid lockouts during dev/load — tighten this if you change auth flow.

RLS is permissive ("any authenticated user can do anything") on every table from `20240218_create_all_tables.sql`. `linkedin_accounts` is the exception: direct client access is denied, and access tokens are only reachable via the secure n8n workflow.

### Data flow conventions

- React Query (`@tanstack/react-query`) is the only data layer — no Redux/Zustand. Query keys are kebab-case (`"company-settings"`, `"whatsapp-messages"`, `"quotes"`). After a mutation, call the matching `refetch()` rather than invalidating.
- `whatsapp-messages` polls every 5s (`refetchInterval`); other queries don't.
- The "send" flow for quotes/invoices is implemented inline in `Dashboard.handleSendDocument`: it (1) updates `status = 'sent'` in Supabase, then (2) fires-and-forgets a POST to the n8n webhook. If n8n is unreachable the local status change still wins — design assumes optimistic UI.
- Quote → Invoice conversion is a React-state handoff: `handleConvertToInvoice` sets `quoteToConvert` and opens `CreateInvoiceDialog` with that as `initialData`.

### Paths and imports

`@/*` resolves to `src/*` (configured in both `tsconfig.json` and `vite.config.ts`). Always use `@/components/...`, never relative paths across feature folders.

### Styling

shadcn/ui components live in `src/components/ui/`. Tailwind theme is HSL-variable based (`tailwind.config.js` references `--background`, `--primary`, etc.). Dark mode is class-based and toggled by reading `localStorage.theme` in `App.tsx`'s root effect, then applied via `<ThemeToggle />`.

### Things to know before editing

- The repo root is cluttered with build artifacts (`build_*.txt`, `ts_*.txt`, `*.zip`, `deploy_log.txt`, `code_complet.md`, `walkthrough.md`, `amgcode_complet.md`, `temp_*.txt`). These are scratch files from prior runs — do not treat them as source of truth.
- `.env` is checked in (along with `.env.example` and `.env.n8n`). Do not add new secrets there; treat existing values as already-public.
- `src/integrations/supabase/types.ts` is partial — newer tables (e.g., `linkedin_accounts`, `profiles`, the `siret`/`tva_number`/`due_date` columns added in 2026 migrations) are not in it. Casts to `any` in feature components are intentional workarounds, not bugs to "fix" by removing them.
- Migrations are applied in filename order; the 2026-dated ones (`20260219...`) come after the 2024 ones despite the timestamp gap — they're forward-dated on purpose.
- The default seeded admin credentials documented in `DEPLOY.md` (`admin@amg-renovation.fr` / `amg2024!`) only work after the corresponding Supabase Auth user has been created; they are not seeded by any migration.
- UI strings and comments are in French. Keep new user-facing copy in French to match.
