// /shop: the product grid is drawn by JavaScript, which most AI crawlers never run.
// Inject a visible price list and a Product ItemList (JSON-LD) built from the same PRODUCTS array.
import {parseProducts, catalogHtml, itemListLd} from './_lib/catalog.js';

export async function onRequestGet(context) {
  const res = await context.next();
  const type = res.headers.get('content-type') || '';
  if (!res.ok || !type.includes('text/html')) return res;
  const html = await res.text();
  try {
    const P = parseProducts(html);
    if (!P.length) return new Response(html, res);
    const out = html
      .replace('<!--CATALOG-->', catalogHtml(P))
      .replace('</head>', `<script type="application/ld+json">${itemListLd(P)}</script>\n</head>`);
    const headers = new Headers(res.headers);
    headers.delete('content-length');
    return new Response(out, {status: res.status, headers});
  } catch (e) {
    return new Response(html, res);
  }
}
