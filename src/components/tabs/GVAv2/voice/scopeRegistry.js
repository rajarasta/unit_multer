export const SCOPES = [
  {
    key: 'prodaja',
    title: 'Svi procesi: prodaja',
    matchers: {
      name: [/^prodaja$/i],
      tags: [/^prodaja$/i, /^sales$/i]
    }
  },
  {
    key: 'proizvodnja',
    title: 'Svi procesi: proizvodnja',
    matchers: {
      name: [/proizvodnj/i],
      tags: [/^proizvodnja$/i, /^manufacturing$/i]
    }
  },
  {
    key: 'opcenito',
    title: 'Svi procesi: općenito',
    matchers: {
      name: [/op?cenit/i, /opce/i],
      tags: [/^opcenito$/i, /^general$/i]
    }
  },
  {
    key: 'sve',
    title: 'Svi procesi (bez filtra)',
    matchers: null
  }
];

export const normalise = (s) =>
  String(s||'').toLowerCase().normalize('NFKD').replace(/[čćšđž]/g, c => ({'č':'c','ć':'c','š':'s','đ':'d','ž':'z'}[c] || c));