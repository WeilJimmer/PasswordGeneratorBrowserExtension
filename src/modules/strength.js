// strength.js
// Author: Salvia AI
// Description: Pure functions for password strength metering (charset building,
// entropy calculation, crack-time estimation). Shared by popup.js (display) and
// background.js (generation) so the meter always reflects the charset the
// generator actually used. No DOM / chrome API access — unit-testable in jest.

export const GUESSES_PER_SECOND = 20e9; // ~20 billion guesses/sec (modern GPU)

const DIGITS = '0123456789';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';

/**
 * Build the charset string exactly the way background.js assembles it.
 * Note: an enabled symbols checkbox with an empty symbols field adds NOTHING
 * (no fallback to a default symbol set) — matching the generator's behaviour.
 */
export function buildCharset(map) {
    let charset = '';
    if (map.numbersChecked) charset += DIGITS;
    if (map.uppercaseChecked) charset += UPPER;
    if (map.lowercaseChecked) charset += LOWER;
    if (map.symbolsChecked) charset += map.symbols || '';
    return charset;
}

/** Unique character count of a charset string (unicode-safe). */
export function charsetSize(charset) {
    return new Set([...charset]).size;
}

/**
 * Per-character Shannon entropy of a charset WITH duplicates, in bits.
 * The generator draws uniformly from the full charset string, so a character
 * listed m times is m times as likely; deduplicating would overestimate.
 *   N = charset.length, m_i = occurrences of the i-th distinct char
 *   H = log2(N) - (1/N) * sum(m_i * log2(m_i))
 * No duplicates -> H = log2(N) (identical to the old unique-count formula).
 */
export function perCharEntropy(charset) {
    const n = charset.length;
    if (n <= 1) return 0;
    const counts = new Map();
    for (const ch of charset) counts.set(ch, (counts.get(ch) || 0) + 1);
    let reduction = 0;
    for (const m of counts.values()) {
        if (m > 1) reduction += m * Math.log2(m);
    }
    return Math.log2(n) - reduction / n;
}

/** Shannon entropy in bits for a uniformly drawn password. */
export function calcEntropy(size, length) {
    if (!Number.isFinite(size) || !Number.isFinite(length)) return 0;
    if (size <= 1 || length <= 0) return 0;
    return length * Math.log2(size);
}

/**
 * Map entropy to a strength level + meter percentage.
 * Thresholds kept identical to the original popup implementation.
 */
export function strengthLevel(entropy) {
    let percent = 0;
    if (entropy >= 15) percent = 15;
    if (entropy >= 28) percent = 30;
    if (entropy >= 40) percent = 50;
    if (entropy >= 60) percent = 70;
    if (entropy >= 80) percent = 85;
    if (entropy >= 100) percent = 100;

    let level;
    if (percent < 30) level = 'weak';
    else if (percent < 50) level = 'fair';
    else if (percent < 70) level = 'good';
    else if (percent < 85) level = 'strong';
    else level = 'excellent';

    return { level, percent };
}

/**
 * Average-case brute-force crack time from entropy, expressed as
 * { value: <number>, unit: <i18n key> } or { unit: 'crack_lt_1ms' } /
 * { unit: 'crack_gt_1000y' } for the two open-ended ends.
 *
 * Units are returned as i18n KEYS so the caller translates them; the value is
 * rounded per unit and re-checked against the threshold, so a value that
 * rounds up (e.g. 999.6ms -> 1000ms) is promoted to the next unit instead of
 * displaying "1000ms" / "60min" / "1000y".
 */
export function crackTimeParts(entropy) {
    // log2(avg seconds) = entropy - log2(guessesPerSecond) - 1 (halve for average)
    const log2Seconds = entropy - Math.log2(GUESSES_PER_SECOND) - 1;

    const units = [
        { limit: 1,                 scale: 1 / 1000, key: 'unit_ms',   digits: 0 },
        { limit: 60,                scale: 1,        key: 'unit_s',    digits: 1 },
        { limit: 3600,              scale: 60,       key: 'unit_min',  digits: 0 },
        { limit: 86400,             scale: 3600,     key: 'unit_h',    digits: 0 },
        { limit: 86400 * 365,       scale: 86400,    key: 'unit_d',    digits: 0 },
        { limit: 86400 * 365 * 1e3, scale: 86400 * 365, key: 'unit_y', digits: 0 },
    ];

    if (log2Seconds < Math.log2(0.001)) return { unit: 'crack_lt_1ms' };

    const seconds = 2 ** log2Seconds;
    for (const u of units) {
        if (seconds < u.limit) {
            const scaled = seconds / u.scale;
            const factor = 10 ** u.digits;
            const rounded = Math.round(scaled * factor) / factor;
            // Rounding pushed us over the threshold: re-evaluate in the next unit.
            if (rounded >= u.limit / u.scale) continue;
            return { value: rounded, unit: u.key };
        }
    }
    return { unit: 'crack_gt_1000y' };
}

/**
 * Top-level scoring entry for the popup: returns null when the meter must NOT
 * be updated (background reported an error), otherwise the full breakdown.
 * checksum 'RANDOM' = random generator, anything else = derived (HMAC) mode.
 */
export function evaluateStrength(map, checksum) {
    if (checksum === 'ERROR' || map == null) return null;
    const charset = buildCharset(map);
    const size = charsetSize(charset);
    const length = Number(map.pwlength) || 0;
    // Entropy accounts for duplicate chars in the charset (weighted draw),
    // falling back to length * log2(size) when there are none.
    const entropy = size > 1 && length > 0 ? perCharEntropy(charset) * length : 0;
    const { level, percent } = strengthLevel(entropy);
    return {
        entropy,
        level,
        percent,
        charsetSize: size,
        length,
        derived: checksum !== 'RANDOM',
    };
}
