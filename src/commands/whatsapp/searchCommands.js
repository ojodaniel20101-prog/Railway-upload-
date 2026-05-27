/**
 * searchCommands.js — Comprehensive Search Category for ZENTRIX MD BY ZENTRIX TECH.
 * Powered by PrexzyVilla APIs.
 */

import axios from 'axios';
import logger from '../../utils/logger.js';
import { applyFont } from '../../utils/unicodeFonts.js';

const BASE_URL = 'https://apis.prexzyvilla.site/search';

/**
 * Generic search helper to handle API requests and formatting.
 */
async function handleSearchRequest({ sock, msg, args, endpoint, title, formatter }) {
    const jid = msg.key.remoteJid;
    const query = args.join(' ');

    if (!query) {
        return await sock.sendMessage(jid, { text: `\u26a0\ufe0f Please provide a search query.\n\n*Usage:* .${title.toLowerCase()} <query>` });
    }

    // React with search emoji
    try { await sock.sendMessage(jid, { react: { text: '\ud83d\udd0d', key: msg.key } }); } catch (e) {}

    try {
        const response = await axios.get(`${BASE_URL}/${endpoint}`, { params: { q: query, query: query, title: query, kota: query } });
        const res = response.data;

        if (!res.status || (!res.result && !res.data && !res.results)) {
            throw new Error('No results found or API error.');
        }

        const data = res.result || res.data || res.results;
        const formattedText = formatter(data, query);

        await sock.sendMessage(jid, { text: formattedText }, { quoted: msg });
        
        // Success reaction
        try { await sock.sendMessage(jid, { react: { text: '\u2705', key: msg.key } }); } catch (e) {}

    } catch (error) {
        logger.error(`[SearchCommand] Error in ${title}:`, error.message);
        await sock.sendMessage(jid, { text: `\u274c *${title} Error:* ${error.message || 'Failed to fetch results.'}` });
        try { await sock.sendMessage(jid, { react: { text: '\u274c', key: msg.key } }); } catch (e) {}
    }
}

// --- Individual Command Formatters ---

const formatAndroid1 = (results) => {
    let text = applyFont('\ud83d\udcf1 *ANDROID1 MOD SEARCH*\n\n', 'bold');
    results.slice(0, 5).forEach((res, i) => {
        text += `${i + 1}. *${res.name}*\n\u2b50 Rating: ${res.rating}\n\ud83d\udc68\u200d\ud83d\udcbb Dev: ${res.developer}\n\ud83d\udd17 Link: ${res.link}\n\n`;
    });
    return text;
};

const formatAppleMusic = (results) => {
    let text = applyFont('\ud83c\udf4e *APPLE MUSIC SEARCH*\n\n', 'bold');
    results.slice(0, 5).forEach((res, i) => {
        text += `${i + 1}. *${res.title}*\n\ud83c\udfa4 Artist: ${res.artist}\n\ud83d\udd17 Link: ${res.link}\n\n`;
    });
    return text;
};

const formatCuaca = (data) => {
    let text = applyFont(`\ud83c\udf24\ufe0f *WEATHER INFO: ${data.location}*\n\n`, 'bold');
    text += `\ud83c\udf0d Country: ${data.country}\n\ud83c\udf21\ufe0f Temp: ${data.currentTemp}\n\ud83d\udca7 Humidity: ${data.humidity}\n\ud83d\udca8 Wind: ${data.windSpeed}\n\u2601\ufe0f Condition: ${data.weather}`;
    return text;
};

const formatGitHub = (results, type) => {
    let text = applyFont(`\ud83d\udcbb *GITHUB ${type.toUpperCase()} SEARCH*\n\n`, 'bold');
    results.slice(0, 5).forEach((res, i) => {
        if (type === 'repos') {
            const repo = res.repo?.repository || res;
            const name = res.hl_name ? res.hl_name.replace(/<\/?em>/g, '') : repo.name;
            text += `${i + 1}. *${name}*\n\ud83d\udcc4 ${res.hl_trunc_description || 'No description'}\n\ud83c\udf1f Stars: ${res.followers || 0}\n\ud83d\udd17 Link: https://github.com/${repo.owner_login || 'N/A'}/${repo.name || 'N/A'}\n\n`;
        }
        if (type === 'users') text += `${i + 1}. *${res.login}*\n\ud83d\udcc4 ${res.name || 'No name'}\n\ud83d\udc65 Followers: ${res.followers}\n\ud83d\udd17 Link: ${res.html_url}\n\n`;
    });
    return text;
};

const formatIMDb = (data) => {
    let text = applyFont(`\ud83c\udfac *IMDb: ${data.title}* (${data.year})\n\n`, 'bold');
    text += `\u2b50 Rating: ${data.imdbRating}\n\ud83c\udfad Genre: ${data.genre}\n\ud83d\udc65 Actors: ${data.actors}\n\ud83d\udcd6 Plot: ${data.plot}`;
    return text;
};

const formatLyrics = (data) => {
    let text = applyFont(`\ud83c\udfb6 *LYRICS: ${data.title}*\n`, 'bold');
    text += `\ud83c\udfa4 Artist: ${data.artist}\n\ud83d\udcbd Album: ${data.album}\n\n${data.lyrics}`; // No truncation
    return text;
};

const formatPinterest = (results) => {
    let text = applyFont('\ud83d\udccc *PINTEREST SEARCH*\n\n', 'bold');
    results.slice(0, 10).forEach((res, i) => {
        text += `${i + 1}. Link: ${res}\n`;
    });
    return text;
};

const formatWallpaper = (results) => {
    let text = applyFont('\ud83d\uddbc\ufe0f *WALLPAPER SEARCH*\n\n', 'bold');
    results.slice(0, 5).forEach((res, i) => {
        // API returns strings directly
        text += `${i + 1}. Link: ${res}\n`;
    });
    return text;
};

const formatSoundcloud = (results) => {
    let text = applyFont('\u2601\ufe0f *SOUNDCLOUD SEARCH*\n\n', 'bold');
    results.slice(0, 5).forEach((res, i) => {
        text += `${i + 1}. *${res.title}*\n\u23f1\ufe0f Duration: ${res.duration}\n\ud83d\udd17 Link: ${res.url}\n\n`;
    });
    return text;
};

const formatTelegram = (results, type) => {
    let text = applyFont(`\ud83d\udce2 *TELEGRAM ${type.toUpperCase()} SEARCH*\n\n`, 'bold');
    results.slice(0, 5).forEach((res, i) => {
        text += `${i + 1}. *${res.title}*\n\ud83d\udc65 Members: ${res.members || 'N/A'}\n\ud83d\udd17 Link: ${res.link}\n\n`;
    });
    return text;
};

const formatTikTok = (results) => {
    let text = applyFont('\ud83d\udcf1 *TIKTOK SEARCH*\n\n', 'bold');
    results.slice(0, 5).forEach((res, i) => {
        text += `${i + 1}. *${res.title}*\n\ud83d\udc64 Author: ${res.author.nickname}\n\u23f1\ufe0f Duration: ${res.duration}s\n\ud83d\udd17 Link: https://www.tiktok.com/@${res.author.unique_id}/video/${res.video_id}\n\n`;
    });
    return text;
};

const formatWhatsApp = (results) => {
    let text = applyFont('\ud83d\udcac *WHATSAPP GROUP SEARCH*\n\n', 'bold');
    results.slice(0, 5).forEach((res, i) => {
        text += `${i + 1}. *${res.title}*\n\ud83d\udd17 Link: ${res.link || res.join_link}\n\n`;
    });
    return text;
};

const formatYouTube = (results) => {
    let text = applyFont('\ud83d\udcfa *YOUTUBE SEARCH*\n\n', 'bold');
    results.slice(0, 5).forEach((res, i) => {
        const channelName = res.channel?.name || res.author?.name || 'N/A';
        text += `${i + 1}. *${res.title}*\n\ud83d\udc64 Channel: ${channelName}\n\u23f1\ufe0f Duration: ${res.duration || 'N/A'}\n\ud83d\udd17 Link: ${res.url}\n\n`;
    });
    return text;
};

const formatYtMonet = (data) => {
    let text = applyFont('\ud83d\udcb0 *YOUTUBE MONETIZATION CHECK*\n\n', 'bold');
    text += `\ud83d\udcfa Channel: ${data.channelName}\n\ud83d\udcc8 Status: ${data.monetizationStatus || (data.isMonetized ? '\u2705 Monetized' : '\u274c Not Monetized')}\n\ud83d\udc65 Subs: ${data.subscriberCount}\n\ud83d\udc41\ufe0f Views: ${data.viewCount || 'N/A'}`;
    return text;
};

// --- Exported Commands ---

export const android1Command = {
    name: 'android1',
    description: 'Search modded games on Android1',
    category: 'search',
    execute: (ctx) => handleSearchRequest({ ...ctx, endpoint: 'android1', title: 'Android1', formatter: formatAndroid1 })
};

export const applemusicCommand = {
    name: 'applemusic',
    description: 'Search songs on Apple Music',
    category: 'search',
    execute: (ctx) => handleSearchRequest({ ...ctx, endpoint: 'applemusic', title: 'Apple Music', formatter: formatAppleMusic })
};

export const cuacaCommand = {
    name: 'cuaca',
    description: 'Check weather info for a city',
    category: 'search',
    execute: (ctx) => handleSearchRequest({ ...ctx, endpoint: 'cuaca', title: 'Cuaca', formatter: formatCuaca })
};

export const ghrepoCommand = {
    name: 'ghrepo',
    description: 'Search GitHub repositories',
    category: 'search',
    execute: (ctx) => handleSearchRequest({ ...ctx, endpoint: 'repos', title: 'GitHub Repos', formatter: (d) => formatGitHub(d, 'repos') })
};

export const ghuserCommand = {
    name: 'ghuser',
    description: 'Search GitHub users',
    category: 'search',
    execute: (ctx) => handleSearchRequest({ ...ctx, endpoint: 'users', title: 'GitHub Users', formatter: (d) => formatGitHub(d, 'users') })
};

export const imdbCommand = {
    name: 'imdb',
    description: 'Search movie/series info on IMDb',
    category: 'search',
    execute: (ctx) => handleSearchRequest({ ...ctx, endpoint: 'imdb', title: 'IMDb', formatter: formatIMDb })
};

export const lyricsCommand = {
    name: 'lyrics',
    description: 'Search for song lyrics',
    category: 'search',
    execute: (ctx) => handleSearchRequest({ ...ctx, endpoint: 'lyrics', title: 'Lyrics', formatter: formatLyrics })
};

export const pinterestCommand = {
    name: 'pinterest',
    description: 'Search images on Pinterest',
    category: 'search',
    execute: (ctx) => handleSearchRequest({ ...ctx, endpoint: 'pinterest', title: 'Pinterest', formatter: formatPinterest })
};

export const wallpaperCommand = {
    name: 'wallpaper',
    description: 'Search and send HD wallpapers as images',
    category: 'search',
    execute: async (ctx) => {
        const { sock, msg, args } = ctx;
        const jid = msg.key.remoteJid;
        const query = args.join(' ');

        if (!query) {
            return sock.sendMessage(jid, { text: '🖼️ *Usage:* .wallpaper <keyword>\n*Example:* .wallpaper nature sunset' }, { quoted: msg });
        }

        try {
            await sock.sendMessage(jid, { react: { text: '🖼️', key: msg.key } });

            const response = await axios.get(`${BASE_URL}/wallpaper`, { params: { query, q: query }, timeout: 20000 });
            const res = response.data;

            if (!res.status || (!res.result && !res.data && !res.results)) {
                throw new Error('No wallpapers found.');
            }

            const results = res.result || res.data || res.results;
            const urls = Array.isArray(results) ? results.slice(0, 3) : [];

            if (!urls.length) throw new Error('No wallpaper URLs returned.');

            await sock.sendMessage(jid, {
                text: `🖼️ *WALLPAPER: ${query.toUpperCase()}*\n\n_Sending ${urls.length} wallpaper(s)..._`
            }, { quoted: msg });

            for (const url of urls) {
                const imgUrl = typeof url === 'string' ? url : (url.url || url.link || url.image);
                if (!imgUrl) continue;
                await sock.sendMessage(jid, {
                    image: { url: imgUrl },
                    caption: `🖼️ _${query}_ • ZENTRIX MD BY ZENTRIX TECH Wallpaper`
                });
            }

            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
        } catch (error) {
            logger.error('[Wallpaper] Error:', error.message);
            await sock.sendMessage(jid, { text: `❌ *Wallpaper Error:* ${error.message}` }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
        }
    }
};

export const soundcloudCommand = {
    name: 'soundcloudsearch',
    description: 'Search songs on Soundcloud',
    category: 'search',
    execute: (ctx) => handleSearchRequest({ ...ctx, endpoint: 'soundcloud', title: 'Soundcloud', formatter: formatSoundcloud })
};

export const tgsearchCommand = {
    name: 'tgsearch',
    description: 'Search Telegram channels',
    category: 'search',
    execute: (ctx) => handleSearchRequest({ ...ctx, endpoint: 'telegram', title: 'Telegram', formatter: (d) => formatTelegram(d, 'channels') })
};

export const tiktoksearchCommand = {
    name: 'tiktoksearch',
    description: 'Search videos on TikTok',
    category: 'search',
    execute: (ctx) => handleSearchRequest({ ...ctx, endpoint: 'tiktoksearch', title: 'TikTok', formatter: formatTikTok })
};

export const wagroupCommand = {
    name: 'wagroup',
    description: 'Search WhatsApp groups',
    category: 'search',
    execute: (ctx) => handleSearchRequest({ ...ctx, endpoint: 'wagroup', title: 'WhatsApp Group', formatter: formatWhatsApp })
};

export const ytsearchCommand = {
    name: 'ytsearch',
    description: 'Search videos on YouTube',
    category: 'search',
    execute: (ctx) => handleSearchRequest({ ...ctx, endpoint: 'youtube', title: 'YouTube', formatter: formatYouTube })
};

export const ytmonetCommand = {
    name: 'ytmonet',
    description: 'Check YouTube monetization status',
    category: 'search',
    execute: (ctx) => handleSearchRequest({ ...ctx, endpoint: 'ytmonet', title: 'YouTube Monetization', formatter: formatYtMonet })
};
