# Bags Valley

Girls' bags online store for Pakistan (PKR, cash on delivery). Written in **TypeScript** and runs on **Cloudflare Workers**, with automatic deployment from **GitHub**. No PHP and no server to manage.

## What's included (same features as the PHP version)

- Storefront: hero (3D bag or photo), categories, search, sort, product pages, favourites, cart, coupons, promo banner, FAQ, reviews, custom sections
- Checkout: cash on delivery, delivery fee by city, free-delivery threshold, minimum order, stock check on the server, WhatsApp order confirmation
- Admin at `/admin/`: products (4 photos, sale price, stock, SEO), categories, pages, sections, logo/menu, coupons, delivery, orders, reports, SEO, Meta Ads settings, backup
- SEO: product pages, sitemap, robots.txt, structured meta tags, Google Analytics / Search Console fields
- Meta Pixel + Conversions API, Meta catalog feed at `/meta-catalog.csv`
- Security: hashed admin code, lockout after 5 wrong codes, CSRF protection, image type checking, spam trap on checkout

## Deploy with GitHub (recommended)

Every push to `main` deploys the site automatically.

### 1. One-time Cloudflare setup
1. Create a free account at <https://dash.cloudflare.com>.
2. Open **Storage & databases → R2 object storage** once and activate R2 (needed for product photo uploads; the free tier is enough for a small store).
3. Copy your **Account ID** (Workers & Pages page, right-hand side).
4. Create an API token: **My Profile → API Tokens → Create Token → "Edit Cloudflare Workers"** template. Then add one more permission: **Account → Workers R2 Storage → Edit**.

### 2. Put the code on GitHub
```sh
git init
git add .
git commit -m "Bags Valley"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/bags-valley.git
git push -u origin main
```

### 3. Add three GitHub secrets
Repository → **Settings → Secrets and variables → Actions → New repository secret**:

| Name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | the token from step 1.4 |
| `CLOUDFLARE_ACCOUNT_ID` | your Account ID |
| `ADMIN_CODE` | your private admin login code, 4 to 10 digits |

### 4. Deploy
Go to the **Actions** tab → **Deploy Bags Valley to Cloudflare** → **Run workflow** (or just push a change). When it finishes, your store is live at `https://bags-valley.<your-subdomain>.workers.dev`. To use your own domain: Cloudflare → Workers & Pages → bags-valley → **Settings → Domains & Routes**.

## First steps after it's live

1. Open `/admin/` and log in with your `ADMIN_CODE`.
2. **Store and contact:** replace the placeholder WhatsApp number (`923001234567`) with your real one, and add your phone/email/address.
3. Change your code anytime under **Security**. Note: after the first login the code is stored (hashed) inside the store, so changing the `ADMIN_CODE` secret later does *not* change the login. Use the Security page instead.
4. Add your logo, products and photos. Changes go live immediately for all visitors.
5. The sample coupon is `VALLEY10` (10% off). Edit or delete it under Coupons.

## Run it on your computer
```sh
npm install
cp .dev.vars.example .dev.vars     # sets a local-only admin code
npm run dev                        # open the printed localhost address
npm run typecheck
```

## Deploy from your terminal (without GitHub)
```sh
npm install
npx wrangler login
npx wrangler r2 bucket create bags-valley-media
npx wrangler secret put ADMIN_CODE
npm run deploy
```

## Project layout
```
src/index.ts        Worker: pages, API, orders, admin, Meta CAPI
src/store.json      Starting products and site settings (used only on first run)
public/             Admin screen, CSS, JavaScript, bundled images
wrangler.toml       Cloudflare configuration
.github/workflows/  Automatic deploy from GitHub
```

## Good to know
- Store data and orders are kept in a Cloudflare Durable Object; photos in R2. Deploying again never resets them.
- **Backups:** Admin → Backup downloads products and settings. Orders and photos are stored separately, so export orders from time to time.
- Email alerts for new orders are not available on Workers. Orders appear in Admin → Orders and customers confirm on WhatsApp.
