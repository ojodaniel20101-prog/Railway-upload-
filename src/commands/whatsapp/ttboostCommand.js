/**
 * ttboostCommand.js — TikTok Boost Command for ZENTRIX MD BY ZENTRIX TECH.
 * Powered by apis.davidcyril.name.ng/api/tiktok/boost
 *
 * Boost types:
 *   video_views  → Boost views on a TikTok video URL
 *   video_likes  → Boost likes on a TikTok video URL
 *   followers    → Boost followers on a TikTok profile
 *
 * Usage:
 *   .ttboost <videoURL> | video_views
 *   .ttboost <videoURL> | video_likes
 *   .ttboost <profileURL or @username> | followers
 */

import axios from 'axios';
import logger from '../../utils/logger.js';
import { applyFont } from '../../utils/helpers.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const BOOST_API   = 'https://apis.davidcyril.name.ng/api/tiktok/boost';
const VALID_TYPES = ['video_views', 'video_likes', 'followers'];
const FOOTER      = '\n\n_ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴢᴇɴᴛʀɪx ᴍᴅ ʙʏ ᴢᴇɴᴛʀɪx ᴛᴇᴄʜ_';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const reply  = (sock, msg, text) =>
    sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });

const react  = async (sock, msg, emoji) => {
    try {
        await sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } });
    } catch (_) {}
};

/** Truncate a URL for display */
const shortUrl = (url, max = 55) =>
    url.length > max ? url.substring(0, max) + '…' : url;

/**
 * Extract a clean TikTok username from a profile URL or raw @handle.
 * Handles:
 *   https://www.tiktok.com/@username
 *   https://tiktok.com/@username/...
 *   @username
 *   username
 */
function extractUsername(input) {
    if (input.includes('tiktok.com')) {
        // grab the segment after the last @
        const match = input.match(/@([^/?&#]+)/);
        return match ? match[1] : null;
    }
    return input.replace(/^@/, '').trim() || null;
}

/**
 * Validate the URL for video-level boost types (views / likes).
 * Accepts both long URLs and short t.tiktok.com links.
 */
function isValidVideoUrl(url) {
    return (
        url.includes('tiktok.com/') &&
        (url.includes('/video/') || url.includes('vm.tiktok.com') || url.includes('t.tiktok.com'))
    );
}

// ─── Core handler ─────────────────────────────────────────────────────────────

async function handleTtBoost(sock, msg, args) {
    const jid = msg.key.remoteJid;

    // ── Usage guard ──────────────────────────────────────────────────────────
    if (!args.length) {
        return sock.sendMessage(jid, {
            text: applyFont('🚀 TIKTOK BOOST — USAGE\n\n', 'bold') +
                '*Commands:*\n' +
                '`.ttboost <videoURL> | video_views`\n' +
                '`.ttboost <videoURL> | video_likes`\n' +
                '`.ttboost <profileURL or @user> | followers`\n\n' +
                '*Examples:*\n' +
                '`.ttboost https://www.tiktok.com/@user/video/123456 | video_views`\n' +
                '`.ttboost https://www.tiktok.com/@user/video/123456 | video_likes`\n' +
                '`.ttboost https://www.tiktok.com/@username | followers`\n' +
                '`.ttboost @username | followers`' +
                FOOTER
        }, { quoted: msg });
    }

    // ── Parse input: URL | type ──────────────────────────────────────────────
    const rawInput = args.join(' ');
    const pipeIdx  = rawInput.lastIndexOf('|');
    const url      = (pipeIdx !== -1 ? rawInput.substring(0, pipeIdx) : rawInput).trim();
    const type     = (pipeIdx !== -1 ? rawInput.substring(pipeIdx + 1) : 'video_views').trim().toLowerCase();

    // ── Validate boost type ──────────────────────────────────────────────────
    if (!VALID_TYPES.includes(type)) {
        return reply(sock, msg,
            `❌ *Invalid boost type:* \`${type}\`\n` +
            `✅ *Valid types:* \`video_views\`, \`video_likes\`, \`followers\``
        );
    }

    // ── Validate URL based on type ───────────────────────────────────────────
    if (type === 'followers') {
        const username = extractUsername(url);
        if (!username) {
            return reply(sock, msg,
                '❌ *Invalid input for followers boost.*\n' +
                'Provide a TikTok profile URL or @username.\n' +
                '*Example:* `.ttboost @username | followers`'
            );
        }
    } else {
        if (!isValidVideoUrl(url)) {
            return reply(sock, msg,
                `❌ *Invalid video URL for \`${type}\`.*\n` +
                'Provide a valid TikTok video URL.\n' +
                '*Example:* `.ttboost https://www.tiktok.com/@user/video/123 | video_views`'
            );
        }
    }

    // ── Send loading reaction ────────────────────────────────────────────────
    await react(sock, msg, '🚀');

    const loadingMsg = await sock.sendMessage(jid, {
        text: applyFont('🚀 TIKTOK BOOST PROCESSING…\n\n', 'bold') +
            `⚡ *Type:* \`${type}\`\n` +
            `🔗 *URL:* ${shortUrl(url)}\n\n` +
            '_Please wait, sending boost request…_'
    }, { quoted: msg });

    // ── API request ──────────────────────────────────────────────────────────
    try {
        const response = await axios.get(BOOST_API, {
            params: { url, type },
            timeout: 30000,
        });

        const res = response.data;

        // ── Handle API-level failure ─────────────────────────────────────────
        if (!res || !res.success) {
            await react(sock, msg, '❌');
            // Delete the loading message
            try { await sock.sendMessage(jid, { delete: loadingMsg.key }); } catch (_) {}
            return reply(sock, msg,
                `❌ *Boost Failed*\n` +
                `📝 *Reason:* ${res?.message || res?.error || 'Unknown error from API.'}`
            );
        }

        // ── Build success message ────────────────────────────────────────────
        // Real API response shape:
        // { success, message, type, aweme_id, data: { amount_processed, service_type } }
        const d = res.data || {};

        let result = applyFont('🚀 TIKTOK BOOST SUCCESSFUL!\n\n', 'bold');
        result += `🔗 *URL:* ${shortUrl(url)}\n`;
        result += `⚡ *Type:* ${res.type || type}\n`;
        result += `📊 *Amount Processed:* ${d.amount_processed ?? 'N/A'}\n`;
        result += `📈 *Service:* ${d.service_type || res.type || type}\n`;

        if (res.aweme_id)
            result += `🆔 *Aweme ID:* ${res.aweme_id}\n`;

        result += `\n📝 ${res.message}\n`;
        result += FOOTER;

        // Delete the loading message
        try { await sock.sendMessage(jid, { delete: loadingMsg.key }); } catch (_) {}

        await sock.sendMessage(jid, { text: result }, { quoted: msg });
        await react(sock, msg, '✅');

    } catch (error) {
        logger.error('[TtBoost] Error:', error.message);

        // Delete the loading message on error too
        try { await sock.sendMessage(jid, { delete: loadingMsg.key }); } catch (_) {}

        await react(sock, msg, '❌');

        let errText = '❌ *TikTok Boost Error*\n\n';

        if (error.response?.status === 429) {
            errText += '⏳ *Rate limit reached.* Please wait a moment and try again.';
        } else if (error.response?.status === 404) {
            errText += '🔍 *Boost endpoint not found.* The API may be temporarily down.';
        } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            errText += '⌛ *Request timed out.* The API took too long to respond. Try again.';
        } else {
            errText += `📝 *Details:* ${error.response?.data?.message || error.message || 'Unexpected failure.'}`;
        }

        errText += FOOTER;
        return reply(sock, msg, errText);
    }
}

// ─── Export ───────────────────────────────────────────────────────────────────

export const ttboostCommand = {
    execute: async ({ sock, msg, args }) => handleTtBoost(sock, msg, args),
};

// Alias
export const tiktokboostCommand = ttboostCommand;
