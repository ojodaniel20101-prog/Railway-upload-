/**server.js — ZENTRIX_MD Web Pairing Server
 * Serves main.html and exposes /api/pairing endpoints that hook into sessionManager.
 */

import http from 'http';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { sessionManager } from '../core/sessionManager.js';
import logger from '../utils/logger.js';
import { createUser, validateUser, getPrefixForSession, setPrefixForSession, getBotNameForSession, setBotNameForSession, clearBotNameForSession, getFontForSession, setFontForSession, VALID_FONTS } from '../services/databaseService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML_PATH = path.join(__dirname, 'main.html');
const PORT = process.env.WEB_PORT || 3000;
const BOOT_TIME = Date.now();

// ── Helpers ───────────────────────────────────────────────────────────────────

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-user-uid',
  });
  res.end(body);
}

function sanitizePhone(raw) {
  return raw.replace(/[^\d]/g, '');
}

// ── FIXED: strict ownership — unauthenticated callers always denied ────────────
function isSessionOwner(req, sessionId) {
  const callerUid = req.headers['x-user-uid'] || null;
  const sess = sessionManager.getSession(sessionId);
  if (!sess) return false;

  // No caller UID = unauthenticated → deny always
  if (!callerUid) return false;

  // Session has no owner yet → allow (ownership assigned on createSession)
  if (!sess.ownerUid) return true;

  return sess.ownerUid === callerUid;
}

// ── Route handlers ────────────────────────────────────────────────────────────

// ── FIXED: require auth + block cross-user pairing ────────────────────────────
async function handleInitiate(req, res) {
  let body;
  try { body = await readBody(req); }
  catch { return json(res, 400, { success: false, message: 'Invalid request body.' }); }

  const raw = body.phoneNumber || '';
  const phone = sanitizePhone(raw);

  if (!phone || phone.length < 7) {
    return json(res, 400, { success: false, message: 'Invalid phone number.' });
  }

  const ownerUid = req.headers['x-user-uid'] || null;

  // Require authentication to pair
  if (!ownerUid) {
    return json(res, 401, { success: false, message: 'Authentication required to pair a session.' });
  }

  if (sessionManager.isSessionActive(phone)) {
    const existing = sessionManager.getSession(phone);

    // Block a different user from re-pairing someone else's number
    if (existing?.ownerUid && existing.ownerUid !== ownerUid) {
      return json(res, 403, { success: false, message: 'This number is already paired by another account.' });
    }

    if (existing?.pairingCode) {
      return json(res, 200, {
        success: true,
        pairingCode: existing.pairingCode,
        sessionId: phone,
        message: 'Session already initializing — use existing code.',
      });
    }
    return json(res, 200, {
      success: true,
      pairingCode: null,
      sessionId: phone,
      message: 'Already connected.',
      alreadyPaired: true,
    });
  }

  logger.system(`[Web] Pairing request for ${phone} by uid=${ownerUid}`);
  const result = await sessionManager.createSession(phone, null, ownerUid);

  if (!result.success) {
    return json(res, 500, { success: false, message: result.message });
  }

  let code = result.pairingCode;
  if (!code) {
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 500));
      code = sessionManager.getSession(phone)?.pairingCode || null;
      if (code) break;
    }
  }

  if (!code) {
    return json(res, 202, {
      success: true,
      pairingCode: null,
      sessionId: phone,
      message: 'Session started — poll /api/pairing/status for code.',
    });
  }

  return json(res, 200, { success: true, pairingCode: code, sessionId: phone });
}

// ── FIXED: only owner can poll their session status ───────────────────────────
function handleStatus(req, res) {
  const url = new URL(req.url, `http://localhost`);
  const phone = sanitizePhone(url.searchParams.get('sessionId') || '');
  const callerUid = req.headers['x-user-uid'] || null;

  if (!phone) {
    return json(res, 400, { isPaired: false, message: 'Missing sessionId.' });
  }

  const session = sessionManager.getSession(phone);

  if (!session) {
    return json(res, 200, { isPaired: false, pairingCode: null });
  }

  // Block access if session belongs to a different user
  if (session.ownerUid && session.ownerUid !== callerUid) {
    return json(res, 403, { isPaired: false, message: 'Access denied.' });
  }

  const isPaired = sessionManager.isSessionActive(phone) && !session.pairingCode;

  return json(res, 200, {
    isPaired,
    pairingCode: session.pairingCode || null,
    active: sessionManager.isSessionActive(phone),
  });
}

// ── Server ────────────────────────────────────────────────────────────────────

export function startWebServer() {
  let html;
  try {
    html = readFileSync(HTML_PATH, 'utf8');
  } catch {
    logger.error('[Web] main.html not found at ' + HTML_PATH);
    return;
  }

  const server = http.createServer(async (req, res) => {
    const { method } = req;
    const url = req.url.replace(/\/\/+/g, '/').split('?')[0];

    // CORS preflight
    if (method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' });
      return res.end();
    }

    // Serve the portal
    if (method === 'GET' && (url === '/' || url === '/index.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }

    // Auth routes
    if (method === 'POST' && url === '/api/auth/register') {
      const body = await readBody(req);
      const { username, password } = body;
      if (!username || !password) return json(res, 400, { success: false, message: 'Missing fields' });
      const result = createUser(username, password);
      return json(res, result.success ? 200 : 400, result);
    }

    if (method === 'POST' && url === '/api/auth/login') {
      const body = await readBody(req);
      const { username, password } = body;
      if (validateUser(username, password)) {
        return json(res, 200, { success: true });
      }
      return json(res, 401, { success: false, message: 'Invalid credentials' });
    }

    if (method === 'POST' && url === '/api/pairing/initiate') {
      return handleInitiate(req, res);
    }

    if (method === 'GET' && url?.startsWith('/api/pairing/status')) {
      return handleStatus(req, res);
    }

    if (method === 'GET' && url === '/api/stats') {
      const callerUid = req.headers['x-user-uid'] || null;
      if (!callerUid) return json(res, 401, { error: 'Unauthorized' });

      // Aggregate stats for sessions owned by this user
      const userSessions = Array.from(sessionManager.sessions.values())
        .filter(sess => sess.ownerUid === callerUid);

      const stats = {
        totalCommands: userSessions.reduce((sum, s) => sum + (s.commandCount || 0) + (s.errorCount || 0), 0),
        commandsRan: userSessions.reduce((sum, s) => sum + (s.commandCount || 0), 0),
        commandsFailed: userSessions.reduce((sum, s) => sum + (s.errorCount || 0), 0),
        totalMessages: userSessions.reduce((sum, s) => sum + (s.messageCount || 0), 0),
        bootTime: BOOT_TIME,
      };

      return json(res, 200, stats);
    }

    if (method === 'GET' && url === '/api/commands/log') {
      const callerUid = req.headers['x-user-uid'] || null;
      if (!callerUid) return json(res, 401, { log: [], error: 'Unauthorized' });

      // Filter global command log to only show commands from sessions owned by this user
      const userSessions = Array.from(sessionManager.sessions.entries())
        .filter(([id, sess]) => sess.ownerUid === callerUid)
        .map(([id, sess]) => '+' + id);

      const filteredLog = sessionManager.commandLog.filter(entry => 
        userSessions.includes(entry.session) || entry.session === null
      );

      return json(res, 200, { log: filteredLog });
    }

    // ── FIXED: strict per-user session filtering ──────────────────────────────
    if (method === 'GET' && url === '/api/sessions/list') {
      const callerUid = req.headers['x-user-uid'] || null;

      // Unauthenticated requests get nothing
      if (!callerUid) {
        return json(res, 401, { sessions: [], error: 'Unauthorized' });
      }

      const sessions = Array.from(sessionManager.sessions.entries())
        .filter(([id, sess]) => sess.ownerUid === callerUid) // strictly owned sessions only
        .map(([id, sess]) => ({
          id,
          phone: '+' + id,
          status: sessionManager.isSessionActive(id) ? 'online' : 'offline',
          cmds: sess.commandCount || 0,
          errors: sess.errorCount || 0,
          msgs: sess.messageCount || 0,
          uptime: sess.createdAt ? formatUptime(Date.now() - sess.createdAt) : '—',
          platform: 'WhatsApp',
          mode: sess.commandMode || 'public',
          prefix: getPrefixForSession(id),
          botName: getBotNameForSession(id),
          font: getFontForSession(id),
        }));

      return json(res, 200, { sessions });
    }

    // GET /api/sessions/:id/groupsdebug
    if (method === 'GET' && url.match(/^\/api\/sessions\/[^\/]+\/groupsdebug$/)) {
      const id = sanitizePhone(url.split('/')[3]);
      const sess = sessionManager.getSession(id);
      if (!sess?.sock) return json(res, 404, { error: 'Session not found' });
      try {
        const raw = await sess.sock.groupFetchAllParticipating();
        const sockUserId = sess.sock.user?.id || '';
        const botBareNumber = sockUserId.split('@')[0].split(':')[0];
        const sample = Object.values(raw).slice(0, 3).map(g => ({
          name: g.subject,
          announce: g.announce,
          botSockUserId: sockUserId,
          botBareNumber,
          participants: g.participants?.map(p => ({
            id: p.id,
            admin: p.admin,
            bare: p.id.split('@')[0].split(':')[0],
            isLid: p.id.includes('@lid'),
          }))
        }));
        return json(res, 200, { sample });
      } catch(e) {
        return json(res, 500, { error: e.message });
      }
    }

    // GET /api/sessions/:id/profilepic
    if (method === 'GET' && url.match(/^\/api\/sessions\/[^\/]+\/profilepic$/)) {
      const id = sanitizePhone(url.split('/')[3]);
      const sess = sessionManager.getSession(id);
      if (!sess?.sock) return json(res, 404, { url: null, name: null });
      try {
        const jid = sess.sock.user?.id || (id + '@s.whatsapp.net');
        const waName = sess.sock.user?.name || sess.sock.user?.verifiedName || null;
        const picUrl = await sess.sock.profilePictureUrl(jid, 'image').catch(() => null);
        return json(res, 200, { url: picUrl || null, name: waName || null });
      } catch (e) {
        return json(res, 200, { url: null, name: null });
      }
    }

    // GET /api/sessions/:id/groups
    if (method === 'GET' && url.match(/^\/api\/sessions\/[^\/]+\/groups$/)) {
      const id = sanitizePhone(url.split('/')[3]);
      const sess = sessionManager.getSession(id);
      if (!sess || !sess.sock) return json(res, 404, { groups: [] });
      try {
        const raw = await sess.sock.groupFetchAllParticipating();
        const sockUserId = sess.sock.user?.id || '';
        const botBareNumber = sockUserId.split('@')[0].split(':')[0];
        const botLidSet = new Set();
        try {
          const botLid = sess.sock.user?.lid;
          if (botLid) botLidSet.add(botLid.split('@')[0].split(':')[0]);
        } catch(_) {}

        const groups = Object.values(raw).map(g => {
          const allParticipants = g.participants || [];

          let botParticipant = allParticipants.find(p => {
            const pBare = p.id.split('@')[0].split(':')[0];
            return pBare === botBareNumber;
          });

          if (!botParticipant) {
            botParticipant = allParticipants.find(p => {
              if (!p.id.includes('@lid')) return false;
              const pBare = p.id.split('@')[0].split(':')[0];
              if (botLidSet.has(pBare)) return true;
              if (typeof sess.sock.getPNForLID === 'function') {
                try {
                  const resolved = sess.sock.getPNForLID(p.id);
                  if (resolved && resolved.replace(/[^0-9]/g, '').includes(botBareNumber)) return true;
                } catch(_) {}
              }
              return false;
            });
          }

          if (!botParticipant) {
          const allLid = allParticipants.every(p => p.id.includes('@lid'));
            if (allLid) {
              const admins = allParticipants.filter(p => p.admin === 'admin' || p.admin === 'superadmin');
              if (admins.length === 1) botParticipant = admins[0];
            }
          }

          const isAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';
          const announce = g.announce === true || g.announce === 'true';
          return {
            id: g.id,
            name: g.subject || 'Unknown',
            participants: g.participants?.length || 0,
            isAdmin,
            isMuted: announce,
          };
        }).sort((a, b) => b.participants - a.participants);
        return json(res, 200, { groups });
      } catch (e) {
        return json(res, 500, { groups: [], error: e.message });
      }
    }

    // POST /api/sessions/:id/mode
    if (method === 'POST' && url.match(/^\/api\/sessions\/[^\/]+\/mode$/)) {
      const id = sanitizePhone(url.split('/')[3]);
      if (!isSessionOwner(req, id)) return json(res, 403, { success: false, message: 'Not your session.' });
      const body = await readBody(req);
      const mode = body.mode === 'self' ? 'self' : 'public';
      const sess = sessionManager.getSession(id);
      if (!sess) return json(res, 404, { success: false, message: 'Session not found' });
      sessionManager.setSessionMetadata(id, { commandMode: mode });
      try {
        const { updateGroupSettings } = await import('../services/databaseService.js');
        updateGroupSettings(id, { system: { mode } });
      } catch (_) {}
      logger.system(`[Web] Mode for ${id} set to ${mode.toUpperCase()}`);
      return json(res, 200, { success: true, mode });
    }

    // POST /api/sessions/:id/prefix
    if (method === 'POST' && url.match(/^\/api\/sessions\/[^\/]+\/prefix$/)) {
      const id = sanitizePhone(url.split('/')[3]);
      if (!isSessionOwner(req, id)) return json(res, 403, { success: false, message: 'Not your session.' });
      const body = await readBody(req);
      const prefix = (body.prefix || '').trim();
      if (!prefix) return json(res, 400, { success: false, message: 'Prefix cannot be empty.' });
      const sess = sessionManager.getSession(id);
      if (!sess) return json(res, 404, { success: false, message: 'Session not found.' });
      setPrefixForSession(id, prefix);
      logger.system(`[Web] Prefix for ${id} set to "${prefix}"`);
      return json(res, 200, { success: true, prefix });
    }

    // POST /api/sessions/:id/groups/:groupId/action
    if (method === 'POST' && url.match(/^\/api\/sessions\/[^\/]+\/groups\/[^\/]+\/action$/)) {
      const parts = url.split('/');
      const id = sanitizePhone(parts[3]);
      const groupId = decodeURIComponent(parts[5]);
      const body = await readBody(req);
      const { action, message } = body;
      const sess = sessionManager.getSession(id);
      if (!sess?.sock) return json(res, 404, { success: false, message: 'Session not found or offline.' });
      try {
        if (action === 'mute') {
          await sess.sock.groupSettingUpdate(groupId, 'announcement');
        } else if (action === 'unmute') {
          await sess.sock.groupSettingUpdate(groupId, 'not_announcement');
        } else if (action === 'tagall') {
          const metadata = await sess.sock.groupMetadata(groupId);
          const participants = metadata.participants;
          const mentions = participants.map(p => p.id);
          const text = (message || 'Attention everyone!') + '\n\n' + participants.map(p => `@${p.id.split('@')[0]}`).join(' ');
          await sess.sock.sendMessage(groupId, { text, mentions });
        } else {
          return json(res, 400, { success: false, message: 'Unknown action.' });
        }
        logger.system(`[Web] Group action "${action}" on ${groupId} by session ${id}`);
        return json(res, 200, { success: true });
      } catch (e) {
        return json(res, 500, { success: false, message: e.message });
      }
    }

    // POST /api/sessions/:id/reconnect
    if (method === 'POST' && url.match(/^\/api\/sessions\/[^\/]+\/reconnect$/)) {
      const id = sanitizePhone(url.split('/')[3]);
      if (sessionManager.isSessionActive(id)) {
        return json(res, 200, { success: true, message: 'Session already active.' });
      }
      if (!sessionManager.sessions.has(id)) {
        return json(res, 404, { success: false, message: 'Session not found. Re-pair required.' });
      }
      try {
        logger.system(`[Web] Manual reconnect triggered for ${id}`);
        sessionManager.createSession(id, sessionManager.getSession(id)?.telegramChatId || null, sessionManager.getSession(id)?.ownerUid || null);
        return json(res, 200, { success: true, message: 'Reconnecting...' });
      } catch (e) {
        return json(res, 500, { success: false, message: e.message });
      }
    }

    // POST /api/sessions/:id/botname
    if (method === 'POST' && url.match(/^\/api\/sessions\/[^\/]+\/botname$/)) {
      const id = sanitizePhone(url.split('/')[3]);
      if (!isSessionOwner(req, id)) return json(res, 403, { success: false, message: 'Not your session.' });
      const body = await readBody(req);
      const name = (body.name || '').trim();
      const sess = sessionManager.getSession(id);
      if (!sess) return json(res, 404, { success: false, message: 'Session not found.' });
      if (!name) {
        clearBotNameForSession(id);
        logger.system(`[Web] Bot name cleared for ${id}`);
        return json(res, 200, { success: true, botName: getBotNameForSession(id) });
      }
      if (name.length > 24) return json(res, 400, { success: false, message: 'Name too long (max 24 chars).' });
      setBotNameForSession(id, name);
      logger.system(`[Web] Bot name for ${id} set to "${name}"`);
      return json(res, 200, { success: true, botName: getBotNameForSession(id) });
    }

    // POST /api/sessions/:id/font
    if (method === 'POST' && url.match(/^\/api\/sessions\/[^\/]+\/font$/)) {
      const id = sanitizePhone(url.split('/')[3]);
      const body = await readBody(req);
      const font = (body.font || '').trim();
      if (!VALID_FONTS.includes(font)) returnjson(res, 400, { success: false, message: `Invalid font. Valid: ${VALID_FONTS.join(', ')}` });
      const sess = sessionManager.getSession(id);
      if (!sess) return json(res, 404, { success: false, message: 'Session not found.' });
      setFontForSession(id, font);
      logger.system(`[Web] Font for ${id} set to "${font}"`);
      return json(res, 200, { success: true, font });
    }

    // POST /api/sessions/:id/broadcast
    if (method === 'POST' && url.match(/^\/api\/sessions\/[^\/]+\/broadcast$/)) {
      const id = sanitizePhone(url.split('/')[3]);
      const body = await readBody(req);
      const { message, targets } = body;
      if (!message) return json(res, 400, { success: false, message: 'Message is required.' });
      const sess = sessionManager.getSession(id);
      if (!sess?.sock) return json(res, 404, { success: false, message: 'Session not found or offline.' });
      const jids = Array.isArray(targets) && targets.length
        ? targets.map(t => (t.includes('@') ? t : t.replace(/\D/g, '') + '@s.whatsapp.net'))
        : null;
      try {
        if (jids) {
          let ok = 0, fail = 0;
          for (const jid of jids) {
            try { await sess.sock.sendMessage(jid, { text: message }); ok++; } catch { fail++; }
          }
          return json(res, 200, { success: true, sent: ok, failed: fail });
        } else {
          const raw = await sess.sock.groupFetchAllParticipating();
          const groupJids = Object.keys(raw);
          let ok = 0, fail = 0;
          for (const jid of groupJids) {
            try { await sess.sock.sendMessage(jid, { text: message }); ok++; } catch { fail++; }
          }
          return json(res, 200, { success: true, sent: ok, failed: fail });
        }
      } catch (e) {
        return json(res, 500, { success: false, message: e.message });
      }
    }

    // POST /api/sessions/:id/disconnect
    if (method === 'POST' && url.startsWith('/api/sessions/') && url.endsWith('/disconnect')) {
      const parts = url.split('/');
      const id = parts[3];
      const phone = sanitizePhone(id);
      if (!isSessionOwner(req, phone)) return json(res, 403, { success: false, message: 'Not your session.' });
      await sessionManager.deleteSession(phone);
      return json(res, 200, { success: true });
    }

    // 404
    json(res, 404, { error: 'Not found' });
  });

  server.listen(PORT, '0.0.0.0', () => {
    logger.success(`[Web] Pairing portal live → http://0.0.0.0:${PORT}`);
  });

  server.on('error', err => {
    logger.error(`[Web] Server error: ${err.message}`);
  });
}

function formatUptime(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}