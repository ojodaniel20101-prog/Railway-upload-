/**
 * tools2Commands.js — Comprehensive Tools Category for ZENTRIX MD BY ZENTRIX TECH.
 * Powered by PrexzyVilla APIs.
 */

import axios from 'axios';
import logger from '../../utils/logger.js';
import { applyFont } from '../../utils/helpers.js';

const BASE_URL = 'https://apis.prexzyvilla.site/tools';

/**
 * Generic Tools2 helper to handle API requests and formatting.
 */
async function handleToolsRequest({ sock, msg, args, endpoint, title, params = {}, reaction = '🛠️', formatter }) {
    const jid = msg.key.remoteJid;

    // React to indicate processing
    try { await sock.sendMessage(jid, { react: { text: reaction, key: msg.key } }); } catch (e) {}

    try {
        const response = await axios.get(`${BASE_URL}/${endpoint}`, { params, timeout: 30000 });
        
        // Handle direct image responses
        if (response.headers['content-type']?.startsWith('image/')) {
            await sock.sendMessage(jid, { image: { url: `${BASE_URL}/${endpoint}?${new URLSearchParams(params).toString()}` }, caption: applyFont(`✨ ${title} Result`, 'bold') }, { quoted: msg });
            try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (e) {}
            return;
        }

        const res = response.data;

        if (!res.status && res.status !== undefined) {
            throw new Error(res.error || res.message || 'API returned an error status.');
        }

        const formattedText = formatter ? formatter(res) : JSON.stringify(res, null, 2);

        await sock.sendMessage(jid, { text: formattedText }, { quoted: msg });
        
        // Success reaction
        try { await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } }); } catch (e) {}

    } catch (error) {
        logger.error(`[Tools2Command] Error in ${title}:`, error.message);
        const errorMsg = error.response?.data?.error || error.message || 'Failed to fetch results.';
        await sock.sendMessage(jid, { text: `\u274c *${title} Error:* ${errorMsg}` }, { quoted: msg });
        try { await sock.sendMessage(jid, { react: { text: '\u274c', key: msg.key } }); } catch (e) {}
    }
}

// --- Formatters ---

const formatCodeResult = (res, title) => {
    let text = applyFont(`💻 *${title.toUpperCase()}*\n\n`, 'bold');
    if (res.converted_code) text += res.converted_code;
    else if (res.output) text += `*Output:*\n\`\`\`\n${res.output}\n\`\`\``;
    else if (res.result) text += res.result;
    else text += JSON.stringify(res, null, 2);
    return text;
};

const formatFDroidSearch = (res) => {
    let text = applyFont(`🤖 *F-DROID SEARCH*\n\n`, 'bold');
    res.results.slice(0, 5).forEach((app, i) => {
        text += `${i + 1}. *${app.name}*\n📝 ${app.summary}\n🔗 ${app.link}\n\n`;
    });
    return text;
};

const formatGeoIP = (res, title = 'GEOIP LOOKUP') => {
    const data = res.result || res.data || res;
    let text = applyFont(`🌍 *${title}*\n\n`, 'bold');
    text += `📍 *IP:* ${data.ip || 'N/A'}\n`;
    text += `🏳️ *Country:* ${data.country || 'N/A'} (${data.countryCode || data.country_code || 'N/A'})\n`;
    text += `🌏 *Region:* ${data.regionName || data.region || 'N/A'}\n`;
    text += `🏙️ *City:* ${data.city || 'N/A'}\n`;
    if (data.zip || data.postal) text += `📮 *ZIP:* ${data.zip || data.postal}\n`;
    text += `🏢 *Org/ISP:* ${data.org || data.isp || 'N/A'}\n`;
    if (data.as || data.asname) text += `🔌 *AS:* ${data.as || data.asname || 'N/A'}\n`;
    text += `🗺️ *Coords:* ${data.lat || 'N/A'}, ${data.lon || 'N/A'}\n`;
    if (data.timezone) text += `⏰ *Timezone:* ${data.timezone}\n`;
    if (data.mobile !== undefined) text += `📱 *Mobile:* ${data.mobile ? 'Yes' : 'No'}\n`;
    if (data.proxy !== undefined) text += `🛡️ *Proxy/VPN:* ${data.proxy ? 'Yes' : 'No'}\n`;
    if (data.hosting !== undefined) text += `🖥️ *Hosting:* ${data.hosting ? 'Yes' : 'No'}`;
    return text.trimEnd();
};

const formatTranscript = (res, type) => {
    let text = applyFont(`📄 *${type.toUpperCase()} TRANSCRIPT*\n\n`, 'bold');
    if (res.title) text += `*Title:* ${res.title}\n\n`;
    const transcript = res.transcript || res.results || [];
    const lines = Array.isArray(transcript) ? transcript.map(t => t.text).join(' ') : transcript;
    text += lines.substring(0, 1000) + (lines.length > 1000 ? '...' : '');
    return text;
};

// --- Exported Commands ---

export const sendEmailCommand = {
    name: 'sendemail',
    description: 'Send an anonymous email to anyone',
    category: 'tools2',
    execute: async (ctx) => {
        const { sock, msg, args } = ctx;
        const jid = msg.key.remoteJid;
        const input = args.join(' ');

        // Show help if no args
        if (!input.trim()) {
            return sock.sendMessage(jid, {
                text: [
                    `📧 *ANONYMOUS EMAIL SENDER*`,
                    ``,
                    `Send emails without revealing your identity.`,
                    ``,
                    `*Usage:*`,
                    `.sendemail <to> | <subject> | <message>`,
                    ``,
                    `*Example:*`,
                    `.sendemail boss@company.com | Important Notice | Hello, this is an anonymous tip regarding...`,
                    ``,
                    `⚠️ _Use responsibly. Do not use for spam or harassment._`
                ].join('\n')
            }, { quoted: msg });
        }

        // Parse pipe-separated format
        const parts = input.split('|').map(p => p.trim());
        if (parts.length < 3) {
            return sock.sendMessage(jid, {
                text: `❌ *Wrong format!*\n\n*Usage:* .sendemail <to> | <subject> | <message>\n*Example:* .sendemail someone@gmail.com | Hello | This is my message`
            }, { quoted: msg });
        }

        const to      = parts[0];
        const subject = parts[1];
        const message = parts.slice(2).join('|').trim(); // allow | inside message body

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
            return sock.sendMessage(jid, {
                text: `❌ *Invalid email address:* \`${to}\`\n\nMake sure it looks like: \`example@gmail.com\``
            }, { quoted: msg });
        }

        if (subject.length < 2) {
            return sock.sendMessage(jid, { text: `❌ Subject is too short.` }, { quoted: msg });
        }

        if (message.length < 5) {
            return sock.sendMessage(jid, { text: `❌ Message is too short.` }, { quoted: msg });
        }

        try {
            await sock.sendMessage(jid, { react: { text: '📧', key: msg.key } });

            // Show preview before sending
            await sock.sendMessage(jid, {
                text: [
                    `📤 *Sending anonymous email...*`,
                    ``,
                    `📬 *To:* ${to}`,
                    `📋 *Subject:* ${subject}`,
                    `📝 *Message:* ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
                    ``,
                    `⏳ _Please wait..._`
                ].join('\n')
            }, { quoted: msg });

            const response = await axios.get(`${BASE_URL}/sendemail`, {
                params: { to, subject, message },
                timeout: 30000
            });

            const res = response.data;

            if (!res.status && res.status !== undefined) {
                throw new Error(res.message || res.error || 'Failed to send email.');
            }

            await sock.sendMessage(jid, {
                text: [
                    `✅ *Email Sent Successfully!*`,
                    ``,
                    `📬 *To:* ${to}`,
                    `📋 *Subject:* ${subject}`,
                    `🕵️ *From:* Anonymous`,
                    ``,
                    `_The recipient has no way to trace this back to you._`
                ].join('\n')
            }, { quoted: msg });

            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

        } catch (error) {
            logger.error('[SendEmail] Error:', error.message);
            await sock.sendMessage(jid, {
                text: `❌ *Email Failed:* ${error.response?.data?.message || error.message || 'Could not send email.'}`
            }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
        }
    }
};

export const codeAnalyzerCommand = {
    name: 'codeanalyzer',
    description: 'Analyze code for security and quality',
    category: 'tools2',
    execute: (ctx) => {
        const code = ctx.args.join(' ');
        if (!code) throw new Error('Usage: .codeanalyzer <code>');
        return handleToolsRequest({ ...ctx, endpoint: 'codeanalyzer', title: 'Code Analyzer', params: { code }, reaction: '🔍', formatter: (res) => formatCodeResult(res, 'Code Analysis') });
    }
};

export const codeConverterCommand = {
    name: 'codeconverter',
    description: 'Convert code between languages',
    category: 'tools2',
    execute: (ctx) => {
        const [lang, ...codeArr] = ctx.args;
        const code = codeArr.join(' ');
        if (!lang || !code) throw new Error('Usage: .codeconverter <target_lang> <code>');
        return handleToolsRequest({ ...ctx, endpoint: 'codeconverter', title: 'Code Converter', params: { code, to: lang }, reaction: '🔄', formatter: (res) => formatCodeResult(res, 'Code Conversion') });
    }
};

// Simple Converters
const createConverter = (name, endpoint, lang) => ({
    name,
    description: `Convert code to ${lang}`,
    category: 'tools2',
    execute: (ctx) => {
        const code = ctx.args.join(' ');
        if (!code) throw new Error(`Usage: .${name} <code>`);
        return handleToolsRequest({ ...ctx, endpoint, title: `To ${lang}`, params: { code }, reaction: '🔄', formatter: (res) => formatCodeResult(res, `${lang} Conversion`) });
    }
});

export const tojsCommand = createConverter('tojs', 'tojavascript', 'JavaScript');
export const topythonCommand = createConverter('topython', 'topython', 'Python');
export const tojavaCommand = createConverter('tojava', 'tojava', 'Java');
export const tocppCommand = createConverter('tocpp', 'tocpp', 'C++');
export const tophpCommand = createConverter('tophp', 'tophp', 'PHP');

// Compilers
export const compilerCommand = {
    name: 'compiler',
    description: 'Compile and execute code',
    category: 'tools2',
    execute: (ctx) => {
        const [lang, ...codeArr] = ctx.args;
        const code = codeArr.join(' ');
        if (!lang || !code) throw new Error('Usage: .compiler <lang> <code>');
        return handleToolsRequest({ ...ctx, endpoint: 'compiler', title: 'Code Compiler', params: { code, lang }, reaction: '⚡', formatter: (res) => formatCodeResult(res, 'Compilation Result') });
    }
};

const createCompiler = (name, endpoint, lang) => ({
    name,
    description: `Compile and run ${lang} code`,
    category: 'tools2',
    execute: (ctx) => {
        const code = ctx.args.join(' ');
        if (!code) throw new Error(`Usage: .${name} <code>`);
        return handleToolsRequest({ ...ctx, endpoint, title: `${lang} Compiler`, params: { code }, reaction: '⚡', formatter: (res) => formatCodeResult(res, `${lang} Execution`) });
    }
});

export const compilejsCommand = createCompiler('compilejs', 'compilejs', 'JavaScript');
export const compilepythonCommand = createCompiler('compilepython', 'compilepython', 'Python');
export const compilejavaCommand = createCompiler('compilejava', 'compilejava', 'Java');
export const compilecCommand = createCompiler('compilec', 'compilec', 'C');
export const compilecppCommand = createCompiler('compilecpp', 'compilecpp', 'C++');
export const compilecsharpCommand = createCompiler('compilecsharp', 'compilecsharp', 'C#');

// Encryption
export const emojiEncryptCommand = {
    name: 'emojiencl',
    description: 'Encrypt text into emojis',
    category: 'tools2',
    execute: (ctx) => {
        const [pass, ...textArr] = ctx.args;
        const input = textArr.join(' ');
        if (!pass || !input) throw new Error('Usage: .emojiencl <password> <text>');
        return handleToolsRequest({ ...ctx, endpoint: 'emoji-encrypt', title: 'Emoji Encrypt', params: { input, pass }, reaction: '🔐', formatter: (res) => `🔐 *Encrypted:* ${res.result}` });
    }
};

export const emojiDecryptCommand = {
    name: 'emojidecl',
    description: 'Decrypt emojis back to text',
    category: 'tools2',
    execute: (ctx) => {
        const [pass, ...textArr] = ctx.args;
        const input = textArr.join(' ');
        if (!pass || !input) throw new Error('Usage: .emojidecl <password> <emojis>');
        return handleToolsRequest({ ...ctx, endpoint: 'emoji-decrypt', title: 'Emoji Decrypt', params: { input, pass }, reaction: '🔓', formatter: (res) => `🔓 *Decrypted:* ${res.result}` });
    }
};

export const htmlEncryptCommand = {
    name: 'htmlenc',
    description: 'Encrypt and obfuscate HTML',
    category: 'tools2',
    execute: (ctx) => {
        const html = ctx.args.join(' ');
        if (!html) throw new Error('Usage: .htmlenc <html>');
        return handleToolsRequest({ ...ctx, endpoint: 'htmlecnc', title: 'HTML Encryptor', params: { html, level: 'high' }, reaction: '🔐', formatter: (res) => `🔐 *Encrypted HTML:*\n\`\`\`html\n${res.result}\n\`\`\`` });
    }
};

// F-Droid
export const fdroidSearchCommand = {
    name: 'fdroidsearch',
    description: 'Search apps on F-Droid',
    category: 'tools2',
    execute: (ctx) => {
        const q = ctx.args.join(' ');
        if (!q) throw new Error('Usage: .fdroidsearch <query>');
        return handleToolsRequest({ ...ctx, endpoint: 'fdroidsearch', title: 'F-Droid Search', params: { q }, reaction: '🤖', formatter: formatFDroidSearch });
    }
};

export const fdroidPackageCommand = {
    name: 'fdroidpkg',
    description: 'Get F-Droid package info',
    category: 'tools2',
    execute: (ctx) => {
        const url = ctx.args[0];
        if (!url) throw new Error('Usage: .fdroidpkg <url>');
        return handleToolsRequest({ ...ctx, endpoint: 'fdroidpackage', title: 'F-Droid Package', params: { url }, reaction: '📦', formatter: (res) => `📦 *Package:* ${res.name}\n📝 ${res.summary}\n🔗 ${res.link}` });
    }
};

// IP & Host
export const geoipCommand = {
    name: 'geoip',
    description: 'GeoIP Lookup',
    category: 'tools2',
    execute: (ctx) => {
        const ip = ctx.args[0];
        if (!ip) throw new Error('Usage: .geoip <ip>');
        return handleToolsRequest({ ...ctx, endpoint: 'geoip', title: 'GeoIP Lookup', params: { ip }, reaction: '🌍', formatter: formatGeoIP });
    }
};

export const myipCommand = {
    name: 'myip',
    description: 'Get your current IP geolocation info',
    category: 'tools2',
    execute: (ctx) => handleToolsRequest({
        ...ctx,
        endpoint: 'myip',
        title: 'MY IP INFO',
        reaction: '🌍',
        formatter: (res) => formatGeoIP(res, 'MY IP INFO')
    })
};

export const hostcheckCommand = {
    name: 'hostcheck',
    description: 'Detailed hosting info',
    category: 'tools2',
    execute: (ctx) => {
        const domain = ctx.args[0];
        if (!domain) throw new Error('Usage: .hostcheck <domain>');
        return handleToolsRequest({ ...ctx, endpoint: 'hostcheck', title: 'Host Check', params: { domain }, reaction: '🖥️' });
    }
};

export const domainsearchCommand = {
    name: 'domainsearch',
    description: 'Comprehensive domain/hosting lookup',
    category: 'tools2',
    execute: (ctx) => {
        const domain = ctx.args[0];
        if (!domain) throw new Error('Usage: .domainsearch <domain>\nExample: .domainsearch google.com');
        return handleToolsRequest({
            ...ctx,
            endpoint: 'hostcheck',
            title: 'Domain Search',
            params: { domain },
            reaction: '🌐',
            formatter: (res) => {
                const d = res.result || res.data || res;
                let text = applyFont(`🌐 *DOMAIN SEARCH: ${domain.toUpperCase()}*\n\n`, 'bold');
                text += `🖥️ *Host/Domain:* ${d.host || d.hostname || domain}\n`;
                text += `📍 *IP Address:* ${d.ip || 'N/A'}\n`;
                text += `🏢 *Org/ISP:* ${d.org || d.organization || d.isp || 'N/A'}\n`;
                text += `🏳️ *Country:* ${d.country || 'N/A'}\n`;
                if (d.city) text += `🏙️ *City:* ${d.city}\n`;
                if (d.regionName || d.region) text += `🌏 *Region:* ${d.regionName || d.region}\n`;
                if (d.as || d.asname) text += `🔌 *AS:* ${d.as || d.asname}\n`;
                text += `🛡️ *Registrar:* ${d.registrar || 'N/A'}\n`;
                text += `📅 *Created:* ${d.created || d.creation_date || 'N/A'}\n`;
                text += `⏳ *Expires:* ${d.expires || d.expiration_date || 'N/A'}\n`;
                if (d.nameservers || d.ns) {
                    const ns = Array.isArray(d.nameservers || d.ns)
                        ? (d.nameservers || d.ns).slice(0, 3).join(', ')
                        : (d.nameservers || d.ns);
                    text += `🔗 *Nameservers:* ${ns}\n`;
                }
                if (d.status) text += `📊 *Status:* ${Array.isArray(d.status) ? d.status[0] : d.status}\n`;
                if (d.mobile !== undefined) text += `📱 *Mobile:* ${d.mobile ? 'Yes' : 'No'}\n`;
                if (d.proxy !== undefined) text += `🕵️ *Proxy/VPN:* ${d.proxy ? 'Yes' : 'No'}\n`;
                if (d.hosting !== undefined) text += `🖥️ *Hosting IP:* ${d.hosting ? 'Yes' : 'No'}`;
                return text.trimEnd();
            }
        });
    }
};

// HTML to Image
export const html2imgCommand = {
    name: 'html2img',
    description: 'Convert HTML to image',
    category: 'tools2',
    execute: (ctx) => {
        const html = ctx.args.join(' ');
        if (!html) throw new Error('Usage: .html2img <html>');
        return handleToolsRequest({ ...ctx, endpoint: 'html2imgdirect', title: 'HTML to Image', params: { html, width: 800, height: 600 }, reaction: '🖼️' });
    }
};

// JS Obfuscators
const createObfuscator = (name, endpoint, level) => ({
    name,
    description: `Obfuscate JS (${level})`,
    category: 'tools2',
    execute: (ctx) => {
        const code = ctx.args.join(' ');
        if (!code) throw new Error(`Usage: .${name} <code>`);
        return handleToolsRequest({ ...ctx, endpoint, title: `JS Obfuscator (${level})`, params: { code }, reaction: '🕵️', formatter: (res) => `🕵️ *Obfuscated Code:*\n\`\`\`javascript\n${res.result}\n\`\`\`` });
    }
});

export const obflowCommand = createObfuscator('obflow', 'obflow', 'Low');
export const obfmediumCommand = createObfuscator('obfmedium', 'obfmedium', 'Medium');
export const obfhighCommand = createObfuscator('obfhigh', 'obfhigh', 'High');
export const obfextremeCommand = createObfuscator('obfextreme', 'obfextreme', 'Extreme');

// Transcripts
export const tiktokTranscriptCommand = {
    name: 'tiktoktrans',
    description: 'Get TikTok transcript',
    category: 'tools2',
    execute: (ctx) => {
        const url = ctx.args[0];
        if (!url) throw new Error('Usage: .tiktoktrans <url>');
        return handleToolsRequest({ ...ctx, endpoint: 'tiktoktranscript', title: 'TikTok Transcript', params: { url }, reaction: '📄', formatter: (res) => formatTranscript(res, 'TikTok') });
    }
};

export const ytTranscriptCommand = {
    name: 'yttrans',
    description: 'Get YouTube transcript',
    category: 'tools2',
    execute: (ctx) => {
        const url = ctx.args[0];
        if (!url) throw new Error('Usage: .yttrans <url>');
        return handleToolsRequest({ ...ctx, endpoint: 'youtube-transcript', title: 'YouTube Transcript', params: { url }, reaction: '📄', formatter: (res) => formatTranscript(res, 'YouTube') });
    }
};

// Translations
const createTranslator = (name, endpoint, from, to) => ({
    name,
    description: `Translate ${from} to ${to}`,
    category: 'tools2',
    execute: (ctx) => {
        const text = ctx.args.join(' ');
        if (!text) throw new Error(`Usage: .${name} <text>`);
        return handleToolsRequest({ ...ctx, endpoint, title: `${from} to ${to}`, params: { text }, reaction: '🌐', formatter: (res) => `🌐 *Translation (${from} ➔ ${to}):*\n\n${res.result}` });
    }
});

export const entoidCommand = createTranslator('entoid', 'entoid', 'English', 'Indonesian');
export const idtoenCommand = createTranslator('idtoen', 'idtoen', 'Indonesian', 'English');
export const jatoidCommand = createTranslator('jatoid', 'jatoid', 'Japanese', 'Indonesian');
export const kotoidCommand = createTranslator('kotoid', 'kotoid', 'Korean', 'Indonesian');
export const zhtoidCommand = createTranslator('zhtoid', 'zhtoid', 'Chinese', 'Indonesian');
export const artoidCommand = createTranslator('artoid', 'artoid', 'Arabic', 'Indonesian');

export const detectLangCommand = {
    name: 'detectlang',
    description: 'Detect text language',
    category: 'tools2',
    execute: (ctx) => {
        const text = ctx.args.join(' ');
        if (!text) throw new Error('Usage: .detectlang <text>');
        return handleToolsRequest({ ...ctx, endpoint: 'detectlanguage', title: 'Detect Language', params: { text }, reaction: '🔍', formatter: (res) => `🔍 *Detected Language:* ${res.result}` });
    }
};
