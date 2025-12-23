const BASE_URL = process.env.MAILHOG_URL || 'http://localhost:8025';
const FRONTEND_BASE_URL = process.env.FRONTEND_URL || 'http://localhost:8081';

const RE_URL = /(https?:\/\/[^\s"'<>]+\/reset-password\?token=([A-Za-z0-9._~-]+))/i;
const RE_HREF = /href\s*=\s*["']([^"']*\/reset-password\?token=([A-Za-z0-9._~-]+)[^"']*)["']/i;
const RE_PATH = /(\/reset-password\?token=([A-Za-z0-9._~-]+))/i;
const RE_TOKEN = /reset-password(?:%3F|\?)token(?:%3D|=)([A-Za-z0-9._~-]+)/i;

function normalizeEmailBody(s = '') {
  return String(s)
    .replace(/=\r?\n/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#x3D;|&#61;/g, '=')
    .replace(/&#x3F;|&#63;/g, '?')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function maskToken(token = '') {
  const value = String(token);
  if (!value) return '';
  const keep = Math.max(2, Math.floor(value.length * 0.3));
  const shown = value.slice(0, keep);
  const masked = '*'.repeat(Math.max(value.length - keep, keep));
  return `${shown}${masked}`;
}

function maskTokensInText(input = '') {
  return String(input).replace(/(token(?:%3D|=))([A-Za-z0-9._~-]{3})([A-Za-z0-9._~-]*)/gi, (_, prefix, start, rest) => {
    const token = `${start}${rest}`;
    return `${prefix}${maskToken(token)}`;
  });
}

function extractResetUrlAndToken(bodyRaw, baseUrl = 'http://localhost:8081') {
  const body = normalizeEmailBody(bodyRaw);
  const candidates = [RE_URL, RE_HREF, RE_PATH, RE_TOKEN];

  for (const re of candidates) {
    const match = body.match(re);
    if (!match) continue;

    if (re === RE_TOKEN) {
      const token = match[1];
      return { resetUrl: `${baseUrl}/reset-password?token=${token}`, token };
    }

    if (re === RE_PATH) {
      const token = match[2];
      return { resetUrl: `${baseUrl}${match[1]}`, token };
    }

    if (re === RE_URL || re === RE_HREF) {
      const token = match[2];
      const url = match[1];
      return { resetUrl: url, token };
    }
  }

  return { resetUrl: null, token: null };
}

async function fetchMessages() {
  const res = await fetch(`${BASE_URL}/api/v2/messages`);
  if (!res.ok) throw new Error(`MailHog status ${res.status}`);
  return res.json();
}

function isToAddress(message, email) {
  const target = (email || '').toLowerCase();
  const headerTo = (message?.Content?.Headers?.To || []).join(',').toLowerCase();
  return target && headerTo.includes(target);
}

  async function waitForMail({ to, subjectSubstring = '', timeoutMs = 120000, pollMs = 2000, baseUrl = FRONTEND_BASE_URL } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const payload = await fetchMessages();
    const items = payload?.items || [];
    const hit = items.find((msg) => {
      const matchesTo = isToAddress(msg, to);
      const subject = (msg?.Content?.Headers?.Subject || []).join(' ');
      const matchesSubject = subjectSubstring ? subject.includes(subjectSubstring) : true;
      return matchesTo && matchesSubject;
    });
    if (hit) {
      const bodyRaw = hit?.Content?.Body || '';
      const { resetUrl, token } = extractResetUrlAndToken(bodyRaw, baseUrl);
      if (!resetUrl) {
        const excerpt = maskTokensInText(normalizeEmailBody(bodyRaw)).slice(0, 500);
        console.error('RESET_LINK_NOT_FOUND', { to, subject: (hit?.Content?.Headers?.Subject || []).join(' '), excerpt });
        throw new Error('RESET_LINK_NOT_FOUND');
      }
      return {
        subject: (hit?.Content?.Headers?.Subject || []).join(' '),
        resetUrl,
        token,
        raw: hit,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
  throw new Error(`No email for ${to} in MailHog within ${timeoutMs}ms`);
}

module.exports = { waitForMail, normalizeEmailBody, extractResetUrlAndToken, maskToken };
