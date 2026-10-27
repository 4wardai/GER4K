# Technology Stack — GER4K

Hackathon-first: quick to build, easy to maintain, cheap/simple to deploy on
AWS, mobile-first. Prefer minimum necessary dependencies and direct
architecture. Where a decision is not yet confirmed, it is listed as a
**recommended default**, not a final choice.

## Standardized stack

- **Framework:** **Next.js 15.x with TypeScript** (App Router). Pin to the 15.x
  line — do **not** auto-upgrade to the latest Next.js major just because it
  exists. One codebase serves the UI and lightweight API routes, which keeps the
  project simple and fast to deploy. Mobile-first and responsive.
- **Deployment target:** **AWS Amplify Hosting**.
- **Styling:** Tailwind CSS, with a small set of reusable UI components
  (optionally shadcn/ui). Keeps the look clean and polished without heavy custom
  CSS.
- **State/data fetching:** React Server Components + a light client cache (e.g.
  TanStack Query or SWR) only where client interactivity needs it. Avoid heavy
  global state unless clearly needed.
- **API approach:** Next.js API/route handlers as a thin backend. No separate
  server or microservices for the MVP.

## Database / storage — optional

- **Start with mock/local data** (JSON/TypeScript fixtures). No database is
  required to build the core demo.
- **DynamoDB is optional.** Add persistence (e.g. Amazon DynamoDB, serverless)
  **only when it materially improves the final demo** — for example saved
  journeys or reward/reputation that need to survive a refresh. Do not add a
  database speculatively.
- SQLite/Postgres only if relational queries become genuinely essential
  (unlikely for the MVP).

## AI integration — Amazon Bedrock, isolated and optional at runtime

- **Preferred provider:** **Amazon Bedrock** (consistent with AWS hosting).
- The AI integration **must be isolated behind a service/provider interface** so
  the implementation can be swapped or disabled.
- The AI assistant **explains and personalizes** domain results. It must
  **never** be required to calculate the core recovery recommendation.
- GER4K's **core journey planning and disruption-recovery flow must still
  function if Bedrock is unavailable** — the app degrades gracefully to showing
  ranked recovery options without AI narration.
- All AI calls happen server-side; never expose keys to the client.

## Transport / network data handling

- Support **GTFS static** data as the base network model (stops, routes,
  schedules).
- Live vehicle/service data is used **only where genuinely available**;
  otherwise rely on clearly-labelled mocked feeds.
- Keep data access behind **data-provider modules** with a stable interface, so
  the routing/recovery logic does not care whether data is live, scheduled, or
  mocked.
- Always carry a source/status tag through the system: `LIVE`, `SCHEDULED`,
  `OPERATOR_CONFIRMED`, `COMMUNITY_REPORTED`, `UNVERIFIED`. Never label scheduled
  data as live. Do not make unsupported claims about live transport data
  availability.

## AWS hosting / deployment

- Deploy the Next.js 15 app with **AWS Amplify Hosting** (simplest path for a
  Next.js app on AWS).
- Managed/serverless services only: Amplify/Lambda for compute, optional
  DynamoDB for storage, Bedrock for AI. No clusters, no Kubernetes, no custom VPC
  work.
- Do **not** add AWS infrastructure that does not improve the demo.

## Common commands (Next.js defaults — confirm once scaffolded)

```bash
# Install dependencies
npm install

# Run the dev server
npm run dev

# Production build
npm run build

# Start production build locally
npm run start

# Lint
npm run lint

# Tests (see testing section)
npm run test
```

## Environment variables

- Store secrets/config in `.env.local` (git-ignored). Provide a committed
  `.env.example` documenting required keys without real values.
- Access env vars **server-side only** for anything sensitive (Bedrock/AWS
  credentials, region). Only expose `NEXT_PUBLIC_*` vars that are safe for the
  client.
- Never commit real credentials.

## Testing expectations

- Hackathon-appropriate: prioritize a working demo. Do not chase full coverage.
- Add focused unit tests for the **core intelligence** — routing/recovery,
  ranking, and confidence-scoring logic — since those must be correct and are
  easy to test in isolation.
- Recommended default runner: **Vitest** (fast, TS-friendly). Run tests in
  single-run mode (`vitest --run`), not watch mode, in CI/demos.

## Technical constraints & simplicity principles

- **Hackathon-first; simple but not simplistic.** Prefer one Next.js app over
  microservices; avoid premature scaling and complex DevOps.
- **Mobile-first and visually polished.**
- **Minimal dependencies**; favour reusable components and clean, debuggable
  code.
- **No unnecessary infrastructure.** No overengineered auth. If sign-in is
  needed for the demo, keep it minimal.
- Keep **core transport intelligence separated from the UI** and reusable,
  independent of the framework.

## Mocked data handling

- Mock/simulated data is first-class for the demo and must be **clearly labelled
  as simulated** in the UI and in code.
- Keep mock scenarios (e.g. a disruption on a specific line) in a dedicated
  mock-data area so they can be swapped for live providers without touching
  domain logic.
- Mocked data must still flow through the same source/status tagging as real
  data.
