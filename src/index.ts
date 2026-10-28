import initialStore from "./store.json";

type JsonRecord = Record<string, any>;
type Product = JsonRecord & {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale: number;
  stock: number;
};
type Store = { products: Product[]; site: JsonRecord };

interface Env {
  ASSETS: Fetcher;
  STATE: DurableObjectNamespace;
  MEDIA: R2Bucket;
  ADMIN_CODE?: string;
}

const initial = initialStore as Store;
const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...jsonHeaders, ...headers },
  });
}

function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char] ?? char;
  });
}

function val(obj: JsonRecord, path: string, fallback: any = ""): any {
  return path.split(".").reduce((curr: any, part) => curr?.[part], obj) ?? fallback;
}

function slug(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
}

function money(value: number, site: JsonRecord): string {
  return `${site.cur || "Rs"} ${Math.round(Number(value) || 0).toLocaleString("en-PK")}`;
}

function price(product: Product): number {
  return Number(product.sale) > 0 ? Number(product.sale) : Number(product.price);
}

function visibleStore(store: Store): Store {
  const site = structuredClone(store.site);
  delete site.coupons;
  delete site.notify;
  const disabled = new Set((site.cats || []).filter((c: JsonRecord) => c.on === 0 || c.on === "0" || c.on === false).map((c: JsonRecord) => c.n));
  site.cats = (site.cats || []).filter((c: JsonRecord) => !disabled.has(c.n));
  site.pages = (site.pages || []).filter((page: JsonRecord) => page.on).map((page: JsonRecord) => ({
    title: page.title,
    slug: slug(page.slug || page.title || ""),
  }));
  return {
    site,
    products: store.products.filter((p) => !p.hide && !disabled.has(p.cat)),
  };
}

function imageOf(product: Product): string {
  return product.imgs?.[0] || product.img || "";
}

function bagSvg(color: string): string {
  const safeColor = /^#[\da-f]{6}$/i.test(color) ? color : "#ff5fa2";
  const id = safeColor.slice(1);
  return `<svg viewBox="0 0 200 200" role="img" aria-label="Bag"><defs><linearGradient id="g${id}" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${safeColor}"/><stop offset="1" stop-color="${safeColor}" stop-opacity=".65"/></linearGradient></defs><path d="M70 82V62a30 30 0 0 1 60 0v20" fill="none" stroke="${safeColor}" stroke-width="9" stroke-linecap="round"/><rect x="36" y="78" width="128" height="98" rx="20" fill="url(#g${id})"/><rect x="47" y="89" width="106" height="76" rx="13" fill="none" stroke="#fff" stroke-opacity=".7" stroke-dasharray="4 4"/><circle cx="100" cy="114" r="9" fill="#ffe08a"/></svg>`;
}

function picture(product: Product, eager = false): string {
  const image = imageOf(product);
  if (!image) return bagSvg(product.color || "#ff5fa2");
  return `<img src="${esc(image)}" alt="${esc(product.name)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} width="600" height="600"${product.blend ? ' class="mul"' : ""}>`;
}

function card(product: Product, site: JsonRecord): string {
  const sale = Number(product.sale) > 0;
  const stock = Number(product.stock || 0);
  const badgeOn = !isOff(val(site, "ui.badges", 1));
  const categoryOn = !isOff(val(site, "ui.cardcat", 1));
  const addOn = !isOff(val(site, "ui.cardadd", 1));
  const wishOn = !isOff(val(site, "ui.wish", 1));
  return `<article class="card" data-tilt>${wishOn ? `<button class="hrt" data-hr="${esc(product.id)}" aria-label="Save ${esc(product.name)}" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg></button>` : ""}<a class="pic" href="/product/${esc(product.slug)}" style="--c:${esc(product.color || "#ff5fa2")}" aria-label="View ${esc(product.name)}">${picture(product)}${badgeOn && sale ? '<span class="tag">Sale</span>' : ""}${badgeOn && product.best ? '<span class="tag t2">Best seller</span>' : ""}${stock < 1 ? '<span class="tag out">Sold out</span>' : ""}</a><div class="inf"><h3><a href="/product/${esc(product.slug)}">${esc(product.name)}</a></h3>${categoryOn ? `<p>${esc(product.cat)}</p>` : ""}<div class="row"><b>${esc(money(price(product), site))}</b>${sale ? `<s>${esc(money(Number(product.price), site))}</s>` : ""}${addOn ? `<button class="btn sm" data-a="${esc(product.id)}"${stock < 1 ? " disabled" : ""}>Add</button>` : ""}</div></div></article>`;
}

function header(site: JsonRecord): string {
  const logo = site.logo ? `<img src="${esc(site.logo)}" alt="${esc(site.name)}" height="40">` : "";
  const brand = site.logoMode === "logo" ? logo || esc(site.name) : site.logoMode === "name" ? esc(site.name) : `${logo}${esc(site.name)}`;
  const nav = ["cats", "best", "promo", "shop", "why", "reviews", "faq"]
    .filter((key) => val(site, `nav.${key}.on`, ["cats", "shop", "why", "faq"].includes(key) ? 1 : 0))
    .map((key) => `<a href="/#${key}">${esc(val(site, `nav.${key}.l`, ({ cats: "Categories", best: "Best sellers", promo: "Offers", shop: "Shop", why: "Why us", reviews: "Reviews", faq: "FAQ" } as JsonRecord)[key]))}</a>`)
    .join("");
  return `${site.ann && val(site, "ui.ann", 1) ? `<div class="ann">${esc(site.ann)}</div>` : ""}<header><div class="nav" id="nv"><a class="logo" href="/" aria-label="${esc(site.name)} home">${brand}</a><nav aria-label="Main">${nav}</nav><button class="ic" id="cb" aria-label="Open cart"><span>Bag</span><span id="cc">0</span></button><button class="ic bgr" id="bg" aria-label="Menu" aria-expanded="false">Menu</button></div></header>`;
}

function footer(site: JsonRecord): string {
  const foot = site.foot || {};
  const pages = (site.pages || []).filter((p: JsonRecord) => p.on).map((p: JsonRecord) => `<a href="/page/${esc(slug(p.slug || p.title || ""))}">${esc(p.title)}</a>`).join("");
  return `<footer><div class="fg"><div><b class="fl">${esc(site.name)}</b><p>${esc(foot.about || "")}</p></div><div><b class="fh">Shop</b><a href="/#shop">All bags</a><a href="/#faq">FAQ</a>${pages}</div><div><b class="fh">Contact</b>${foot.phone ? `<a href="tel:${esc(foot.phone)}">${esc(foot.phone)}</a>` : ""}${foot.email ? `<a href="mailto:${esc(foot.email)}">${esc(foot.email)}</a>` : ""}<span>${esc(foot.addr || "")}</span></div></div><p class="cp">&copy; ${new Date().getFullYear()} ${esc(site.name)}</p></footer>`;
}

function sharedTail(store: Store, productId = ""): string {
  const publicStore = visibleStore(store);
  const site = publicStore.site;
  delete site.code;
  const data = JSON.stringify({ site, products: publicStore.products })
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
  return `<a class="wa" id="wa" href="#" target="_blank" rel="noopener" aria-label="Chat on WhatsApp"><span>Order on WhatsApp</span></a><dialog id="cd" class="checkout-dialog" aria-labelledby="checkout-title"><button class="x" data-close aria-label="Close checkout">&times;</button><div class="checkout-heading"><span>YOUR ORDER, JUST A FEW DETAILS AWAY</span><h2 id="checkout-title">Checkout</h2><p>We’ll call or message to confirm your cash-on-delivery order.</p></div><form id="cf" class="checkout-form"><div class="checkout-fields"><div class="checkout-field"><label for="cn">Full name</label><input id="cn" name="name" required minlength="2" maxlength="80"></div><div class="checkout-field"><label for="cp">Phone number</label><input id="cp" name="phone" type="tel" required maxlength="24"></div><div class="checkout-field"><label for="cy">City</label><input id="cy" name="city" required maxlength="60"></div><div class="checkout-field checkout-address"><label for="ca">Complete delivery address</label><textarea id="ca" name="addr" required minlength="5" maxlength="300" rows="3"></textarea></div><div class="checkout-field checkout-address"><label for="cnn">Delivery note</label><input id="cnn" name="note" maxlength="300"></div><input name="hp" tabindex="-1" autocomplete="off" aria-hidden="true" class="checkout-honeypot"></div><div class="checkout-summary"><span>PAYMENT METHOD</span><strong>Cash on delivery</strong><p id="ct">Your order total will appear here.</p><div class="checkout-promise"><span>✓</span> No online payment required</div><button class="btn checkout-submit">Place my order</button></div></form></dialog><dialog id="od" aria-label="Order placed"><button class="x" data-close aria-label="Close">&times;</button><h2>Thank you! Order placed</h2><p>Your order number is <b id="ot"></b>. Please confirm it on WhatsApp so we can deliver quickly.</p><a class="btn" id="ow" target="_blank" rel="noopener">Confirm on WhatsApp</a></dialog><aside id="ds" aria-label="Cart"><button class="x" id="dx" aria-label="Close cart">&times;</button><h2>Your cart</h2><div id="ci" style="flex:1;overflow:auto"></div><form class="cpn" id="cpf"><input id="cpi" placeholder="Coupon code" aria-label="Coupon code"><button class="ib">Apply</button></form><div id="tt"></div><button class="btn" id="go">Checkout</button></aside><div id="tst" role="status" aria-live="polite"></div><script>window.__S=${data};${productId ? `window.__P=${JSON.stringify(productId)};` : ""}</script><script src="/js/shop.js"></script>`;
}

function pageHead(title: string, description: string, site: JsonRecord, canonical: string, image = ""): string {
  const theme = site.theme || {};
  const shareImage = image || site.seo?.og || "";
  const colors = /^#[\da-f]{6}$/i.test(theme.a || "") && /^#[\da-f]{6}$/i.test(theme.b || "")
    ? `<style>:root{--pk:${theme.a};--pu:${theme.b};--g:linear-gradient(135deg,${theme.a},${theme.b})}</style>`
    : "";
  const google = /^G-[A-Z0-9]{4,14}$/.test(site.seo?.ga || "")
    ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(site.seo.ga)}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${esc(site.seo.ga)}')</script>`
    : "";
  const relativeImage = shareImage && !/^(?:https?:)?\/\//i.test(shareImage) ? new URL(shareImage, canonical).href : shareImage;
  const descriptionMeta = site.seo?.kw ? `<meta name="keywords" content="${esc(site.seo.kw)}">` : "";
  const verification = `${site.seo?.gsc ? `<meta name="google-site-verification" content="${esc(site.seo.gsc)}">` : ""}${site.meta?.verify ? `<meta name="facebook-domain-verification" content="${esc(site.meta.verify)}">` : ""}`;
  const social = `<meta property="og:type" content="${image ? "product" : "website"}"><meta property="og:site_name" content="${esc(site.name)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:locale" content="en_US">${relativeImage ? `<meta property="og:image" content="${esc(relativeImage)}">` : ""}<meta name="twitter:card" content="${relativeImage ? "summary_large_image" : "summary"}"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}">${relativeImage ? `<meta name="twitter:image" content="${esc(relativeImage)}">` : ""}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}">${descriptionMeta}<meta name="robots" content="${site.seo?.noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large"}"><meta name="theme-color" content="${esc(theme.a || "#d9267d")}"><link rel="canonical" href="${esc(canonical)}">${social}${verification}<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="/css/style.css"><link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,800&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">${colors}${google}<style>:root{--cols:${Math.max(2, Math.min(6, Number(site.shop?.cols || 4)))}}</style>${site.code?.head || ""}</head><body>`;
}

function renderHome(store: Store, canonical: string): string {
  const site = store.site;
  const products = store.products.filter((p) => !p.hide && !isOffCategory(site, p.cat));
  const hero = site.hero || {};
  const sections: Record<string, string> = {
    marquee: (site.marquee || []).length ? `<div class="mq"><div>${(site.marquee as string[]).map((x) => `<span>${esc(x)}</span>`).join("")}</div></div>` : "",
    cats: (site.cats || []).filter((c: JsonRecord) => !isOff(c.tile)).length ? `<section class="w" id="cats"><h2>${esc(val(site, "titles.cats", "Shop by category"))}</h2><div class="cts">${(site.cats || []).filter((c: JsonRecord) => !isOff(c.tile)).map((c: JsonRecord) => `<button class="ct" data-c="${esc(c.n)}"><span>${esc(c.n)}</span><small>${products.filter((p) => p.cat === c.n).length} bags</small></button>`).join("")}</div></section>` : "",
    promo: site.promo?.on ? `<section class="w" id="promo"><div class="promo">${site.promo.img ? `<img src="${esc(site.promo.img)}" alt="">` : ""}<div><h2>${esc(site.promo.title)}</h2><p>${esc(site.promo.text)}</p><a class="btn" href="${esc(site.promo.link || "#shop")}">${esc(site.promo.cta || "Shop now")}</a></div></div></section>` : "",
    best: products.some((p) => p.best) ? `<section class="w" id="best"><h2>${esc(val(site, "titles.best", "Best sellers"))}</h2><div class="rail">${products.filter((p) => p.best).map((p) => card(p, site)).join("")}</div></section>` : "",
    shop: `<section class="w" id="shop"><h2>${esc(val(site, "titles.shop", "All bags"))}</h2><div class="tools">${val(site, "shop.chips", 1) ? '<div class="chips" id="chips"></div>' : ""}${val(site, "shop.search", 1) ? '<label for="q" class="sr">Search</label><input id="q" type="search" placeholder="Search bags">' : ""}${val(site, "shop.sort", 1) ? '<label for="so" class="sr">Sort</label><select id="so"><option value="f">Featured</option><option value="lo">Price: low to high</option><option value="hi">Price: high to low</option></select>' : ""}</div><div class="grid" id="grid">${products.map((p) => card(p, site)).join("")}</div></section>`,
    why: (site.why || []).length ? `<section class="w" id="why"><h2>${esc(val(site, "titles.why", "Why girls love us"))}</h2><div class="why">${site.why.map((x: JsonRecord) => `<div><h3>${esc(x.t)}</h3><p>${esc(x.d)}</p></div>`).join("")}</div></section>` : "",
    reviews: (site.reviews || []).length ? `<section class="w" id="reviews"><h2>${esc(val(site, "titles.reviews", "What customers say"))}</h2><div class="rv">${site.reviews.map((x: JsonRecord) => `<blockquote>${esc(x.t)}<b>${esc(x.n)}</b></blockquote>`).join("")}</div></section>` : "",
    faq: (site.faq || []).length ? `<section class="w" id="faq"><h2>${esc(val(site, "titles.faq", "Questions"))}</h2>${site.faq.map((x: JsonRecord) => `<details><summary>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join("")}</section>` : "",
  };
  const order = Array.isArray(site.order) ? site.order : ["marquee", "cats", "promo", "best", "shop", "why", "reviews", "faq"];
  const heroHtml = isOff(val(site, "sections.hero", 1)) ? "" : `<section class="hero" id="hero"><div class="hs ${hero.mode === "photo" ? "mp" : "m3"}" id="hs"><i class="orb"></i><canvas id="c3" aria-label="3D bag preview" role="img"></canvas><div class="slab"><div class="ph">${hero.img ? `<img src="${esc(hero.img)}" alt="${esc(site.name)}">` : products[0] ? picture(products[0], true) : ""}</div><div class="mi">${hero.img2 ? `<img src="${esc(hero.img2)}" alt="">` : products[1] ? picture(products[1]) : ""}</div></div></div><div class="hc"><div><h1>${esc(hero.title || site.name)}</h1><p class="lead">${esc(hero.sub || "")}</p><div class="btns"><a class="btn" href="#shop">${esc(hero.cta || "Shop now")}</a></div></div></div>${hero.badge ? `<span class="gl a">${esc(hero.badge)}</span>` : ""}<span class="gl b">Free delivery over ${esc(money(val(site, "ship.free", 0), site))}</span></section>`;
  const customSections = new Map<string, string>();
  for (const c of (site.custom || []).filter((item: JsonRecord) => item.id && !isOff(item.on))) {
    const sectionId = `c_${c.id}`;
    const heading = `${c.title ? `<h2>${esc(c.title)}</h2>` : ""}${c.sub ? `<p class="sub">${esc(c.sub)}</p>` : ""}`;
    const button = c.cta ? `<a class="btn" href="${esc(c.link || "#shop")}">${esc(c.cta)}</a>` : "";
    let markup = "";
    if (c.type === "html") markup = `<section class="w cs" id="${esc(sectionId)}">${heading}<div class="csh">${c.html || ""}</div></section>`;
    else if (c.type === "banner") markup = `<section class="w cs" id="${esc(sectionId)}"><div class="promo">${c.img ? `<img src="${esc(c.img)}" alt="" loading="lazy">` : ""}<div>${c.title ? `<h2>${esc(c.title)}</h2>` : ""}<p>${esc(c.text || "")}</p>${button}</div></div></section>`;
    else if (c.type === "imgtext") markup = `<section class="w cs" id="${esc(sectionId)}"><div class="csi${c.side === "right" ? " rt" : ""}">${c.img ? `<img src="${esc(c.img)}" alt="${esc(c.title || "")}" loading="lazy">` : ""}<div>${heading}${c.text ? `<p>${esc(c.text).replace(/\r?\n/g, "<br>")}</p>` : ""}${button}</div></div></section>`;
    else if (c.type === "products") {
      const selected = products.filter((p) => !c.cat || c.cat === "All" || (c.cat === "__best" ? p.best : p.cat === c.cat)).slice(0, Math.max(1, Math.min(24, Number(c.limit) || 4)));
      markup = selected.length ? `<section class="w cs" id="${esc(sectionId)}">${heading}<div class="grid">${selected.map((p) => card(p, site)).join("")}</div></section>` : "";
    } else if (c.type === "video") {
      const match = String(c.url || "").match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
      if (match) markup = `<section class="w cs" id="${esc(sectionId)}">${heading}<div class="vid"><iframe src="https://www.youtube-nocookie.com/embed/${match[1]}" title="${esc(c.title || "Video")}" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>${c.text ? `<p>${esc(c.text)}</p>` : ""}</section>`;
    } else {
      markup = `<section class="w cs" id="${esc(sectionId)}">${heading}${c.text ? `<div class="csb"><p>${esc(c.text).replace(/\r?\n/g, "<br>")}</p></div>` : ""}</section>`;
    }
    customSections.set(sectionId, markup);
  }
  const body = `${header(site)}<main>${heroHtml}${order.map((key: string) => {
    if (sections[key]) return isOff(val(site, `sections.${key}`, 1)) ? "" : sections[key];
    return customSections.get(key) || "";
  }).join("")}${[...customSections.entries()].filter(([key]) => !order.includes(key)).map(([, markup]) => markup).join("")}</main>${footer(site)}${sharedTail(store)}${site.code?.body || ""}<script src="/js/home.js"></script>${hero.mode === "3d" ? '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" defer></script><script src="/js/hero3d.js"></script>' : ""}</body></html>`;
  const head = pageHead(site.seo?.title || site.name, site.seo?.desc || "", site, canonical, site.seo?.og || hero.img || (products[0] ? imageOf(products[0]) : ""));
  return head + body;
}

function isOff(value: unknown): boolean {
  return value === 0 || value === "0" || value === false;
}

function isOffCategory(site: JsonRecord, category: string): boolean {
  return (site.cats || []).some((c: JsonRecord) => c.n === category && isOff(c.on));
}

function renderProduct(store: Store, requestedSlug: string, origin: string): Response {
  const product = store.products.find((p) => p.slug === requestedSlug || p.id === requestedSlug);
  if (!product || product.hide || isOffCategory(store.site, product.cat)) {
    return new Response(`${pageHead("Bag not found", "This bag is not available.", store.site, origin)}${header(store.site)}<main class="w"><h1>Bag not found</h1><a class="btn" href="/">Back to the shop</a></main>${footer(store.site)}</body></html>`, {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
  const images: string[] = product.imgs?.filter(Boolean) || (product.img ? [product.img] : []);
  const related = store.products.filter((p) => p.id !== product.id && !p.hide && p.cat === product.cat).slice(0, 4);
  const html = `${pageHead(product.seo_title || `${product.name} | ${store.site.name}`, product.seo_desc || product.desc || "", store.site, `${origin}product/${product.slug}`, images[0] || "")}${header(store.site)}<main class="w pg"><nav class="bc"><a href="/">Home</a> / <a href="/#shop">${esc(product.cat)}</a> / ${esc(product.name)}</nav><div class="pp"><div class="gal"><div class="pimg" style="--c:${esc(product.color || "#ff5fa2")}">${images.length ? `<img id="gm" src="${esc(images[0])}" alt="${esc(product.name)}" fetchpriority="high">` : bagSvg(product.color || "#ff5fa2")}</div>${images.length > 1 ? `<div class="ths">${images.map((image, i) => `<button type="button" data-g="${esc(image)}" aria-label="Photo ${i + 1}"><img src="${esc(image)}" alt=""></button>`).join("")}</div>` : ""}</div><div class="inf2"><h1>${esc(product.name)}</h1><p class="row big"><b>${esc(money(price(product), store.site))}</b>${product.sale > 0 ? `<s>${esc(money(product.price, store.site))}</s>` : ""}</p><p class="stk ${product.stock > 0 ? "ok" : "no"}">${product.stock > 0 ? "In stock" : "Sold out"}</p><p>${esc(product.desc || "")}</p>${product.details ? `<ul class="dl">${String(product.details).split(/\r?\n/).filter(Boolean).map((line: string) => `<li>${esc(line)}</li>`).join("")}</ul>` : ""}<div class="btns"><button class="btn" data-a="${esc(product.id)}"${product.stock < 1 ? " disabled" : ""}>Add to cart</button><a class="btn ghost" id="pwa" target="_blank" rel="noopener" href="#" data-t="${esc(`Hi, I want to order: ${product.name} (${money(price(product), store.site)})`)}">Order on WhatsApp</a></div><ul class="tr"><li>Cash on delivery</li><li>Delivery ${esc(money(val(store.site, "ship.fee", 0), store.site))}</li></ul></div></div>${related.length ? `<section class="rel"><h2>You may also like</h2><div class="grid">${related.map((p) => card(p, store.site)).join("")}</div></section>` : ""}</main>${footer(store.site)}${sharedTail(store, product.id)}${store.site.code?.body || ""}</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function renderPage(store: Store, requestedSlug: string, origin: string): Response {
  const page = (store.site.pages || []).find((p: JsonRecord) => p.on && slug(p.slug || p.title || "") === requestedSlug);
  if (!page) return new Response("Page not found", { status: 404 });
  const html = `${pageHead(`${page.title} | ${store.site.name}`, String(page.body || "").slice(0, 155), store.site, `${origin}page/${slug(page.slug || page.title || "")}`)}${header(store.site)}<main class="w pg"><nav class="bc"><a href="/">Home</a> / ${esc(page.title)}</nav><article class="doc"><h1>${esc(page.title)}</h1>${esc(page.body || "").replace(/\r?\n/g, "<br>")}</article></main>${footer(store.site)}${sharedTail(store)}</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

async function callState(env: Env, request: Request): Promise<Response> {
  const id = env.STATE.idFromName("bags-valley");
  return env.STATE.get(id).fetch(request);
}

export class StoreState implements DurableObject {
  private readonly storage: DurableObjectStorage;
  private readonly media: R2Bucket;
  private readonly adminCode: string;

  constructor(state: DurableObjectState, env: Env) {
    this.storage = state.storage;
    this.media = env.MEDIA;
    this.adminCode = env.ADMIN_CODE || "";
  }

  private async getStore(): Promise<Store> {
    let data = await this.storage.get<Store>("store");
    if (!data) {
      data = structuredClone(initial);
      await this.storage.put("store", data);
    }
    return data;
  }

  private async session(request: Request): Promise<{ token: string; csrf: string } | null> {
    const cookie = request.headers.get("Cookie") || "";
    const token = cookie.match(/(?:^|;\s*)bv_session=([a-f0-9]{64})/)?.[1];
    if (!token) return null;
    const session = await this.storage.get<{ csrf: string; expires: number }>(`session:${token}`);
    if (!session || session.expires < Date.now()) {
      if (session) await this.storage.delete(`session:${token}`);
      return null;
    }
    return { token, csrf: session.csrf };
  }

  private async requireAdmin(request: Request): Promise<Response | null> {
    const session = await this.session(request);
    if (!session) return json({ err: "auth" }, 401);
    if (request.method !== "GET" && request.headers.get("X-CSRF") !== session.csrf) {
      return json({ err: "csrf" }, 403);
    }
    return null;
  }

  private async body(request: Request): Promise<JsonRecord> {
    if (request.headers.get("content-type")?.includes("multipart/form-data")) return {};
    try {
      const text = await request.text();
      return text ? JSON.parse(text) as JsonRecord : {};
    } catch {
      return {};
    }
  }

  private async route(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const action = url.searchParams.get("a") || "";
    const body = await this.body(request);

    if (action === "me") {
      const session = await this.session(request);
      return json({ ok: !!session, csrf: session?.csrf || "" });
    }
    if (action === "login") {
      const attempts = await this.storage.get<{ count: number; until: number }>("loginAttempts") || { count: 0, until: 0 };
      if (Date.now() < attempts.until) {
        return json({ err: `Too many attempts. Try again in ${Math.ceil((attempts.until - Date.now()) / 60000)} minutes.` }, 429);
      }
      const code = String(body.code || "");
      const savedAuth = await this.storage.get<{ salt: string; hash: string }>("adminAuth");
      if (!savedAuth && !this.adminCode) return json({ err: "Set the ADMIN_CODE secret in Cloudflare before logging in." }, 503);
      const isValid = savedAuth
        ? await verifyCode(code, savedAuth)
        : constantTimeEqual(code, this.adminCode);
      if (!isValid) {
        attempts.count++;
        if (attempts.count >= 5) await this.storage.put("loginAttempts", { count: 0, until: Date.now() + 600000 });
        else await this.storage.put("loginAttempts", attempts);
        await new Promise((resolve) => setTimeout(resolve, 350));
        return json({ err: "Wrong code" }, 401);
      }
      if (!savedAuth) await this.storage.put("adminAuth", await hashCode(code));
      await this.storage.delete("loginAttempts");
      const token = randomHex(32);
      const csrf = randomHex(16);
      await this.storage.put(`session:${token}`, { csrf, expires: Date.now() + 8 * 60 * 60 * 1000 });
      return json({ ok: 1, csrf }, 200, {
        "Set-Cookie": `bv_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=28800`,
      });
    }
    if (action === "logout") {
      const session = await this.session(request);
      if (session) await this.storage.delete(`session:${session.token}`);
      return json({ ok: 1 }, 200, { "Set-Cookie": "bv_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" });
    }
    if (action === "store") {
      if (url.searchParams.has("full")) {
        const denied = await this.requireAdmin(request);
        if (denied) return denied;
        return json(await this.getStore());
      }
      return json(visibleStore(await this.getStore()));
    }
    if (action === "coupon") {
      const store = await this.getStore();
      const code = String(body.code || "").trim();
      const coupon = (store.site.coupons || []).find((c: JsonRecord) => c.on && String(c.code).toLowerCase() === code.toLowerCase());
      return coupon
        ? json({ ok: 1, code: coupon.code, pct: Math.max(0, Math.min(100, Number(coupon.pct) || 0)) })
        : json({ err: "That coupon code is not valid." }, 404);
    }
    if (action === "order") return this.placeOrder(body, request);
    if (action === "ev") {
      const events = ["ViewContent", "AddToCart", "InitiateCheckout", "Contact", "Search", "AddToWishlist", "ViewCategory"];
      const eventId = String(body.id || "");
      if (!events.includes(String(body.n)) || !/^[A-Za-z0-9_-]{8,64}$/.test(eventId)) return json({ ok: 0 });
      const store = await this.getStore();
      if (val(store.site, "meta.server", 1)) {
        await this.dispatchCapi(String(body.n), eventId, body.d || {}, String(body.u || request.url), String(body.phone || ""), request);
      }
      return json({ ok: 1 });
    }

    const denied = await this.requireAdmin(request);
    if (denied) return denied;

    if (action === "orders") return json(await this.storage.get<JsonRecord[]>("orders") || []);
    if (action === "save") return this.save(body);
    if (action === "ostatus") {
      const orders = await this.storage.get<JsonRecord[]>("orders") || [];
      for (const order of orders) if (order.id === body.id) order.status = String(body.status || "New");
      await this.storage.put("orders", orders);
      return json({ ok: 1 });
    }
    if (action === "odel") {
      const orders = await this.storage.get<JsonRecord[]>("orders") || [];
      await this.storage.put("orders", orders.filter((o) => o.id !== body.id));
      return json({ ok: 1 });
    }
    if (action === "setcode") {
      const auth = await this.storage.get<{ salt: string; hash: string }>("adminAuth");
      const oldCodeIsValid = auth ? await verifyCode(String(body.old || ""), auth) : constantTimeEqual(String(body.old || ""), this.adminCode);
      const newCode = String(body.new || "");
      if (!oldCodeIsValid) return json({ err: "Current code is wrong" }, 400);
      if (!/^\d{4,10}$/.test(newCode)) return json({ err: "Use 4 to 10 digits" }, 400);
      await this.storage.put("adminAuth", await hashCode(newCode));
      return json({ ok: 1 });
    }
    if (action === "capiset") {
      await this.storage.put("capi", String(body.token || "").trim());
      return json({ ok: 1 });
    }
    if (action === "capiinfo") {
      return json({ has: !!(await this.storage.get<string>("capi")), last: await this.storage.get<string>("capiLast") || "" });
    }
    if (action === "captest") {
      await this.dispatchCapi("PageView", `test${Date.now()}`, {}, request.url, "", request);
      return json({ res: await this.storage.get<string>("capiLast") || "No token or Pixel ID saved yet." });
    }
    if (action === "upload") return this.upload(request);
    if (action === "media") return this.mediaList();
    if (action === "mdel") return this.deleteMedia(body);
    return json({ err: "unknown" }, 404);
  }

  private async save(input: JsonRecord): Promise<Response> {
    return this.storage.transaction(async (txn) => {
      let store = await txn.get<Store>("store") || structuredClone(initial);
      if (input.replace?.products && input.replace?.site) store = input.replace as Store;
      if (input.site && typeof input.site === "object") store.site = input.site;
      if (input.renameCats && typeof input.renameCats === "object") {
        for (const product of store.products) {
          if (input.renameCats[product.cat]) product.cat = String(input.renameCats[product.cat]);
        }
      }
      for (const page of store.site.pages || []) page.slug = slug(page.slug || page.title || "");
      if (input.product && typeof input.product === "object") {
        const product = input.product as Product;
        product.id = String(product.id || `p${randomHex(5)}`).replace(/[^A-Za-z0-9_-]/g, "");
        const index = store.products.findIndex((p) => p.id === product.id);
        if (index >= 0) store.products[index] = product;
        else store.products.push(product);
      }
      const bulk = input.bulk;
      if (bulk && Array.isArray(bulk.ids)) {
        for (const product of store.products) {
          if (!bulk.ids.includes(product.id)) continue;
          if (bulk.op === "hide") product.hide = 1;
          if (bulk.op === "show") product.hide = 0;
          if (bulk.op === "sale") product.sale = Math.max(0, Math.round(product.price * (1 - Number(bulk.val || 0) / 100)));
          if (bulk.op === "nosale") product.sale = 0;
          if (bulk.op === "cat") product.cat = String(bulk.val || "");
        }
        if (bulk.op === "delete") store.products = store.products.filter((p) => !bulk.ids.includes(p.id));
      }
      for (const product of input.add || []) {
        if (!product?.name) continue;
        product.id = `p${randomHex(5)}`;
        store.products.push(product);
      }
      if (input.del) store.products = store.products.filter((p) => p.id !== input.del);
      if (Array.isArray(input.order)) {
        const positions = new Map(input.order.map((id: string, index: number) => [id, index]));
        store.products.sort((a, b) => (positions.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (positions.get(b.id) ?? Number.MAX_SAFE_INTEGER));
      }
      store.products = store.products.map((product) => ({
        ...product,
        id: String(product.id || `p${randomHex(5)}`).replace(/[^A-Za-z0-9_-]/g, ""),
        slug: slug(product.slug || product.name || ""),
        img: product.imgs?.[0] || "",
        price: Math.max(0, Number(product.price) || 0),
        sale: Math.max(0, Math.min(Number(product.price) || 0, Number(product.sale) || 0)),
        stock: Math.max(0, Math.floor(Number(product.stock) || 0)),
      }));
      await txn.put("store", store);
      return json({ ok: 1, store });
    });
  }

  private async placeOrder(input: JsonRecord, request: Request): Promise<Response> {
    if (input.hp) return json({ err: "Could not place the order" }, 400);
    const response = await this.storage.transaction(async (txn) => {
      const store = await txn.get<Store>("store") || structuredClone(initial);
      const requested = Array.isArray(input.items) ? input.items : [];
      if (!requested.length) return json({ err: "Your cart is empty" }, 400);
      const quantities = new Map<string, number>();
      for (const item of requested) {
        const id = typeof item?.id === "string" ? item.id : "";
        const quantity = Number(item?.n);
        if (!id || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
          return json({ err: "Your cart has an invalid quantity. Please review it and try again." }, 400);
        }
        const amount = (quantities.get(id) || 0) + quantity;
        if (amount > 20) return json({ err: "You can order up to 20 of each bag at a time." }, 400);
        quantities.set(id, amount);
      }
      const name = clean(input.name, 80);
      const phone = clean(input.phone, 30);
      const addr = clean(input.addr, 300);
      const note = clean(input.note, 300);
      const city = clean(input.city, 60);
      if (name.length < 2 || phone.replace(/\D/g, "").length < 7 || addr.length < 5 || city.length < 2) {
        return json({ err: "Please enter your name, a valid phone number, city and address" }, 400);
      }
      const items: JsonRecord[] = [];
      let subtotal = 0;
      for (const [id, quantity] of quantities) {
        const product = store.products.find((p) => p.id === id);
        if (!product || product.hide || isOffCategory(store.site, product.cat)) {
          return json({ err: "A bag in your cart is no longer available. Please refresh your cart." }, 400);
        }
        if ((Number(product.stock) || 0) < quantity) return json({ err: `${product.name} has only ${product.stock} left` }, 400);
        product.stock -= quantity;
        const currentPrice = price(product);
        items.push({ id, name: product.name, n: quantity, price: currentPrice });
        subtotal += currentPrice * quantity;
      }
      let percentage = 0;
      let couponCode = "";
      for (const coupon of store.site.coupons || []) {
        if (coupon.on && input.coupon && String(coupon.code).toLowerCase() === String(input.coupon).toLowerCase()) {
          percentage = Math.max(0, Math.min(100, Number(coupon.pct) || 0));
          couponCode = coupon.code;
        }
      }
      const discount = Math.round(subtotal * percentage / 100);
      let delivery = Number(val(store.site, "ship.fee", 0)) || 0;
      for (const zone of val(store.site, "ship.zones", [])) {
        if (zone.city && zone.city.trim().toLowerCase() === city.toLowerCase()) delivery = Number(zone.fee) || 0;
      }
      if (subtotal - discount < Number(val(store.site, "ship.min", 0))) {
        return json({ err: `Minimum order is ${money(Number(val(store.site, "ship.min", 0)), store.site)}` }, 400);
      }
      if (subtotal - discount >= Number(val(store.site, "ship.free", 0))) delivery = 0;
      const orders = await txn.get<JsonRecord[]>("orders") || [];
      const clientHash = await sha256(`${request.headers.get("CF-Connecting-IP") || "unknown"}bagsvalley`);
      const recent = orders.filter((order) => order.iph === clientHash && Date.now() - Date.parse(order.date) < 3600000);
      if (recent.length >= 5) return json({ err: "Too many orders from this connection. Please message us on WhatsApp." }, 429);
      const order: JsonRecord = {
        id: `BV${Date.now().toString(36).toUpperCase()}${randomHex(3).toUpperCase()}`,
        date: new Date().toISOString(),
        name, phone, addr, note, city, items, sub: subtotal, disc: discount, coupon: couponCode,
        ship: delivery, total: subtotal - discount + delivery, status: "New",
        src: clean(input.src, 200), iph: clientHash,
      };
      orders.unshift(order);
      await txn.put("orders", orders);
      await txn.put("store", store);
      const lines = items.map((item) => `${item.n} x ${item.name} (${money(item.price, store.site)})`).join("\n");
      const whatsapp = `New order ${order.id} from ${name}\n${lines}\nSubtotal: ${money(subtotal, store.site)}\nDelivery: ${delivery ? money(delivery, store.site) : "Free"}\nTotal (cash on delivery): ${money(order.total, store.site)}\nPhone: ${phone}\nAddress: ${addr}`;
      const safeOrder = { ...order };
      delete safeOrder.iph;
      return json({ ok: 1, order: safeOrder, wa: whatsapp });
    });
    if (response.status < 300) {
      const result = await response.clone().json() as JsonRecord;
      const order = result.order as JsonRecord | undefined;
      const store = await this.getStore();
      if (order && val(store.site, "meta.on.buy", 1)) {
        const content = {
          currency: "PKR",
          value: order.total,
          content_type: "product",
          content_ids: order.items.map((item: JsonRecord) => item.id),
          contents: order.items.map((item: JsonRecord) => ({ id: item.id, quantity: item.n })),
        };
        await this.dispatchCapi(String(val(store.site, "meta.orderEv", "Purchase")), String(order.id), content, request.url, String(order.phone || ""), request);
      }
    }
    return response;
  }

  private async dispatchCapi(eventName: string, eventId: string, customData: JsonRecord, sourceUrl: string, phone = "", request?: Request): Promise<void> {
    const store = await this.getStore();
    const token = await this.storage.get<string>("capi");
    if (!token || !store.site.meta) return;
    const pixels = [store.site.meta.pixel, store.site.meta.pixel2].filter((pixel: unknown) => typeof pixel === "string" && /^\d{6,20}$/.test(pixel));
    if (!pixels.length) return;
    const userData: JsonRecord = {};
    if (request?.headers.get("CF-Connecting-IP")) userData.client_ip_address = request.headers.get("CF-Connecting-IP");
    if (request?.headers.get("User-Agent")) userData.client_user_agent = request.headers.get("User-Agent");
    if (phone) userData.ph = [await sha256(phone.replace(/\D/g, ""))];
    const cookie = request?.headers.get("Cookie") || "";
    const fbp = cookie.match(/(?:^|;\s*)_fbp=([^;]+)/)?.[1];
    const fbc = cookie.match(/(?:^|;\s*)_fbc=([^;]+)/)?.[1];
    if (fbp) userData.fbp = fbp;
    if (fbc) userData.fbc = fbc;
    const payload: JsonRecord = {
      data: [{
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "website",
        event_source_url: sourceUrl.slice(0, 300),
        user_data: userData,
        custom_data: customData,
      }],
    };
    if (store.site.meta.testcode) payload.test_event_code = store.site.meta.testcode;
    const results: string[] = [];
    for (const pixel of pixels) {
      try {
        const response = await fetch(`https://graph.facebook.com/v19.0/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        results.push(`${pixel}: ${response.status} ${(await response.text()).slice(0, 100)}`);
      } catch (error) {
        results.push(`${pixel}: request failed (${error instanceof Error ? error.message : "network error"})`);
      }
    }
    await this.storage.put("capiLast", `${new Date().toISOString()} ${eventName} ${results.join(" ")}`);
  }

  private async upload(request: Request): Promise<Response> {
    const form = await request.formData();
    const file = form.get("f");
    if (!(file instanceof File)) return json({ err: "No file received" }, 400);
    if (file.size > 4_000_000) return json({ err: "File too large (max 4 MB)" }, 400);
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const ext = imageExtension(bytes);
    if (!ext) return json({ err: "Please use a JPG, PNG or WebP image" }, 400);
    const key = `${randomHex(8)}.${ext}`;
    const contentTypes: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };
    await this.media.put(key, file.stream(), { httpMetadata: { contentType: contentTypes[ext] } });
    return json({ path: `/uploads/${key}` });
  }

  private async mediaList(): Promise<Response> {
    const listed = await this.media.list({ limit: 1000 });
    const files = listed.objects.map((object) => ({
      path: `/uploads/${object.key}`,
      size: object.size,
      time: Math.floor(object.uploaded.getTime() / 1000),
    })).sort((a, b) => b.time - a.time);
    return json(files);
  }

  private async deleteMedia(input: JsonRecord): Promise<Response> {
    const key = String(input.path || "").replace(/^\/?uploads\//, "");
    if (/^[a-f0-9]{16}\.(jpg|png|webp|gif)$/.test(key)) await this.media.delete(key);
    return json({ ok: 1 });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/internal/store") return json(await this.getStore());
    if (url.pathname === "/internal/media") {
      const key = url.searchParams.get("key") || "";
      const object = await this.media.get(key);
      return object ? new Response(object.body, {
        headers: { "Content-Type": object.httpMetadata?.contentType || "application/octet-stream" },
      }) : new Response("Not found", { status: 404 });
    }
    return this.route(request);
  }
}

function randomHex(bytes: number): string {
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}

async function hashCode(code: string): Promise<{ salt: string; hash: string }> {
  const salt = randomHex(16);
  return { salt, hash: await deriveCodeHash(code, salt) };
}

async function verifyCode(code: string, auth: { salt: string; hash: string }): Promise<boolean> {
  return constantTimeEqual(await deriveCodeHash(code, auth.salt), auth.hash);
}

async function deriveCodeHash(code: string, salt: string): Promise<string> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    salt: new TextEncoder().encode(salt),
    iterations: 120000,
    hash: "SHA-256",
  }, material, 256);
  return Array.from(new Uint8Array(bits), (value) => value.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string): boolean {
  let difference = left.length ^ right.length;
  const maxLength = Math.max(left.length, right.length);
  for (let i = 0; i < maxLength; i++) difference |= (left.charCodeAt(i) || 0) ^ (right.charCodeAt(i) || 0);
  return difference === 0;
}

function clean(value: unknown, maxLength: number): string {
  return String(value || "").replace(/<[^>]*>/g, "").trim().slice(0, maxLength);
}

async function sha256(value: string): Promise<string> {
  const result = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(result), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function imageExtension(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "webp";
  if (bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(String.fromCharCode(...bytes.slice(0, 6)))) return "gif";
  return null;
}

async function storedStore(env: Env): Promise<Store> {
  const response = await callState(env, new Request("https://state.internal/internal/store"));
  return await response.json() as Store;
}

function xml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" } as Record<string, string>)[char]);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    if (pathname === "/api" || pathname === "/api/") {
      return callState(env, request);
    }
    if (pathname.startsWith("/uploads/")) {
      return callState(env, new Request(`https://state.internal/internal/media?key=${encodeURIComponent(pathname.slice("/uploads/".length))}`));
    }
    const dynamicPage = pathname === "/" || pathname === "/robots.txt" || pathname === "/sitemap.xml" ||
      pathname === "/meta-catalog.csv" || pathname.startsWith("/product/") || pathname.startsWith("/page/");
    if (!dynamicPage) {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) return asset;
      return new Response("Not found", { status: 404 });
    }
    const store = await storedStore(env);
    const site = store.site;
    const base = `${url.origin}/`;
    if (pathname === "/robots.txt") {
      return new Response(`User-agent: *\n${site.seo?.noindex ? "Disallow: /" : "Allow: /"}\nDisallow: /api\nSitemap: ${base}sitemap.xml\n`, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
    if (pathname === "/sitemap.xml") {
      const links = [`<url><loc>${xml(base)}</loc></url>`, ...store.products.filter((p) => !p.hide).map((p) => `<url><loc>${xml(`${base}product/${p.slug}`)}</loc></url>`)];
      const xmlText = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${links.join("")}</urlset>`;
      return new Response(xmlText, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
    }
    if (pathname === "/meta-catalog.csv") return catalog(store, base);
    if (pathname.startsWith("/product/")) return renderProduct(store, decodeURIComponent(pathname.slice(9)).replace(/\/+$/, ""), base);
    if (pathname.startsWith("/page/")) return renderPage(store, decodeURIComponent(pathname.slice(6)).replace(/\/+$/, ""), base);
    if (pathname === "/") {
      return new Response(renderHome(store, base), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

function catalog(store: Store, base: string): Response {
  const csv = [
    ["id", "title", "description", "availability", "condition", "price", "sale_price", "link", "image_link", "additional_image_link", "brand", "product_type", "google_product_category", "quantity_to_sell_on_facebook", "item_group_id"],
    ...store.products.filter((p) => !p.hide).map((p) => {
      const images = p.imgs?.filter(Boolean) || (p.img ? [p.img] : []);
      return [p.id, p.name, p.desc || p.name, p.stock > 0 ? "in stock" : "out of stock", "new", `${p.price}.00 PKR`, p.sale > 0 ? `${p.sale}.00 PKR` : "", `${base}product/${p.slug}`, images[0] ? new URL(images[0], base).href : "", images.slice(1).map((image: string) => new URL(image, base).href).join(","), store.site.name, p.cat, "Apparel & Accessories > Handbags, Wallets & Cases > Handbags", String(p.stock), p.id];
    }),
  ].map((row) => row.map((field) => `"${String(field ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8" } });
}
