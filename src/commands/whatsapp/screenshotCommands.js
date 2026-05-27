/**
 * screenshotCommands.js — Website Screenshot Commands for ZENTRIX MD BY ZENTRIX TECH.
 * Powered by apis.prexzyvilla.site/ssweb
 * Endpoints: webss, apiFlash, screenshotLayer
 */

import axios from 'axios';
import logger from '../../utils/logger.js';

const BASE_URL = 'https://apis.prexzyvilla.site/ssweb';

// ─── Generic screenshot handler ───────────────────────────────────────────────

async function handleScreenshot({ sock, msg, args, endpoint, title, emoji = '📸' }) {
    const jid = msg.key.remoteJid;
    let url = args[0];

    if (!url) {
        return sock.sendMessage(jid, {
            text: `📸 *Usage:* .${title.toLowerCase().replace(/\s/g, '')} <url>\n*Example:* .${title.toLowerCase().replace(/\s/g, '')} https://google.com`
        }, { quoted: msg });
    }

    // Auto-prefix https if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    try {
        await sock.sendMessage(jid, { react: { text: emoji, key: msg.key } });
        await sock.sendMessage(jid, {
            text: `⏳ _Taking screenshot of_ *${url}*...\n_This may take a few seconds._`
        }, { quoted: msg });

        const response = await axios.get(`${BASE_URL}/${endpoint}`, {
            params: { url },
            timeout: 40000,
            responseType: 'arraybuffer'
        });

        const contentType = response.headers['content-type'] || '';

        // If it's JSON (error), parse and throw
        if (contentType.includes('application/json')) {
            const errData = JSON.parse(Buffer.from(response.data).toString('utf-8'));
            throw new Error(errData.message || errData.error || 'Screenshot failed.');
        }

        // If it's an image, send directly
        if (contentType.startsWith('image/')) {
            await sock.sendMessage(jid, {
                image: Buffer.from(response.data),
                caption: `📸 *Screenshot:* ${url}\n🛠️ _Provider: ${title}_`
            }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            return;
        }

        // Otherwise try to parse as JSON with a URL field
        const text = Buffer.from(response.data).toString('utf-8');
        let parsed;
        try { parsed = JSON.parse(text); } catch { parsed = null; }

        if (parsed?.status && (parsed.result || parsed.url || parsed.screenshot)) {
            const imgUrl = parsed.result || parsed.url || parsed.screenshot;
            await sock.sendMessage(jid, {
                image: { url: imgUrl },
                caption: `📸 *Screenshot:* ${url}\n🛠️ _Provider: ${title}_`
            }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
        } else {
            throw new Error('Unexpected response from screenshot API.');
        }

    } catch (error) {
        logger.error(`[Screenshot:${title}] Error:`, error.message);
        await sock.sendMessage(jid, {
            text: `❌ *Screenshot Error:* ${error.message}\n\n_Tip: Make sure the URL is valid and accessible._`
        }, { quoted: msg });
        await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
    }
}

// ─── Exported Commands ────────────────────────────────────────────────────────

export const screenshotCommand = {
    name: 'screenshot',
    description: 'Take a screenshot of any website',
    category: 'tools',
    execute: (ctx) => handleScreenshot({ ...ctx, endpoint: 'webss', title: 'WebSS', emoji: '📸' })
};

// Alias: .ss
export const ssCommand = {
    name: 'ss',
    description: 'Take a screenshot of any website (alias for .screenshot)',
    category: 'tools',
    execute: (ctx) => handleScreenshot({ ...ctx, endpoint: 'webss', title: 'WebSS', emoji: '📸' })
};

export const screenshotFlashCommand = {
    name: 'ssflash',
    description: 'Take a screenshot using API Flash provider',
    category: 'tools',
    execute: (ctx) => handleScreenshot({ ...ctx, endpoint: 'apiFlash', title: 'API Flash', emoji: '⚡' })
};

export const screenshotLayerCommand = {
    name: 'sslayer',
    description: 'Take a screenshot using Screenshot Layer provider',
    category: 'tools',
    execute: (ctx) => handleScreenshot({ ...ctx, endpoint: 'screenshotLayer', title: 'Screenshot Layer', emoji: '🌐' })
};
