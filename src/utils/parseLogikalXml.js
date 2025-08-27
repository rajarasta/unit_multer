import { XMLParser } from 'fast-xml-parser';
const asArray = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const toNum = (v) => (v == null ? 0 : parseFloat(String(v).replace(',', '.')));
const parseMoney = (s) => {
  if (s == null) return 0;
  const num = String(s)
    .replace(/[ \tA-Za-zâ‚¬$Â£]|EUR|KM|HRK/g, '')
    .replace(',', '.');
  const v = parseFloat(num);
  return isFinite(v) ? v : 0;
};

export async function parseLogikalXml(fileOrString) {
  const xml =
    typeof fileOrString === 'string' ? fileOrString : await fileOrString.text();

  // fast-xml-parser will happily parse with a DOCTYPE present
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    allowBooleanAttributes: true,
    trimValues: true,
  });

  const root = parser.parse(xml);
  // The real data in your sample sits under <ArticleSummary>â€¦</ArticleSummary>
  // which contains AllProfiles, AllAccessories, AllFittings, AllGlasses, AllCalculation
  const doc = root?.logiObj || root || {};
  const summary = doc.ArticleSummary || doc.articleSummary || {};

  // --- Project meta comes from <Object ...>
  const obj = doc.Object || {};
  const project = {
    name: obj.ObjectName || 'LogiKal Project',
    orderNo: obj.Order || '',
    offerNo: obj.Offer || '',
    pm: obj.PersonInCharge || '',
    vat: toNum(obj.VAT),
    customer: obj.CustomerName || '',
    description: '',
    system: '',
    colors: [],
    currency: 'EUR',
  };

  // --- Warnings & ElementPrices live under ArticleSummary â†’ AllCalculation
  const allCalc = summary.AllCalculation || {};
  const warnings = asArray(allCalc?.Warnings?.Warning).map((w) => ({
    text: w?.Text || w?.Description || String(w ?? ''),
    fatal: String(w?.Fatal || '0') === '1',
  }));
  const elementPrices = allCalc?.ElementPrices || {};

  // --- Materials roll-up under ArticleSummary
  const profiles = asArray(summary?.AllProfiles?.OptimizedProfile).map((p) => ({
    group: 'Profiles',
    code: p.Number || p.NumberInternal,
    name: p.Name,
    qty: toNum(p.Qty || 1),
    length_m: toNum(p.UsedLength || p.Length || 0),
    unit_price: parseMoney(p.Price),
    color: p?.Color?.Description || p?.Color || '',
    meta: {
      supplier: p?.Supplier || '',
      priceClass: p?.PriceClass || '',
      positionTag: p?.Position || '',
    },
  }));

  const accessoriesLength = asArray(summary?.AllAccessories?.Length).map((a) => ({
    group: 'Accessories (Length)',
    code: a.Number || a.NumberInternal,
    name: a.Name,
    qty: toNum(a.Length || 0),
    qty_unit: 'm',
    unit_price: parseMoney(a.Price),
    color: a.Color || '',
    meta: {
      supplier: a?.Supplier || '',
      priceClass: a?.PriceClass || '',
      positionTag: a?.Position || '',
    },
  }));

  const accessoriesPiece = asArray(summary?.AllAccessories?.Piece).map((a) => ({
    group: 'Accessories (Piece)',
    code: a.Number || a.NumberInternal,
    name: a.Name,
    qty: toNum(a.Qty || 0),
    qty_unit: 'pcs',
    unit_price: parseMoney(a.Price),
    color: a.Color || '',
    meta: {
      supplier: a?.Supplier || '',
      priceClass: a?.PriceClass || '',
      positionTag: a?.Position || '',
    },
  }));

  const glass = asArray(summary?.AllGlasses?.Glass).map((g) => ({
    group: 'Glass',
    code: g.Name || 'Glass',
    name: g.Name || 'Glass',
    qty: toNum(g.Qty || 1),
    width_mm: toNum(g.WidthMM || 0),
    height_mm: toNum(g.HeightMM || 0),
    area_m2: toNum(g.AreaQM || 0),
    unit_price: parseMoney(g.Price),
    meta: { positionTag: g?.Position || '' },
  }));

  // --- Per-element cut list if present at root â†’ <Position> blocks
  const cutList = [];
  const positions = [];
  asArray(doc.Position).forEach((el) => {
    const positionId = el?.Number || el?.Position || el?.Name;
    positions.push({
      id: String(positionId ?? Math.random()),
      tag: String(positionId ?? 'POS'),
      level: el?.Level || '',
      zone: el?.Zone || '',
      type: el?.Type || 'Element',
      qty: toNum(el?.Qty || 1),
      status: 'Backlog',
      coords: null,
    });
    asArray(el?.Profiles?.Profile).forEach((pr) => {
      cutList.push({
        positionId,
        profile: pr?.Name || pr?.Number || 'Profile',
        sku: pr?.Number || pr?.NumberInternal,
        length_mm: toNum(pr?.LengthMM || pr?.Length || 0),
        angleL: pr?.AngleL || pr?.CutL || '',
        angleR: pr?.AngleR || pr?.CutR || '',
      });
    });
  });

  const itemsRaw = [...profiles, ...accessoriesLength, ...accessoriesPiece, ...glass];
  const items = itemsRaw.map((it) => ({
    description: it.name,
    sku: it.code,
    quantity: it.qty,
    quantity_unit: it.qty_unit || undefined,
    price: it.unit_price,
    total: (it.unit_price || 0) * (it.qty || 0),
    group: it.group,
    color: it.color,
    meta: it.meta || {},
  }));

  const subtotalXml =
    parseMoney(elementPrices?.ProfilePrice?.Price) +
    parseMoney(elementPrices?.AccessoriesPrice?.Price) +
    parseMoney(elementPrices?.GlassPrice?.Price || 0);
  const subtotalItems = items.reduce((s, x) => s + (x.total || 0), 0);

  return {
    project,
    items,
    cutList,
    glass,
    positions,
    warnings,
    totals: { subtotal: Number((subtotalXml || subtotalItems || 0).toFixed(2)) },
    raw: root,
  };
}


