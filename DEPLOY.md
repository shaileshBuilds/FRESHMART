# FRESHMART — Testing & Deployment

## Run locally
    python3 -m http.server 8080      # then open http://localhost:8080

## Test (needs: pip install playwright && playwright install chromium)
    python3 tests/audit.py   # 4 viewports × all pages: JS errors, 404s, horizontal overflow, tap targets, a11y basics
    python3 tests/e2e.py     # cart, wishlist, search, filters, product, newsletter, mobile menu, all pages load
    python3 tests/audit.py --online   # same audit with the real Tailwind/Lucide CDNs

## Before going live
1. Replace `YOUR-DOMAIN.example` in `robots.txt` and `sitemap.xml`.
2. (Optional) add `assets/banners/hero.jpg` — the hero uses it automatically when present.
3. Tailwind is loaded from its CDN (fine for launch, but it is a dev-oriented build); for peak performance, compile it once with the Tailwind CLI and swap the CDN `<script>` for the generated CSS.

## Deploy (pick one — no build step; publish directory is the project root)
- **Netlify:** drag-and-drop the folder at app.netlify.com/drop, or connect the repo (`netlify.toml` is included).
- **Vercel:** `npx vercel --prod` (`vercel.json` is included).
- **GitHub Pages:** push to `main`; the workflow in `.github/workflows/pages.yml` publishes it (Settings → Pages → Source: GitHub Actions).
- **Any static host / cPanel:** upload the folder contents to `public_html`.

`404.html` is picked up automatically by Netlify, Vercel and GitHub Pages.

## Note
Cart, orders, accounts and wishlist are stored in the browser (localStorage) — there is no backend yet, so payments are simulated.
