## stockthemes.ai (frontend)

Next.js app for **stockthemes.ai**. **Data, ETL, and the full product spec live in the MosaicBot repo** — this repo only renders UI and reads **public JSON from Cloudflare R2**.

- **Canonical spec & step-by-step plan:** `docs/STOCKTHEMES_AI_SPEC.md` in **MosaicBot** (e.g. `MosaicBotMain_Local_Dev` on your machine). Open that folder in the same Cursor workspace as this project when building features.
- **Data owner:** MosaicBot `FetchEODData/` + admin dashboard → R2; do not duplicate Python/Parquet logic here.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Live Manifest From R2

Copy `.env.local.example` to `.env.local` and set:

`NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL=https://storage.stockthemes.ai/manifest.json` (R2 custom domain; see `docs/R2_MIGRATION.md`)

Restart `npm run dev`. The home page shows **manifest v0 (live)** and your real group/theme counts. Without this file, it uses `public/fixtures/manifest.json`.

**Supabase (optional):** To enable **Sign in** (magic link) and the `/my` watchlist area, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` (see `.env.local.example`). Add the same **Variables** in GitHub Actions for production Pages. Run `supabase/migrations/001_watchlist.sql` in the Supabase SQL Editor and allow **Redirect URLs** for `/auth/callback` (see `docs/AUTH_WATCHLIST_IMPLEMENTATION_PLAN.md`).

**Theme detail JSON:** `/themes/[slug]` loads **`themes/<slug>.json`** from the same public origin as the manifest. **Group detail JSON:** `/groups/[slug]` loads **`groups/<slug>.json`**. MosaicBot **`stockthemes_manifest.py`** uploads both when **`STOCKTHEMES_PUBLIC_BUCKET`** is set. For fixture-only dev, add files under **`public/fixtures/themes/`** and **`public/fixtures/groups/`** (see `artificial-intelligence` + theme examples).

For **GitHub Pages** builds, set the same variable in the Action (or Pages env) so `next build` can fetch the manifest at build time and pre-render every group/theme route (`generateStaticParams`). Without a URL, the build uses `public/fixtures/manifest.json` (smaller set of paths). Theme pages will embed constituent tables when `themes/<slug>.json` exists at build time.

This project uses **`output: 'export'`**. After `npm run build`, static files are in **`out/`** (upload that folder to Pages, or use an Action that deploys `out`). A branded **`404`** page is included as **`out/404.html`**. **`out/sitemap.xml`** and **`out/robots.txt`** are generated from the manifest at build time; set **`NEXT_PUBLIC_SITE_URL`** (e.g. `https://stockthemes.ai`) in CI so URLs match your deployed domain (defaults to `https://stockthemes.ai` if unset).

**Local smoke test of the static bundle:** `npm run build` then `npx --yes serve out` and open the printed URL (client-side navigation needs a static server, not `file://`).

## CI/CD (GitHub Pages)

Workflow: **`.github/workflows/deploy-pages.yml`**. On every push to **`main`** (and manual **Run workflow**), it runs **`npm ci`**, **`npm run build`**, and deploys **`out/`** via [GitHub Actions for Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#publishing-with-a-custom-github-actions-workflow).

**Important:** **`public/.nojekyll`** is required so GitHub Pages does not run Jekyll, which otherwise skips **`_next/`** (CSS/JS) and leaves the site unstyled.

### One-time repo setup

1. **GitHub → Settings → Pages → Build and deployment:** set **Source** to **GitHub Actions** (not “Deploy from a branch”).
2. **Actions variables** (Settings → Secrets and variables → Actions → **Variables** → **New repository variable**). For a **project** site at **`https://<user>.github.io/<repo>/`** (no custom domain yet), use:

   | Name | Example value | Notes |
   |------|----------------|--------|
   | `NEXT_PUBLIC_STOCKTHEMES_MANIFEST_URL` | `https://storage.stockthemes.ai/manifest.json` | Public R2 custom domain; see `docs/R2_MIGRATION.md`. |
   | `NEXT_PUBLIC_SITE_URL` | `https://tmccode.github.io/mosaicbot_stockthemes` | Your real **GitHub username** + **repo name**; **no** trailing slash. |
   | `NEXT_PUBLIC_BASE_PATH` | `/mosaicbot_stockthemes` | **Must** match the repo name segment in the URL (leading `/`). |

   When you later use a **custom domain at the apex** (e.g. `https://stockthemes.ai`), set **`NEXT_PUBLIC_SITE_URL`** to that origin and **delete** **`NEXT_PUBLIC_BASE_PATH`** (or leave it empty) so the build serves from `/`.

3. Push to **`main`**; check the **Actions** tab. First run may ask you to approve the **`github-pages`** environment.

### Custom domain

After the site is live on Pages, add your domain under **Pages → Custom domain** and point DNS per GitHub’s docs. Then set **`NEXT_PUBLIC_SITE_URL`** to that domain and redeploy so sitemap/robots use the correct host.

### Project site (`/repo-name` on github.io)

`next.config.ts` reads **`NEXT_PUBLIC_BASE_PATH`** at build time (set in Actions variables). Without it, CSS/JS and client routes 404 under **`/<repo>/`**. Custom domain at apex: omit **`NEXT_PUBLIC_BASE_PATH`**.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
