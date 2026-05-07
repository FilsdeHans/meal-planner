# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start Vite dev server with HMR
npm run build    # production build
npm run preview  # preview production build locally
npm run lint     # ESLint
```

No test suite is configured.

## Architecture

React 19 + Vite SPA backed by Supabase (PostgreSQL + Auth + Realtime). No server-side rendering; all data access happens client-side via the Supabase JS client.

### Three-stage shopping workflow

Each `week_plans` row moves through `planning → reviewing → shopping → archived`. `App.jsx` owns all top-level state and renders one of three views based on `weekPlan.stage`:

- **PlanView** — browse and assign meals to days of the week
- **ReviewView** — answer household prompts, review the auto-built shopping list
- **ShopView** — check items off as you shop

Stage advancement is handled by `advanceTo()` in `App.jsx`, which calls `updateWeekPlanStage()` and updates local state optimistically.

### State and data flow

`App.jsx` is the only stateful root. It holds: `user`, `householdId`, `meals`, `ingredients`, `weekPlan`, and `items`. All child components receive what they need as props.

Two global helpers — `window.__refreshItems` and `window.__syncItems` — are attached inside a `useEffect` that re-runs when `weekPlan.id` changes. These let `ReviewView` trigger full re-fetches without prop-drilling callbacks.

Supabase Realtime subscriptions (`subscribeToWeekPlan`, `subscribeToShoppingItems`) keep state in sync across devices. Both return cleanup functions used as `useEffect` return values.

### Lib layer (`src/lib/`)

| File | Responsibility |
|------|---------------|
| `supabase.js` | Supabase client singleton |
| `auth.js` | Email OTP sign-in/out, session listener |
| `meals.js` | Fetch meals and ingredients (keyed by ID) |
| `weekPlan.js` | Plan generation, date helpers, CRUD for `week_plans` |
| `shopping.js` | Build shopping items from plan + prompts, sync to DB, subscriptions |

`buildShoppingItems()` in `shopping.js` is the core business-logic function — it turns a `plan` object (day → meal ID map) and a `prompts` object (prompt ID → answer) into a flat list of shopping items, applying leftover-deduplication and staples rules.

### Database tables (key ones)

- `households`, `household_members` — multi-user scoping; all data is household-scoped
- `meals`, `meal_ingredients`, `ingredients` — static reference data (not household-scoped)
- `week_plans` — one active plan per household; `plan` (JSONB day→meal map), `prompts` (JSONB), `stage`, `shop_date`
- `shopping_items` — flat list of items for a week_plan; `status` ∈ `{pending, got, skip}`

### Styling conventions

All styles are inline CSS objects. The color palette is defined as a top-level `C` constant in `App.jsx`:

```js
const C = {
  forest: "#2c4a2e", sage: "#c8d9a0", sageLt: "#eef4e4",
  cream: "#faf7f2", warm: "#f5f0e8", ink: "#1e1e1e", mid: "#6b6157",
};
```

Child components define their own local color constants where needed. There are no CSS classes or CSS-in-JS libraries.

### Environment variables

```
VITE_SUPABASE_URL=       # Supabase project URL
VITE_SUPABASE_ANON_KEY=  # Supabase anon key
```

### Meal categorisation flags

Meals have boolean flags that drive plan generation in `weekPlan.js#suggestPlan()`:

- `fri` — meat-free, only assigned to Friday
- `weekend` — assigned to Saturday
- `sundayOnly` — roasts, assigned to Sunday
- `leftoverOf` — derived meal (e.g. `chicken_fried_rice` after `roast_chicken`), never randomly assigned
- `eatOut` — excluded from plan generation entirely

## Key conventions

### Shop cycle model
Each household has one active (non-archived) week_plan at a time. Users
trigger new shops manually via the "New shop" button — there is no
auto-detection of week boundaries. `shop_date` is user-chosen and drives
the day order in PlanView (week starts on shop day, not fixed Friday).

### Refresh pattern
Each stage has a scoped refresh:
- Plan: re-suggests meals, clears prompts/items
- Review: clears prompts/items only (keeps meal plan)
- Shop: resets item statuses to pending (keeps items and qty edits)

### Real-time sync
All shopping_items changes go via Supabase Realtime. After write operations
(qty change, delete, status update) we call window.__refreshItems() directly
for immediate UI feedback rather than waiting for the subscription.

### Quantity modal
QtyModal receives val/setVal/unit/setUnit as props from the parent (not
internal state). This was a deliberate fix to avoid stale closure bugs.

### Friday = meat-free (Catholic household)
Friday meals must have fri: true. No exceptions unless user manually picks
via "More options" (which has no restrictions).

### Supabase credentials
Project URL: https://nbcfqkouxbryzfidnqtc.supabase.co
Anon key is in .env (not committed). Also set as Netlify env vars for
production.

### Deployment
GitHub → Netlify auto-deploy on push to main.
Repo: https://github.com/FilsdeHans/meal-planner
Live: https://meal-planner-hansen.netlify.app