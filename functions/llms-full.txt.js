// /llms-full.txt: every product with its price, generated from shop.html on each request
import {parseProducts, llmsFull} from './_lib/catalog.js';

export async function onRequestGet(context) {
  const shop = await context.env.ASSETS.fetch(new URL('/shop', context.request.url));
  const P = parseProducts(await shop.text());
  if (!P.length) return new Response('Catalog unavailable', {status: 503});
  return new Response(llmsFull(P), {
    headers: {'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600'},
  });
}
