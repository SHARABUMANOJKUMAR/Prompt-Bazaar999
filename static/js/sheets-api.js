/**
 * sheets-api.js — Centralized Google Sheets Data Service
 * Prompt Bazaar Admin Portal
 *
 * Strategy: Try WebApp JSON first → Fall back to CSV on failure.
 * All three sources fetched in parallel via Promise.all().
 * In-memory cache with 20-second TTL prevents redundant requests.
 * Field names are auto-normalized from any column naming convention.
 */

// =====================================================================
// DATA SOURCE CONFIGURATION
// =====================================================================
const SHEETS_CONFIG = {
  prompts: {
    csv:    'https://docs.google.com/spreadsheets/d/13JuiTUHecX4js1CRGWSFYBsh6-0EJk0C5hzV0QV681M/export?format=csv&gid=0',
    webapp: 'https://script.google.com/macros/s/AKfycbx17A9cGKQk70Uf1ysoYqBjjBxfDcyMywNtA7-PaAflmff_hFp9C3mQjS4K7qZk_Wsb/exec'
  },
  users: {
    csv:    'https://docs.google.com/spreadsheets/d/1JsulLVYcmUrH3MwAV5l0nr4fwXRXVqHcjsz_b8IrQqI/export?format=csv&gid=0',
    webapp: 'https://script.google.com/macros/s/AKfycby92lgxoV3RgYwn6hIj1A7ErMlqXwxAyCSXajDO2Zc4x9a9jR-wnU9DQWdUxdMVDtTn/exec'
  },
  payments: {
    csv:    'https://docs.google.com/spreadsheets/d/18FeOjGDIkd5dZpYhLrdRNKdFOQIJJuQDq1LzPENFj3Y/export?format=csv&gid=0',
    webapp: 'https://script.google.com/macros/s/AKfycbyifHkwPbUjkptWjhWT--FmcKBivrsJEGarfEALgf6GLY_S-8y8VvtehVSlSjy7DWs_/exec'
  }
};

const CACHE_TTL = 20_000; // 20 seconds

// In-memory cache — survives tab navigation without hitting network
const _cache = {};

// =====================================================================
// CSV PARSER  (RFC 4180 compliant — handles quoted commas & newlines)
// =====================================================================
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { // escaped quote ""
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  values.push(current);
  return values;
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h =>
    h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
  );

  return lines
    .slice(1)
    .filter(l => l.trim())
    .map(line => {
      const values = parseCSVLine(line);
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = (values[i] || '').trim().replace(/^"|"$/g, '');
      });
      return obj;
    })
    .filter(row => Object.values(row).some(v => v.length > 0));
}

// =====================================================================
// WEBAPP RESPONSE NORMALIZER
// Handles any JSON shape: array, {data:[]}, {records:[]}, etc.
// =====================================================================
function normalizeWebAppResponse(raw) {
  if (Array.isArray(raw)) return raw;
  for (const key of ['data', 'records', 'rows', 'results', 'items', 'values']) {
    if (raw[key] && Array.isArray(raw[key])) return raw[key];
  }
  // Single object wrapped - unwrap
  const vals = Object.values(raw);
  if (vals.length === 1 && Array.isArray(vals[0])) return vals[0];
  return [];
}

// =====================================================================
// KEY NORMALIZER  (any column naming → snake_case)
// =====================================================================
function normalizeKeys(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const nk = k.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    out[nk] = typeof v === 'string' ? v.trim() : (v ?? '');
  }
  return out;
}

// =====================================================================
// FETCH WITH FALLBACK  (WebApp JSON → CSV)
// =====================================================================
async function fetchSource(key) {
  const { csv, webapp } = SHEETS_CONFIG[key];
  const cacheKey = `_pb_${key}`;

  // Serve from memory cache if fresh
  if (_cache[cacheKey] && (Date.now() - _cache[cacheKey].ts < CACHE_TTL)) {
    return _cache[cacheKey].data;
  }

  let data = [];

  // 1. Try WebApp (returns JSON)
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${webapp}?t=${Date.now()}`, { signal: ctrl.signal });
    clearTimeout(tid);

    if (res.ok) {
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        data = normalizeWebAppResponse(json).map(normalizeKeys);
      } catch {
        // WebApp returned plain text / CSV-formatted response
        if (text.includes(',') && text.includes('\n')) {
          data = parseCSV(text);
        }
      }
    }
  } catch (err) {
    console.warn(`[SheetsAPI] WebApp unavailable for "${key}":`, err.message || err);
  }

  // 2. CSV fallback
  if (data.length === 0) {
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(`${csv}&t=${Date.now()}`, { signal: ctrl.signal });
      clearTimeout(tid);
      if (res.ok) {
        data = parseCSV(await res.text());
      }
    } catch (err) {
      console.error(`[SheetsAPI] CSV also failed for "${key}":`, err.message || err);
    }
  }

  _cache[cacheKey] = { data, ts: Date.now() };
  return data;
}

// =====================================================================
// FIELD NORMALIZERS  (map any column name variant → canonical fields)
// =====================================================================
function normalizePayment(p) {
  return {
    payment_id:     p.payment_id     || p.razorpay_payment_id || p.pay_id       || p.id          || '',
    order_id:       p.order_id       || p.razorpay_order_id   || p.order        || '',
    user_email:     p.user_email     || p.email               || p.customer_email || p.buyer_email || '',
    prompt_title:   p.prompt_title   || p.item_name           || p.description  || p.title       || p.product || '',
    amount:         parseFloat(p.amount || p.total_amount || p.price || 0) || 0,
    currency:       p.currency       || 'INR',
    payment_status: p.payment_status || p.status              || p.state        || '',
    payment_method: p.payment_method || p.method              || p.gateway      || 'Razorpay',
    created_at:     p.created_at     || p.timestamp           || p.date         || p.paid_at     || ''
  };
}

function normalizeUser(u) {
  return {
    user_id:        u.user_id        || u.id     || u.uid           || '',
    full_name:      u.full_name      || u.name   || u.display_name  || u.username || '',
    email:          u.email          || '',
    mobile_number:  u.mobile_number  || u.phone  || u.mobile        || u.contact  || '',
    login_provider: u.login_provider || u.provider || u.auth_provider || 'Email',
    created_at:     u.created_at     || u.registration_date || u.joined_at || u.signup_date || '',
    last_login:     u.last_login     || u.last_seen || u.last_active || '',
    account_status: u.account_status || u.status || 'Active'
  };
}

function normalizePrompt(p) {
  return {
    prompt_id:   p.prompt_id || p.id            || '',
    title:       p.title     || p.name          || p.prompt_name  || '',
    category:    p.category  || p.type          || '',
    platform:    p.platform  || p.ai_platform   || '',
    price:       parseFloat(p.price || p.cost   || 0) || 0,
    image_url:   p.image_url || p.image         || p.thumbnail    || '',
    prompt_text: p.prompt_text || p.text        || p.content      || p.prompt || '',
    created_at:  p.created_at  || p.date        || p.added_at     || ''
  };
}

// =====================================================================
// DEDUPLICATION
// =====================================================================
function deduplicateBy(arr, idFn) {
  const seen = new Set();
  return arr.filter(item => {
    const id = idFn(item);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

// =====================================================================
// PUBLIC API
// =====================================================================

/**
 * Fetch all three data sources in parallel.
 * @param {boolean} force - Bypass cache when true
 * @returns {Promise<{prompts: Array, users: Array, payments: Array}>}
 */
export async function fetchAllData(force = false) {
  if (force) {
    Object.keys(_cache).forEach(k => delete _cache[k]);
  }

  const [rawPrompts, rawUsers, rawPayments] = await Promise.all([
    fetchSource('prompts'),
    fetchSource('users'),
    fetchSource('payments')
  ]);

  const prompts = rawPrompts
    .map(normalizePrompt)
    .filter(p => p.title);

  const users = rawUsers
    .map(normalizeUser)
    .filter(u => u.email || u.user_id);

  // Deduplicate by payment_id, sort newest first
  const payments = deduplicateBy(
    rawPayments
      .map(normalizePayment)
      .filter(p => p.payment_id || p.user_email)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    p => p.payment_id
  );

  return { prompts, users, payments };
}

/**
 * Lightweight hash for change detection — avoids redundant re-renders.
 * @param {{prompts: Array, users: Array, payments: Array}} data
 * @returns {number}
 */
export function computeHash(data) {
  const str = [
    data.prompts.length,
    data.users.length,
    data.payments.length,
    data.payments[0]?.payment_id  || '',
    data.payments[0]?.amount      || 0
  ].join('|');
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return h;
}
