// Date helper functions for GanttAgent
export const ymd = (d) => d.toISOString().slice(0, 10);
export const fromYmd = (s) => new Date(`${s}T00:00:00`);

export const addDays = (s, n) => {
  const d = fromYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};

export const diffDays = (a, b) => {
  const d1 = fromYmd(a), d2 = fromYmd(b);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
};

export const rangeDays = (from, to) => {
  const days = [];
  let cur = fromYmd(from);
  const end = fromYmd(to);
  while (cur <= end) {
    days.push(ymd(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
};