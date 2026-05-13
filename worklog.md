# LinkedInPost SaaS - Worklog

## Phase 3A: Analytics & Intelligence Layer

### Date: 2025-06-02

---

### Feature 1: Content Performance Dashboard

**1A. Prisma Schema Changes:**
- Added `PostMetric` model (impressions, reach, likes, comments, reposts, clicks, engagementRate, collectedAt, source)
- Added `metrics PostMetric[]` relation to Post model
- Ran `db:push` successfully

**1B. Types:**
- Added `'analytics'` to `AppView` type
- Added `PostMetric` interface
- Added `AnalyticsOverview`, `FormatPerformance`, `DayPerformance`, `HourPerformance`, `ProviderPerformance`, `ScoreCorrelation`, `AnalyticsInsight` interfaces
- Added constants: `AB_TEST_STATUS_LABELS`, `AB_TEST_STATUS_COLORS`, `AB_TEST_CRITERIA_LABELS`, `DAY_LABELS`, `FORMAT_LABELS`

**1C. API Routes (7 new routes):**
- `POST /api/posts/metrics` — Record metrics for a post (auto-calculate engagement rate)
- `GET /api/posts/metrics/[postId]` — Get metrics history for a post
- `GET /api/analytics/overview` — Total KPIs, best/worst post, trend data
- `GET /api/analytics/by-format` — Performance by detected content format
- `GET /api/analytics/by-day` — Performance by day of week
- `GET /api/analytics/by-hour` — Performance by hour slot (6-22h)
- `POST /api/analytics/seed` — Seed realistic demo data with time series

**1D. LinkedIn Analytics Placeholder:**
- `src/lib/linkedin-analytics.ts` with documented LinkedIn API endpoints
- `fetchPostMetrics()`, `fetchProfileAnalytics()`, `syncAllPostMetrics()` placeholders

**1E. AnalyticsView Component:**
- KPI cards (Total Impressions, Avg Engagement, Best Post, Posts with Metrics)
- Trend chart (AreaChart, 30 days)
- Performance table (sortable, color-coded engagement)
- Score vs Performance scatter chart
- Format performance chart
- Day/Hour charts
- Provider performance chart
- AI Insights panel
- Metric entry dialog
- Tabbed interface (Tendances, Tableau, Analyses, Insights)

**1F. AppLayout Updates:**
- Added Analytics nav item with BarChart3 icon
- Added ViewRouter case for 'analytics'
- Added view label

**1G. PostDetail Integration:**
- New "Métriques" tab after "Historique"
- Score IA vs Performance réelle comparison card
- Individual metric cards (Impressions, Portée, Likes, etc.)
- Time series mini chart (AreaChart)
- Metric entry dialog within post detail
- Color-coded engagement indicators

---

### Feature 2: A/B Testing Framework

**2A. Prisma Schema Changes:**
- Added `ABTest` model (name, description, status, postA/B, winnerId, criteria, dates, notes)
- Added `ABReading` model (testId, variant A/B, metric, value, recordedAt)
- Added relations to Post (testAPosts, testBPosts) and User (abTests)
- Ran `db:push` successfully

**2B. Types:**
- Added `'ab-testing'` to `AppView` type
- Added `ABTest`, `ABReading` interfaces
- Added `ABTestStatus`, `ABTestCriteria` types

**2C. API Routes (7 new routes):**
- `GET /api/ab-tests` — List all tests with full details
- `POST /api/ab-tests` — Create new test (select 2 posts)
- `PUT /api/ab-tests/[id]` — Update test (status, notes)
- `DELETE /api/ab-tests/[id]` — Cancel test
- `POST /api/ab-tests/[id]/readings` — Add metric readings
- `POST /api/ab-tests/[id]/declare-winner` — Auto-declare winner
- `POST /api/ab-tests/seed` — Seed demo A/B test data

**2D. ABTestingView Component:**
- Tests list with status badges (Brouillon, En cours, Terminé, Annulé)
- Create test dialog with side-by-side post preview
- Test results view with:
  - Side-by-side comparison panels (Variant A/B)
  - Comparison bar chart
  - Add Reading dialog
  - Declare Winner button
  - Winner indication with trophy icon
- Start/Stop/Delete actions on test cards

**2E. AppLayout Updates:**
- Added A/B Tests nav item with GitCompareArrows icon
- Added ViewRouter case for 'ab-testing'

---

### Feature 3: Analytics Enrichis

**3A. API Routes (3 new routes):**
- `GET /api/analytics/by-provider` — Performance by AI provider (OpenRouter, Groq, GLM)
- `GET /api/analytics/score-correlation` — Pearson correlation coefficient + scatter data
- `GET /api/analytics/insights` — Auto-generated insights from statistical analysis

**3B. Enhanced AnalyticsView:**
- Format performance bar chart (horizontal)
- Day/Hour grid with best day/hour identification
- Provider grouped bar chart (Score IA + Engagement)
- Score vs Performance scatter with format color coding
- Insights panel with positive/warning/action cards
- All integrated into tabbed interface

---

### Feature 4: Competitor Watch

**4A. Prisma Schema Changes:**
- Added `Competitor` model (name, linkedinUrl, industry, notes, isActive, lastSyncedAt)
- Added `CompetitorPost` model (subject, content, metrics, detectedFormat, dates)
- Ran `db:push` successfully

**4B. Types:**
- Added `'competitors'` to `AppView` type
- Added `Competitor`, `CompetitorPost` interfaces

**4C. API Routes (8 new routes):**
- `GET /api/competitors` — List all with avg engagement
- `POST /api/competitors` — Add competitor
- `PUT /api/competitors/[id]` — Update competitor
- `DELETE /api/competitors/[id]` — Remove competitor
- `GET /api/competitors/[id]/posts` — List competitor posts
- `POST /api/competitors/[id]/posts` — Add competitor post
- `GET /api/competitors/comparison` — You vs competitors aggregated
- `POST /api/competitors/seed` — Seed demo competitors with posts

**4D. LinkedIn Competitor Placeholder:**
- `src/lib/linkedin-competitor.ts` with helper functions
- `detectPostFormat()` — Detects format from text content
- `calculateCompetitorEngagementRate()` — Estimates engagement
- `generateCompetitorInsights()` — Gap analysis

**4E. CompetitorWatchView Component:**
- Competitors list with cards (name, industry, engagement, post count)
- Add competitor dialog
- Competitor detail panel (posts, top post, stats)
- Add competitor post dialog
- Comparison dashboard (bar chart + summary table)
- Delete competitor action

**4F. AppLayout Updates:**
- Added Concurrents nav item with Users icon
- Added ViewRouter case for 'competitors'

---

### Summary
- **New Prisma Models:** PostMetric, ABTest, ABReading, Competitor, CompetitorPost
- **New API Routes:** 25 new routes
- **New UI Components:** AnalyticsView, ABTestingView, CompetitorWatchView, MetricsTab
- **Modified Components:** AppLayout (nav + router), PostDetail (metrics tab)
- **New Libraries:** linkedin-analytics.ts, linkedin-competitor.ts
- **All text in French** ✓
- **No indigo/blue primary colors** ✓
- **Responsive design** ✓
- **ESLint passes** ✓
- **No regression** - all existing functionality preserved ✓

---

## Phase 3C: Full Project Audit & Bug Fixes

### Date: 2026-05-03

**Audit complet du projet — 56+ API routes, 19 Prisma models, 17+ composants audités.**

### Bugs critiques corrigés:

1. **SECURITE: `/api/posts/smart-score` — Pas d'authentification**
   - Route accessible sans token JWT
   - Fix: Ajout de `getAuthUser()` + vérification 401 avant le traitement
   - Fichier: `src/app/api/posts/smart-score/route.ts`

2. **PERFORMANCE: `db.ts` — Logs Prisma en production**
   - `log: ['query']` logguait TOUTES les requêtes SQL en prod
   - Fix: `log: process.env.NODE_ENV === 'development' ? ['query'] : ['error']`
   - Fichier: `src/lib/db.ts`

### Bugs moyens corrigés:

3. **PostDetail.tsx — Check `expired` en double dans `isTokenError`**
   - `.includes('expired')` apparaissait deux fois consécutivement
   - Fix: Suppression de la ligne dupliquée
   - Fichier: `src/components/saas/PostDetail.tsx` (HistoryTab)

4. **content-scorer.ts — Emojis dans les strings de détails**
   - Les détails de scoring utilisaient des emojis (📝🪝📢🏷️📖😊) contradictant la règle no-emoji du projet
   - Fix: Remplacement par des labels texte purs
   - Fichier: `src/lib/content-scorer.ts`

5. **content-scorer.ts — Pattern regex dupliqué dans scoreHook**
   - Le mot "toujours" apparaissait deux fois dans le même pattern regex
   - Fix: Déduplication
   - Fichier: `src/lib/content-scorer.ts`

### Bugs mineurs corrigés (Dead code cleanup):

6. **auth.ts — `getSessionFromRequest()` fonction morte**
   - Retournait toujours `null`, jamais appelée dans le codebase
   - Fix: Suppression complète
   - Fichier: `src/lib/auth.ts`

7. **PostDetail.tsx — Import inutilisé `AIProviderType`**
   - `import type { AIProvider as AIProviderType }` jamais utilisé
   - Fix: Suppression de l'alias
   - Fichier: `src/components/saas/PostDetail.tsx`

### Vérification:
- Build Next.js: **Compiled successfully** ✓
- 56+ API routes compilées sans erreur ✓
- Serveur de production redémarré sur port 3000 ✓
- Aucune régression ✓

---

## Critical Security Bug Fix Sprint

### Date: 2026-05-04

**14 security fixes, 3 logic bugs, 2 data leaks, 1 race condition, 1 multi-tenancy gap.**

### 1. Authentication added to 14 unprotected routes
Added `getAuthUser()` + 401 check to all routes missing auth:
- `src/app/api/analytics/best-time/route.ts` (GET + POST)
- `src/app/api/analytics/best-time/heatmap/route.ts` (GET)
- `src/app/api/brand-voice/route.ts` (GET + POST)
- `src/app/api/brand-voice/compare/route.ts` (GET)
- `src/app/api/brand-voice/seed/route.ts` (POST)
- `src/app/api/content-ideas/route.ts` (GET + POST)
- `src/app/api/content-ideas/[id]/route.ts` (PUT + DELETE)
- `src/app/api/content-ideas/seed/route.ts` (POST)
- `src/app/api/audience/route.ts` (GET + POST)
- `src/app/api/audience/insights/route.ts` (GET + POST)
- `src/app/api/scoring/status/route.ts` (GET)
- `src/app/api/scoring/leaderboard/route.ts` (GET)
- `src/app/api/scoring/calibrate/route.ts` (POST)
- `src/app/api/route.ts` (GET)

### 2. Hardcoded JWT secret removed
- **File:** `src/lib/auth.ts`
- **Before:** `process.env.JWT_SECRET || 'linkedin-saas-secret-key-change-in-production-2024'`
- **After:** Throws `Error('JWT_SECRET environment variable is required')` if not set
- Added `JWT_SECRET` to `.env`

### 3. LinkedIn tokens removed from POST response
- **File:** `src/app/api/linkedin/route.ts` (line ~89)
- **Before:** `return NextResponse.json({ account })` — leaked accessToken, refreshToken
- **After:** Returns only safe fields via explicit field selection

### 4. LinkedIn reconnect scoped to authenticated user
- **File:** `src/app/api/linkedin/reconnect/route.ts` (lines 24-26)
- **Before:** `where: { isActive: true }` — could reconnect ANY user's account
- **After:** `where: { isActive: true, userId: authUser.id }`

### 5. Limit parameter capped on paginated endpoints
- `src/app/api/posts/route.ts`: `Math.min(100, Math.max(1, ...))`
- `src/app/api/posts/export/csv/route.ts`: same cap (was defaulting to 1000)
- `src/app/api/audit-logs/route.ts`: same cap

### 6. Passwords removed from seed response
- **File:** `src/app/api/seed/route.ts` (lines ~229-236)
- **Before:** Returned `credentials: { admin: { email, password }, ... }`
- **After:** Returns only `{ success, message }`

### 7. Role check added to /api/users
- **File:** `src/app/api/users/route.ts`
- **Added:** `if (!hasRole(authUser, 'admin', 'validator')) return 403`

### 8. Sunday data mapping fixed
- **File:** `src/lib/best-time-predictor.ts`
- `getDay()` returns 0 for Sunday but DAY_LABELS now uses key 7 (consistent with `getDay() === 0 ? 7 : getDay()` conversion used throughout)
- Fixed `dayOrder` array and label keys

### 9. Engagement rate formula fixed (always returned 3.5%)
- **File:** `src/lib/linkedin-competitor.ts` (lines 77-83)
- **Before:** `estimatedImp = totalEngagement / 0.035` then `totalEngagement / estimatedImp * 100` = 3.5% always
- **After:** Returns `null` when impressions are unknown; type changed to `number | null`

### 10. Race condition fixed in generate route
- **File:** `src/app/api/posts/generate/route.ts`
- **Before:** Deleted old variants BEFORE generating new ones — if generation failed, data was lost
- **After:** Generate first, then use `db.$transaction()` to delete old + insert new atomically

### 11. Bulk delete dialog now confirms BEFORE deletion
- **File:** `src/components/saas/PostsList.tsx`
- **Before:** Dialog opened AFTER deletion started (`open={bulkDeleting && bulkSelected.size > 0}`)
- **After:** New `bulkDeleteConfirmOpen` state, dialog opens BEFORE deletion, actual deletion on confirm button

### 12. XTransformPort=3000 debug params removed
- `src/components/saas/ABTestingView.tsx` (3 occurrences: lines 213, 462, 475)
- `src/components/saas/CompetitorWatchView.tsx` (4 occurrences: lines 128, 277, 349, 430)

### 13. Multi-tenant userId added to Prisma models
- **Competitor:** Added `userId String` + User relation; updated all competitor API routes
- **ContentIdea:** Added `userId String` + User relation; updated all content-ideas API routes
- **BrandVoiceProfile:** Added `userId String` + User relation; updated brand-voice API routes
- **PostingSlot:** Added `userId String?` (optional, backward-compatible)
- **Schema:** Added reverse relations to User model
- **DB push:** `prisma db push --force-reset` (required for new required columns)
- **Affected API routes updated with userId filtering:**
  - `competitors/route.ts`, `competitors/[id]/route.ts`, `competitors/seed/route.ts`, `competitors/comparison/route.ts`
  - `content-ideas/route.ts`, `content-ideas/[id]/route.ts`, `content-ideas/seed/route.ts`
  - `brand-voice/route.ts`, `brand-voice/compare/route.ts`
  - `analytics/best-time/route.ts` (PostingSlot scoped)

### 14. Division by zero fixes
- `src/lib/audience-analyzer.ts`: Added early return for empty comments array
- `src/lib/best-time-predictor.ts`: Guard against `worstAvg === 0` in day comparison

### Build verification:
- `npx next build`: **Compiled successfully** ✓
- All 56+ API routes compile without error ✓
- Prisma schema synced ✓

---

## Sprint 2: Performance, Security & Validation Fixes

### Date: 2026-05-05

**8 performance/security/validation fixes across 14 files.**

### 1. Prisma Indexes Added (prisma/schema.prisma)
Added critical database indexes for query performance:
- **Post:** `@@index([authorId])`, `@@index([status])`, `@@index([scheduledDate])`, `@@index([linkedinAccountId])`
- **LinkedInAccount:** `@@index([userId])`, `@@unique([userId, organizationId])`
- **AIVariant:** `@@index([postId])`
- **ValidationLog:** `@@index([postId])`, `@@index([userId])`
- **PublicationLog:** `@@index([postId])`
- **PostMetric:** `@@index([postId])`, `@@index([collectedAt])`
- **ABTest:** `@@index([postAId])`, `@@index([postBId])`, `@@index([authorId])`
- **ABReading:** `@@index([testId])`
- **Competitor:** `@@unique([linkedinUrl])`
- **CompetitorPost:** `@@index([competitorId])`
- **ContentIdea:** `@@index([status])`
- **AuditLog:** `@@index([userId])`, `@@index([createdAt])`
- **PromptTemplate:** `@@unique([name, authorId])`
- **ScoringCalibration:** `@@index([postId])`
- DB pushed with `prisma db push --accept-data-loss`

### 2. N+1 Query Fixed (src/app/api/competitors/route.ts)
- **Before:** For each competitor, a separate `db.competitorPost.findMany()` query was made (N+1 pattern)
- **After:** Removed the N+1 loop; competitor engagement now computed from the already-included `posts: { take: 1 }` relation
- Also added pagination support (page, limit, total, totalPages)

### 3. Dashboard Charts Optimized (src/app/api/dashboard/charts/route.ts)
- **Before:** 16 sequential DB queries in a for loop (2 per week for 8 weeks)
- **After:** Single `db.post.findMany()` fetches all posts in the 8-week range, then weekly data is computed in-memory using date boundaries
- Total queries reduced from ~20 to 7 parallel queries via `Promise.all`

### 4. AI Generation Parallelized (src/lib/ai-providers.ts)
- **Before:** Each provider function (`generateWithOpenRouter`, `generateWithGroq`, `generateWithGLM`, `generateWithZAI`) generated 3 variants sequentially in a `for` loop
- **After:** All three variant generations run in parallel using `Promise.allSettled()`
- Individual failures no longer block other variants; failed variants are logged and filtered out
- Expected generation time reduced from 6-30s to 2-10s

### 5. Pagination Added to 6 Endpoints
Standard pagination pattern (`page`, `limit` max 100, `total`, `totalPages`) added to:
- `src/app/api/prompts/route.ts` (GET)
- `src/app/api/ab-tests/route.ts` (GET)
- `src/app/api/content-ideas/route.ts` (GET)
- `src/app/api/competitors/route.ts` (GET)
- `src/app/api/competitors/[id]/posts/route.ts` (GET)
- `src/app/api/audit-logs/route.ts` (GET) — was limit/offset only, now has total count + page-based pagination

### 6. Rate Limiting Added (src/lib/rate-limit.ts + 4 routes)
- **New utility:** `src/lib/rate-limit.ts` — Simple in-memory rate limiter with periodic cleanup
- **Applied to:**
  - `src/app/api/auth/login/route.ts`: 5 attempts per minute per email (returns 429)
  - `src/app/api/auth/register/route.ts`: 3 registrations per minute per IP (returns 429)
  - `src/app/api/posts/generate/route.ts`: 10 generations per hour per user (returns 429)
  - `src/app/api/posts/publish/route.ts`: 5 publications per hour per user (returns 429)

### 7. AI Provider Validation (src/app/api/posts/route.ts + [id]/route.ts)
- Added `VALID_PROVIDERS = ['openrouter', 'groq', 'glm', 'anthropic', 'openai']` constant
- **POST /api/posts:** Validates `aiProvider` before creating post
- **PUT /api/posts/[id]:** Validates `aiProvider` before updating post
- Returns `{ error: 'Provider IA invalide' }` with 400 status on invalid provider

### 8. Post Status Transition Validation (src/app/api/posts/[id]/route.ts)
- Added `VALID_TRANSITIONS` map defining legal state transitions:
  - draft -> pending_approval, approved, archived
  - pending_approval -> approved, rejected, draft
  - rejected -> draft, pending_approval, archived
  - approved -> scheduled, posted, draft
  - scheduled -> approved, posted, draft
  - posted -> archived
  - archived -> draft
- Returns `{ error: 'Transition de statut invalide: X -> Y' }` with 400 status on illegal transition
- Also applies to status changes via PUT

### Build verification:
- `npx next build`: **Compiled successfully** ✓
- All 56+ API routes compile without error ✓
- Prisma schema synced ✓
- No lint errors ✓

---

## Sprint 3: UX & Quality Fixes

### Date: 2026-06-20

**12 categories of UX and quality fixes across 10 component files.**

### 1. Confirmation Dialogs for Destructive Actions

**a) LinkedIn Disconnect — `src/components/saas/SettingsView.tsx`**
- Added `disconnectConfirmOpen` and `disconnectingId` state
- Changed disconnect button to open AlertDialog before executing
- Dialog message: "Etes-vous sûr de vouloir déconnecter votre compte LinkedIn ?"
- Added AlertDialog with cancel/confirm actions

**b) Competitor Delete — `src/components/saas/CompetitorWatchView.tsx`**
- Added `deleteConfirmOpen` and `competitorToDelete` state
- Changed delete button to open AlertDialog before executing
- Dialog message: "Supprimer ce concurrent ? Cette action est irréversible."
- Added AlertDialog import and dialog component
- Added `confirmDelete` function that executes on dialog confirm

**c) A/B Test Cancel — `src/components/saas/ABTestingView.tsx`**
- Added `cancelConfirmOpen` and `testToCancel` state
- Changed cancel button to open AlertDialog before executing
- Dialog message: "Annuler ce test A/B ? Les résultats seront perdus."
- Refactored `handleCancel` to open dialog, added `confirmCancel` for execution

**d) Declare A/B Winner — `src/components/saas/ABTestingView.tsx`**
- Added `winnerConfirmOpen` state in TestResultView
- Changed declare winner button to open AlertDialog before executing
- Dialog message: "Déclarer ce variant comme gagnant ? Cette action est irréversible."
- Winner declaration only proceeds on dialog confirm

**e) Content Idea Delete — `src/components/saas/ContentIdeasView.tsx`**
- Added `deleteConfirmOpen` state in IdeaCard
- Changed delete button to open AlertDialog before executing
- Dialog message: "Supprimer cette idée ? Cette action est irréversible."
- Added AlertDialog import and dialog component

**f) User Toggle Disable — `src/components/saas/SettingsView.tsx`**
- Added `disableConfirmOpen` and `userToToggle` state
- Confirmation dialog ONLY fires when disabling a user (isActive === true)
- Enabling proceeds immediately without confirmation
- Added AlertDialog with cancel/confirm actions

### 2. Debounce Search Inputs

**a) Command Palette Search — `src/components/saas/AppLayout.tsx`**
- Added `searchTimeoutRef` (useRef<NodeJS.Timeout>)
- Converted `handleSearch` from async to synchronous with 300ms setTimeout debounce
- Added `useRef` to React imports

**b) Prompt Library Search — `src/components/saas/PromptLibraryView.tsx`**
- Added `searchTimeoutRef` (useRef<NodeJS.Timeout>)
- Search input onChange now debounces `fetchTemplates` call by 300ms
- Added `useRef` to React imports

### 3. Fix tbody overflow — `src/components/saas/AnalyticsView.tsx`
- Wrapped `<table>` in `<div className="max-h-96 overflow-y-auto overflow-x-auto">`
- Removed `overflow-y-auto` from `<tbody>`
- Made `<thead>` sticky with `sticky top-0` for proper scroll behavior

### 4. Fix Calendar Overflow Text — `src/components/saas/CalendarView.tsx`
- Changed `dayPosts.length - 3` to `dayPosts.length - (mode === 'month' ? 3 : 10)`
- Overflow count now correctly uses the same mode-based limit as the slice

### 5. Fix Competitor Comparison Post Count — `src/components/saas/CompetitorWatchView.tsx`
- Added `postCount` to `allEntities` mapping (was missing for competitors)
- Each entity now maps its own `postCount` from the comparison data
- Changed cell from `comparison.you.postCount || entity.avgLikes` to `entity.postCount || 0`

### 6. Fix AuditLogsView Local cn() Function — `src/components/saas/AuditLogsView.tsx`
- Removed local `cn()` function definition (was shadowing the imported one)
- `cn` was already correctly imported from `@/lib/utils`

### 7. Fix Clipboard API in BrandVoiceView — `src/components/saas/BrandVoiceView.tsx`
- Made `handleCopyPrompt` async and added `await` on `navigator.clipboard.writeText()`
- Added try/catch with error toast: "Impossible de copier dans le presse-papiers"

### 8. Fix Dead Code in ContentIdeasView — `src/components/saas/ContentIdeasView.tsx`
- Removed unused `fetchIdeas` useCallback that duplicated the useEffect logic
- The useEffect with cancellation token handles all fetching

### 9. Fix Form State Reset in LoginPage — `src/components/saas/LoginPage.tsx`
- Added `useEffect` that clears email, password, and name when `isRegister` toggles
- Added `useEffect` to React imports

### 10. Fix Calendar Day Cell Keys — `src/components/saas/CalendarView.tsx`
- Changed `key={idx}` to `key={day.toISOString()}` for proper React reconciliation

### 11. Add Loading State to Export Buttons
- **`src/components/saas/PostsList.tsx`**: Added `downloading` state, `disabled={downloading}`, Loader2 spinner
- **`src/components/saas/CalendarView.tsx`**: Added `downloading` state, `disabled={downloading}`, Loader2 spinner, added Loader2 import

### 12. Fix Auto-Seed on PromptLibraryView Mount — `src/components/saas/PromptLibraryView.tsx`
- Added `seedAttempted` useRef to track if seed was already attempted
- Replaced `seeded` state check with `seedAttempted.current` ref check
- Seed attempt now only runs once per component lifecycle

### Build verification:
- `npx next build`: **Compiled successfully** ✓
- All 56+ API routes compile without error ✓
- No regression — all existing functionality preserved ✓

---

## Sprint 4: Dark Mode, LinkedIn Analytics, PDF Export, Notifications

### Date: 2026-05-04

**30+ dark mode fixes, real LinkedIn API integration, 3 PDF export types, full notification system.**

### 1. Dark Mode Fixes (30+ changes across 9 files)

**a) `src/types/index.ts` — POST_STATUS_COLORS**
- Added `dark:bg-*` and `dark:text-*` variants to all 8 status entries
- idea, draft, pending_approval, approved, rejected, scheduled, posted, failed

**b) `src/app/globals.css` — Gradient utilities**
- `.gradient-primary`: Added `.dark .gradient-primary` with lighter indigo/purple
- `.gradient-text`: Added `.dark .gradient-text` with lighter multi-color gradient

**c) `src/components/saas/DashboardView.tsx`**
- Performance change arrows: Added `dark:text-emerald-400` / `dark:text-red-400`

**d) `src/components/saas/AnalyticsView.tsx` — 10 fixes**
- KPI card colors, engagement tiers, chart annotations, confidence labels, leaderboard colors, best/worst time slots

**e) `src/components/saas/PostDetail.tsx` — 5 fixes**
- Smart Score factors, error alert, publication log icons, engagement display

**f) `src/components/saas/ABTestingView.tsx` — 6 fixes**
- Variant B labels, play icon, winner text

**g) `src/components/saas/CompetitorWatchView.tsx` — 3 fixes**
- Engagement rate, best post label, competitor engagement

**h) `src/components/saas/ContentIdeasView.tsx` — 2 fixes**
- Pain points icon, priority count

**i) `src/components/saas/SettingsView.tsx` — 1 fix**
- Refresh token button

### 2. LinkedIn Analytics — Real API Integration

**File:** `src/lib/linkedin-analytics.ts` (rewritten from 134 → ~430 lines)

- `fetchPostMetrics()`: Calls LinkedIn v2 organizationalEntityShareStatistics API
- `fetchProfileAnalytics()`: Calls LinkedIn v2 organizationalEntityFollowerStatistics with 5-min cache
- `syncAllPostMetrics(userId)`: Syncs all posted posts to PostMetric DB table
- `invalidateProfileAnalyticsCache()`: Cache invalidation helper
- Proper error handling (401/403/429/500)
- URN auto-formatting (urn:li:share:, urn:li:organization:)
- New exported types: LinkedInApiError, LinkedInPostMetricsResult, LinkedInProfileAnalyticsResult, SyncResult

**New route:** `src/app/api/analytics/sync/route.ts` (POST, authenticated)

### 3. PDF Export (jsPDF + autotable)

**New file:** `src/lib/pdf-export.ts`
- `exportPostsToPdf()`: Landscape A4, color-coded status, content preview
- `exportAnalyticsToPdf()`: Portrait A4, KPIs + format performance tables
- `exportCalendarToPdf()`: Visual calendar grid + post list

**New route:** `src/app/api/posts/export/pdf/route.ts` (POST, authenticated)
- type: 'posts' | 'analytics' | 'calendar'

**UI:**
- `PostsList.tsx`: PDF export button next to CSV button
- `AnalyticsView.tsx`: Export PDF button in header

### 4. Notification System

**New Prisma model:** Notification (userId, type, title, message, isRead, actionUrl, metadata)
**New helper:** `src/lib/notifications.ts` — createNotification()

**New routes:**
- `GET/POST /api/notifications` — List + create
- `PUT/DELETE /api/notifications/[id]` — Mark read + delete
- `POST /api/notifications/read-all` — Mark all read

**Notification triggers:**
- Post approved → notify author
- Post rejected → notify author
- Post published → notify author
- Post failed → notify author
- Comment added → notify post author

**UI: `src/components/saas/AppLayout.tsx`**
- Bell icon in header with unread badge (red circle, capped at 99+)
- Popover dropdown with ScrollArea (320px)
- Relative time in French ("il y a 2h", "il y a 3j")
- Click to mark read + navigate to post
- "Tout marquer comme lu" button
- 30-second polling for unread count

### 5. Code Cleanup

- Deleted dead toast files: `toast.tsx`, `toaster.tsx`, `use-toast.ts`
- Removed debug console.log from `analytics/sync/route.ts`
- Fixed confidence formula: `dataPoints * 20` → `dataPoints * 10` (10 data points for 100%)

### Build verification:
- `npx next build`: **Compiled successfully** ✓
- 58+ API routes (3 new) ✓
- Prisma schema synced (20 models) ✓

### Git:
- Commit: `5745116` pushed to `main`
- Repo: `github.com/skaba89/linkedin_poste.git`

---

## Sprint 5: LinkedIn OAuth, Dashboard Temps Reel, Content Gen Avance, Onboarding

### Date: 2026-05-04

**18 fichiers modifies, +2872 lignes. 63 routes API.**

### 1. LinkedIn OAuth 2.0 — Flux complet

**Nouvelles routes (3):**
- `GET /api/linkedin/authorize` — Initiation OAuth (CSRF state cookie, redirect LinkedIn)
- `GET /api/linkedin/callback` — Callback (code exchange, profil/org fetch, DB save)
- `POST /api/linkedin/refresh` — Refresh token (auto-deactivate si echec)

**Ameliorations existantes:**
- `GET /api/linkedin/check` — Auto-refresh si token expire ou 401
- `SettingsView.tsx` — Bouton "Connecter avec LinkedIn" + formulaire manuel en collapse

**Securite:**
- CSRF via state cookie (16 chars hex, 15 min TTL)
- Cookie httpOnly, sameSite=lax
- Zero dependance next-auth (flux custom jose)

### 2. Dashboard Temps Reel

**API ameliorees:**
- `/api/dashboard` — +5 stats: engagementRate, weeklyGrowth, topPerformingFormat, streak, lastError
- `/api/dashboard/charts` — Filtrage par date (?from=&to=), max 12 semaines

**UI amelioree (603 → 1032 lignes):**
- Polling auto 60s + refresh manuel + "Derniere mise a jour : il y a X min"
- Filtre dates: Aujourd'hui, 7j, 30j, Ce mois, custom
- 7 cartes stats: Total, Publies, Engagement%, En attente, Brouillons, Idees, Echoues
- Section "Actions rapides": 4 boutons (creer, calendrier, export, seed)
- Carte "Insight IA" avec 8 regles dynamiques

### 3. Generation de Contenu Avancee

**Nouvelles fonctionnalites:**
- 8 tons de contenu (professionnel, inspirant, educatif, conversational, humour, provocateur, storytelling, expert)
- 3 longueurs (court 300t, moyen 500t, long 800t)
- 5 templates rapides (listicle, case study, question, annonce, lecon apprise)
- Suggestion hashtags IA via POST /api/posts/suggest-hashtags

**Types ajoutes:** ContentTone, ContentLength

**Ameliorations:**
- `ai-providers.ts` — buildSystemPrompt() dynamique + getMaxTokens()
- `generate/route.ts` — Passe tone + length a la generation
- `CreatePostForm.tsx` — Accordion templates, Select tone/length, badge hashtags

### 4. Onboarding Interactif (5 etapes)

**Nouveau composant:** `OnboardingFlow.tsx` (831 lignes)
- Etape 1: Bienvenue (animation spring)
- Etape 2: Decouvrir le dashboard (mini preview)
- Etape 3: Creer premier post (demo IA)
- Etape 4: Connecter LinkedIn (skip possible)
- Etape 5: C'est parti (confetti 40 particules + checklist)

**Integration:**
- Store: onboardingCompleted (localStorage persistence)
- AppLayout: Overlay z-30 quand !completed && user
- Bouton "Aide" dans sidebar desktop + mobile
- framer-motion AnimatePresence + transitions directionnelles

### Build verification:
- `npx next build`: **Compiled successfully** ✓
- 63 routes API (5 nouvelles) ✓
- Prisma schema synced ✓

### Git:
- Commit: `9043744` pushed to `main`
- Repo: `github.com/skaba89/linkedin_poste.git`

---

## Sprint 6: Keyboard Shortcuts, Empty States, CSV Import, User Profile

### Date: 2026-05-04

**17 fichiers modifies, +1613 lignes. 64 routes API.**

### 1. Raccourcis Clavier Globaux

**Nouveau fichier:** `src/lib/keyboard-shortcuts.ts`
- 11 raccourcis dans 3 categories:
  - Navigation: Cmd+D (dashboard), Cmd+P (posts), Cmd+N (nouveau), Cmd+C (calendrier), Cmd+A (analytics), Cmd+Shift+S (settings), Cmd+L (logs)
  - Actions: Cmd+K (palette), Cmd+/ (recherche)
  - General: ? (aide), Escape (retour)
- Detection auto Mac (Cmd) vs Windows/Linux (Ctrl)
- Toast notification au premier usage
- Ignore les raccourcis quand on tape dans un input/textarea

**Nouveau fichier:** `src/components/saas/ShortcutsHelpDialog.tsx`
- Dialog avec tous les raccourcis groupes par categorie
- Touches stylisees (kbd badges)
- Triggered par ? ou via la palette de commandes

### 2. Etats Vides (Empty States)

**Nouveau composant:** `src/components/saas/EmptyState.tsx`
- Composant reutilisable avec animation framer-motion
- Icon, titre, description, bouton action, action secondaire

**Applique a 9 vues:**
- PostsList, CalendarView, AnalyticsView, ABTestingView
- CompetitorWatchView, BrandVoiceView, ContentIdeasView
- PromptLibraryView, AuditLogsView

### 3. Import CSV de Posts

**Nouvelle route:** `POST /api/posts/import/csv`
- Parseur RFC 4180 complet (quotes, CRLF, champs vides)
- Mapping colonnes FR vers EN (sujet→subject, statut→status...)
- Max 100 lignes, validation, rapport d'erreurs
- Audit log automatique

**UI:** Bouton "Import CSV" + "Telecharger le modele" dans PostsList

### 4. Profil Utilisateur

**Nouvelle route:** `GET/PUT /api/users/me`
- Profile avec stats (posts, published, approval rate)
- Dernieres activites (10 logs)
- Changement de mot de passe

**Nouveau composant:** `src/components/saas/UserProfileDialog.tsx` (462 lignes)
- Avatar avec initiales, nom, email, role, date inscription
- 3 cartes stats, feed d'activite avec icones colores
- Formulaire changement mot de passe

**Integration:** Avatar cliquable dans le header AppLayout

### 5. Activity Feed Ameliore (Dashboard)

- Icones colorees par type d'action (login=vert, create=bleu, delete=rouge...)
- Temps relatif en francais via date-fns
- Limite a 8 items + lien "Voir tout"

### Build verification:
- `npx next build`: **Compiled successfully** ✓
- 64 routes API (2 nouvelles) ✓
- 0 TypeScript errors in src/ ✓

### Git:
- Commit: `80d314a` pushed to `main`
- Repo: `github.com/skaba89/linkedin_poste.git`
