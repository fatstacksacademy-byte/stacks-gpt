/**
 * util — number parsing + count-up formatting, ported 1:1 from motion-gfx.py so a
 * Remotion graphic counts up identically to the Python card ("$1,500" springs from $0,
 * "1.5¢" keeps two decimals, "100,000 pts" keeps the suffix).
 */

/** Parse "$1,500" / "1.5¢ / pt" / "100,000 pts" → {prefix, value, suffix}. value=null if no number. */
export function numParts(s: string): { prefix: string; value: number | null; suffix: string } {
  const m = s.match(/[\d,]+(?:\.\d+)?/);
  if (!m || m.index === undefined) return { prefix: s, value: null, suffix: "" };
  return {
    prefix: s.slice(0, m.index),
    value: parseFloat(m[0].replace(/,/g, "")),
    suffix: s.slice(m.index + m[0].length),
  };
}

/**
 * Render a count-up value the way motion-gfx.py does: thousands-separated, with 2
 * decimals only when the FINAL value is fractional (so "$1,500" never shows "$1,500.00"
 * but "1.5¢" animates through "0.83¢" cleanly).
 */
export function formatCountUp(target: string, progress: number): string {
  const { prefix, value, suffix } = numParts(target);
  if (value === null) return target; // non-numeric (e.g. "FREE") — show as-is
  const dec = value !== Math.trunc(value) ? 2 : 0;
  const cur = value * Math.max(0, Math.min(1, progress));
  const body =
    dec > 0
      ? cur.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec })
      : Math.round(cur).toLocaleString("en-US");
  return `${prefix}${body}${suffix}`;
}
