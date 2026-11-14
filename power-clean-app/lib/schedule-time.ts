export const SERVICE_TIME_ZONE = 'America/New_York';
export function serviceLocalTime(value: string | null): string {
  if (!value) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:SERVICE_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value));
  const part = (name:string) => parts.find(p=>p.type===name)?.value;
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}
// Resolve Eastern wall time explicitly; reject nonexistent DST times instead of shifting them.
export function serviceTimeToIso(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const wall = Date.parse(value+'Z');
  if (!Number.isFinite(wall)) return null;
  for (const hours of [4,5]) {
    const candidate = new Date(wall+hours*3600000).toISOString();
    if (serviceLocalTime(candidate)===value) return candidate;
  }
  return null;
}
