/**
 * Safely parses any date/timestamp representation to epoch milliseconds.
 * Supports Firestore Timestamp (toMillis / seconds / toDate), JS Date, ISO strings, numbers.
 */
export function getTimestampMillis(val: any): number {
 if (!val) return 0;
 if (typeof val === 'number') {
 return isNaN(val) ? 0 : val;
 }
 if (typeof val?.toMillis === 'function') {
 try {
 return val.toMillis();
 } catch {
 return 0;
 }
 }
 if (typeof val?.toDate === 'function') {
 try {
 return val.toDate().getTime();
 } catch {
 return 0;
 }
 }
 if (typeof val?.seconds === 'number') {
 const millis = val.seconds * 1000 + (typeof val.nanoseconds === 'number' ? Math.floor(val.nanoseconds / 1000000) : 0);
 return isNaN(millis) ? 0 : millis;
 }
 if (val instanceof Date) {
 return val.getTime();
 }
 if (typeof val === 'string') {
 const parsed = Date.parse(val);
 return isNaN(parsed) ? 0 : parsed;
 }
 return 0;
}

/**
 * Format a date/timestamp safely with a fallback.
 */
export function formatSafeDate(val: any, locale = 'en-US'): string {
 const millis = getTimestampMillis(val);
 if (!millis) return '';
 return new Date(millis).toLocaleDateString(locale);
}
