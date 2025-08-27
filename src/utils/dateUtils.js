// utils/dateUtils.js
export const DAY_MS = 24 * 3600 * 1000;

export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
};

export const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

export const daysBetween = (start, end) => 
  Math.ceil((new Date(end) - new Date(start)) / DAY_MS);

export const croatianDateFormat = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('hr-HR', { 
    day: 'numeric', 
    month: 'short' 
  });
};

export const croatianDateFull = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('hr-HR', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
};

export const croatianDateTime = (date) => {
  const d = new Date(date);
  return d.toLocaleString('hr-HR', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};