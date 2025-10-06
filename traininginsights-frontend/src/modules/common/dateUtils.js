// Centralized Belgian date/time formatting & parsing utilities
// Formats:
//   Date: dd/MM/yyyy
//   Time: HH:mm (24h)
//   DateTime: dd/MM/yyyy HH:mm

export const DATE_FORMAT = 'dd/MM/yyyy';
export const TIME_FORMAT = 'HH:mm';
export const DATETIME_FORMAT = 'dd/MM/yyyy HH:mm';

// Parse dd/MM/yyyy -> Date (local) or null
export function parseBelgianDate(str){
  if(!str) return null;
  const m = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if(!m) return null;
  const [_, d, M, y] = m;
  const date = new Date(parseInt(y), parseInt(M)-1, parseInt(d));
  return isNaN(date.getTime()) ? null : date;
}

// Format Date -> dd/MM/yyyy
export function formatBelgianDate(date){
  if(!date) return '';
  const d = String(date.getDate()).padStart(2,'0');
  const M = String(date.getMonth()+1).padStart(2,'0');
  const y = date.getFullYear();
  return `${d}/${M}/${y}`;
}

// Parse time HH:mm -> {h,m}
export function parseTime(str){
  if(!str) return null;
  const m = str.match(/^(\d{2}):(\d{2})$/);
  if(!m) return null;
  const h = parseInt(m[1]); const min = parseInt(m[2]);
  if(h<0||h>23||min<0||min>59) return null;
  return {h, m:min};
}

export function formatTime(date){
  if(!date) return '';
  const h = String(date.getHours()).padStart(2,'0');
  const m = String(date.getMinutes()).padStart(2,'0');
  return `${h}:${m}`;
}

export function formatDateTime(date){
  if(!date) return '';
  return `${formatBelgianDate(date)} ${formatTime(date)}`;
}

// Generic safe formatter for any ISO string
export function formatIsoDate(iso){
  if(!iso) return '';
  const d = new Date(iso);
  if(isNaN(d.getTime())) return '';
  return formatBelgianDate(d);
}

export function formatIsoDateTime(iso){
  if(!iso) return '';
  const d = new Date(iso);
  if(isNaN(d.getTime())) return '';
  return formatDateTime(d);
}

// Convert dd/MM/yyyy to ISO (yyyy-MM-dd) for backend
export function belgianToIso(str){
  const d = parseBelgianDate(str); if(!d) return null;
  const M = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${d.getFullYear()}-${M}-${day}`;
}

// Convert ISO (yyyy-MM-dd) to dd/MM/yyyy
export function isoToBelgian(str){
  if(!str) return '';
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return str;
  return `${m[3]}/${m[2]}/${m[1]}`;
}
