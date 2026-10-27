# GER4K — Deploy & Demo-Day Hardening

GER4K deploys to **AWS Amplify Hosting** using Amplify's managed **Next.js SSR**
compute. The app has a dynamic server route (`/api/ask`), so it is **not** a
static export — Amplify's Next.js SSR support is required. The committed
[`amplify.yml`](./amplify.yml) drives the build.

**Simplicity principle:** no Kubernetes, no custom VPC, no microservices, no
complex CI/CD, and no DynamoDB. Amplify connects to the repo, runs the build
spec, and hosts the SSR app. That is the whole deployment.

---

## 1. Connect the repo (performed by the account owner)

1. Push this repository to your Git provider (GitHub / GitLab / Bitbucket /
   CodeCommit).
2. In the **AWS Amplify** console: **Create new app → Host web app**, choose the
   provider, and select this repo + branch.
3. Amplify auto-detects **Next.js (SSR)**. The committed `amplify.yml` supplies
   the install (`npm ci`), build (`npm run build`), SSR artifacts (`.next`), and
   caches — accept it as-is.
4. Start the deployment. No environment variables are required for a successful
   build or a fully working demo (the deterministic Ask GER4K fallback runs with
   no credentials).

---

## 2. Optional: enable live Bedrock AI

The app works end-to-end **without** any AWS/Bedrock configuration. Enable the
live Bedrock-backed explanation only if you want it:

1. In **Amplify → App settings → Environment variables**, set (server-side,
   **no `NEXT_PUBLIC_` prefix**):
   - `AWS_REGION` **or** `BEDROCK_REGION` — the region hosting the model.
   - `BEDROCK_MODEL_ID` — the Bedrock model id to invoke.
2. Grant the Amplify compute/service role permission to call the model
   (`bedrock:InvokeModel` for that model id). Prefer the role over long-lived
   keys — do **not** set `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` unless you
   have no alternative.
3. Redeploy.

If any of this is missing or Bedrock errors at runtime, `/api/ask` degrades
cleanly to the deterministic fallback and never returns a 500.

> **Never** prefix AWS/Bedrock variables with `NEXT_PUBLIC_` — that would inline
> them into the client bundle and leak them to every visitor.

---

## 3. Post-deploy checks (on the deployed URL)

Run a full happy-path rehearsal from a clean state against the live site:

1. Plan **Putrajaya Sentral → KLCC** (the normal journey renders).
2. Open **Presenter Control** via `?presenter=1` and **activate** the simulated
   TRX–Conlay disruption.
3. Confirm the journey is marked **affected** with the correct legs highlighted,
   and the "SIMULATED DEMO SCENARIO" indication is visible.
4. See the **recovery hero** recommendation plus **≥ 2 alternatives**
   (A via Pasar Seni, B via Masjid Jamek).
5. Switch a **preference** chip and confirm the alternatives **visibly re-rank**.
6. Open **Pulse** — aggregated conditions show at relevant interchanges.
7. Use **Ask GER4K** on an option and confirm a structured explanation returns
   (Bedrock if configured, otherwise the deterministic fallback).
8. **Reset** the demo and confirm it returns to a clean state.

Device / viewport:

- Verify at **~390px** (mobile) and **~1280px** (laptop / projector) — layout is
  clean, no horizontal scroll.

Gating & reset:

- Confirm **Presenter Control** is hidden without `?presenter=1` and appears with
  it on the deployed URL.
- Confirm **reset-demo** returns the app to a fresh state.

Secrets:

- In **DevTools / view-source**, confirm **no AWS/Bedrock secrets** (keys,
  region, or model id) appear in the client bundle. Only server code reads them.

---

## Notes

- Local pre-deploy verification is covered by `npm run build`, `npm run test`,
  and `npm run lint`.
- The live Amplify connection, optional Bedrock cloud config, and the
  deployed-site device checks above require your AWS account and are performed by
  you.
