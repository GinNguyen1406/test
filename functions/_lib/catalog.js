// Shared helpers: read the PRODUCTS array out of shop.html (the single source of truth)
// without eval, so the catalog that bots see is always the one customers see.

export const SITE = 'https://bunniihaus.info';
export const COL_ORDER = ['Bunny', 'Dragon', 'Bear', 'Smudge', 'Bag', 'Animal', 'Plants', 'Food', 'Keycharm', 'Others'];
export const COL_VI = {Bunny: 'Bunny (thỏ)', Dragon: 'Dragon (rồng)', Bear: 'Bear (gấu)', Smudge: 'Smudge', Bag: 'Bag (túi)', Animal: 'Animal (động vật)', Plants: 'Plants (cây, hoa, rau củ)', Food: 'Food (đồ ăn)', Keycharm: 'Keycharm (móc khoá, bag charm)', Others: 'Others (khác)'};
const BADGE = {'Selfridges Exclusive': 'độc quyền Selfridges', 'Liberty Exclusive': 'độc quyền Liberty London', 'NYC Exclusive': 'độc quyền FAO Schwarz New York'};

// Parse `const PRODUCTS = [ {id:1,name:"…",…}, … ];` field by field
export function parseProducts(html) {
  const m = html.match(/const PRODUCTS = (\[[\s\S]*?\n\]);/);
  if (!m) return [];
  const out = [];
  for (const obj of m[1].match(/\{[^{}]*\}/g) || []) {
    const p = {};
    for (const [, k, v] of obj.matchAll(/(\w+)\s*:\s*("(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?)/g)) {
      p[k] = v[0] === '"' ? JSON.parse(v) : Number(v);
    }
    if (p.id && p.name) out.push(p);
  }
  return out;
}

export const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
export const vnd = n => n.toLocaleString('vi-VN') + '₫';
export const kfmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'k';
export const badgeVi = b => BADGE[b] || b;
const imgUrl = p => SITE + '/' + String(p.img).replace(/^\//, '');

export function grouped(P) {
  const by = {};
  for (const p of P) (by[p.collection] = by[p.collection] || []).push(p);
  return COL_ORDER.filter(c => by[c]).map(c => [c, by[c]]).concat(Object.keys(by).filter(c => !COL_ORDER.includes(c)).map(c => [c, by[c]]));
}

// Visible, crawlable price list for /shop (collapsed by default)
export function catalogHtml(P) {
  const groups = grouped(P);
  const lis = ps => ps.map(p => `<li><a href="/shop?p=${p.id}">${esc(p.name)}</a>${p.badge ? ` <small>(${esc(badgeVi(p.badge))})</small>` : ''}<span>${p.priceNum > 0 ? kfmt(p.priceNum) : 'Liên hệ'}</span></li>`).join('');
  return `<section class="plist" id="bang-gia" aria-labelledby="plistTitle">
  <details>
    <summary id="plistTitle">Bảng giá ${P.length} mẫu Jellycat chính hãng tại Bunniihaus</summary>
    <p class="plist-note">Giá niêm yết tại cửa hàng 207 Hoàng Sa, Phường Tân Định, TP.HCM (đơn vị: nghìn đồng). Đủ tag gốc và dustbag. Xem hướng dẫn <a href="/jellycat-tphcm">mua Jellycat chính hãng ở TP.HCM</a>.</p>
    ${groups.map(([c, ps]) => `<h3>${esc(COL_VI[c] || c)} <small>${ps.length} mẫu</small></h3><ul>${lis(ps)}</ul>`).join('\n    ')}
  </details>
</section>`;
}

// schema.org ItemList of Products with VND offers
export function itemListLd(P) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Jellycat chính hãng tại Bunniihaus',
    numberOfItems: P.length,
    itemListElement: P.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: p.name,
        url: `${SITE}/shop?p=${p.id}`,
        image: imgUrl(p),
        brand: {'@type': 'Brand', name: 'Jellycat'},
        ...(p.priceNum > 0 ? {offers: {'@type': 'Offer', price: p.priceNum * 1000, priceCurrency: 'VND', availability: 'https://schema.org/InStock'}} : {}),
      },
    })),
  });
}

// Plain-text catalog for AI assistants (/llms-full.txt)
export function llmsFull(P) {
  const groups = grouped(P);
  const lines = [
    '# Bunniihaus — danh mục đầy đủ (Full catalog)',
    '',
    `> Cửa hàng Jellycat chính hãng tại 207 Hoàng Sa, Phường Tân Định, TP.HCM (tầng 1, phía trên quán cà phê Mori). Mở cửa 10:00–20:00 mỗi ngày. Hotline 081 770 02 05. Instagram @bunniihaus. Hiện có ${P.length} mẫu. Danh mục này tự cập nhật từ trang Shop.`,
    '',
    'Giá niêm yết bằng VND (k = nghìn đồng). Link từng mẫu: https://bunniihaus.info/shop?p=<id>',
    '',
  ];
  for (const [c, ps] of groups) {
    lines.push(`## ${COL_VI[c] || c} (${ps.length} mẫu)`, '');
    for (const p of ps) lines.push(`- ${p.name}: ${p.priceNum > 0 ? kfmt(p.priceNum) + ' (' + vnd(p.priceNum * 1000) + ')' : 'liên hệ'}${p.badge ? ' — ' + badgeVi(p.badge) : ''} — ${SITE}/shop?p=${p.id}`);
    lines.push('');
  }
  return lines.join('\n');
}
