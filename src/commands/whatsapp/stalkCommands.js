/**
 * stalkCommands.js — Social Media Stalker Commands for ZENTRIX MD BY ZENTRIX TECH.
 * Powered by apis.prexzyvilla.site/stalk
 * Endpoints: igstalk, ttstalk, twitterstalk, ytstalk, ffstalk
 */

import axios from 'axios';
import logger from '../../utils/logger.js';
import { applyFont } from '../../utils/helpers.js';

const BASE_URL = 'https://apis.prexzyvilla.site/stalk';

// ─── Generic stalk handler ────────────────────────────────────────────────────

async function handleStalk({ sock, msg, args, endpoint, title, paramKey, formatter, emoji = '🔍' }) {
    const jid = msg.key.remoteJid;
    const query = args[0];

    if (!query) {
        return sock.sendMessage(jid, {
            text: `⚠️ *Usage:* .${endpoint} <${paramKey}>\n*Example:* .${endpoint} ${paramKey === 'id' ? '123456789' : '@username'}`
        }, { quoted: msg });
    }

    try {
        await sock.sendMessage(jid, { react: { text: emoji, key: msg.key } });

        const cleanQuery = query.replace(/^@/, '');
        const response = await axios.get(`${BASE_URL}/${endpoint}`, {
            params: { [paramKey]: cleanQuery, user: cleanQuery, id: cleanQuery },
            timeout: 20000
        });

        const res = response.data;
        if (!res.status) throw new Error(res.message || res.error || 'Failed to fetch profile.');

        const data = res.result || res.data || res;
        const { caption, imageUrl } = formatter(data, cleanQuery);

        // Send with profile picture if available
        if (imageUrl) {
            try {
                await sock.sendMessage(jid, {
                    image: { url: imageUrl },
                    caption,
                    mimetype: 'image/jpeg'
                }, { quoted: msg });
            } catch {
                await sock.sendMessage(jid, { text: caption }, { quoted: msg });
            }
        } else {
            await sock.sendMessage(jid, { text: caption }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

    } catch (error) {
        logger.error(`[Stalk:${title}] Error:`, error.message);
        await sock.sendMessage(jid, {
            text: `❌ *${title} Stalk Error:* ${error.response?.data?.message || error.message || 'Failed to fetch.'}`
        }, { quoted: msg });
        await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
    }
}

// ─── Formatters ──────────────────────────────────────────────────────────────

function formatIG(data, user) {
    const d = data.result || data;
    let caption = applyFont(`📸 INSTAGRAM STALK: @${user}\n\n`, 'bold');
    caption += `👤 *Name:* ${d.fullName || d.full_name || 'N/A'}\n`;
    caption += `📛 *Username:* @${d.username || user}\n`;
    caption += `📝 *Bio:* ${d.biography || d.bio || 'N/A'}\n`;
    caption += `👥 *Followers:* ${(d.followersCount || d.followers_count || 0).toLocaleString()}\n`;
    caption += `➡️ *Following:* ${(d.followingCount || d.following_count || 0).toLocaleString()}\n`;
    caption += `📸 *Posts:* ${(d.mediaCount || d.media_count || d.postsCount || 0).toLocaleString()}\n`;
    caption += `✅ *Verified:* ${d.isVerified || d.is_verified ? 'Yes ✔️' : 'No'}\n`;
    caption += `🔒 *Private:* ${d.isPrivate || d.is_private ? 'Yes 🔒' : 'No'}\n`;
    caption += `🔗 *Profile:* https://instagram.com/${d.username || user}`;
    const imageUrl = d.profilePicUrlHD || d.profile_pic_url_hd || d.profilePicUrl || d.profile_pic_url;
    return { caption, imageUrl };
}

function formatTikTok(data, user) {
    const d = data.result || data.userInfo?.user || data.user || data;
    const stats = data.result?.stats || data.userInfo?.stats || data.stats || {};
    let caption = applyFont(`🎵 TIKTOK STALK: @${user}\n\n`, 'bold');
    caption += `👤 *Name:* ${d.nickname || d.name || 'N/A'}\n`;
    caption += `📛 *Username:* @${d.uniqueId || d.unique_id || user}\n`;
    caption += `📝 *Bio:* ${d.signature || d.bio || 'N/A'}\n`;
    caption += `👥 *Followers:* ${(stats.followerCount || d.followers || 0).toLocaleString()}\n`;
    caption += `➡️ *Following:* ${(stats.followingCount || d.following || 0).toLocaleString()}\n`;
    caption += `❤️ *Likes:* ${(stats.heartCount || stats.heart || d.likes || 0).toLocaleString()}\n`;
    caption += `🎬 *Videos:* ${(stats.videoCount || d.videos || 0).toLocaleString()}\n`;
    caption += `✅ *Verified:* ${d.verified ? 'Yes ✔️' : 'No'}\n`;
    caption += `🔗 *Profile:* https://tiktok.com/@${d.uniqueId || user}`;
    const imageUrl = d.avatarLarger || d.avatar_larger || d.avatarThumb || d.avatar;
    return { caption, imageUrl };
}

function formatTwitter(data, user) {
    const d = data.result || data;
    let caption = applyFont(`🐦 TWITTER/X STALK: @${user}\n\n`, 'bold');
    caption += `👤 *Name:* ${d.name || 'N/A'}\n`;
    caption += `📛 *Username:* @${d.screen_name || d.username || user}\n`;
    caption += `📝 *Bio:* ${d.description || d.bio || 'N/A'}\n`;
    caption += `👥 *Followers:* ${(d.followers_count || d.followers || 0).toLocaleString()}\n`;
    caption += `➡️ *Following:* ${(d.friends_count || d.following || 0).toLocaleString()}\n`;
    caption += `🐦 *Tweets:* ${(d.statuses_count || d.tweets || 0).toLocaleString()}\n`;
    caption += `📍 *Location:* ${d.location || 'N/A'}\n`;
    caption += `✅ *Verified:* ${d.verified ? 'Yes ✔️' : 'No'}\n`;
    caption += `🔗 *Profile:* https://x.com/${d.screen_name || user}`;
    const imageUrl = d.profile_image_url_https?.replace('_normal', '') || d.profile_image_url;
    return { caption, imageUrl };
}

function formatYouTube(data, user) {
    const d = data.result || data;
    let caption = applyFont(`📺 YOUTUBE STALK: ${user}\n\n`, 'bold');
    caption += `👤 *Channel:* ${d.name || d.title || 'N/A'}\n`;
    caption += `📝 *Description:* ${(d.description || d.about || 'N/A').substring(0, 150)}...\n`;
    caption += `👥 *Subscribers:* ${d.subscriberCount || d.subscribers || 'Hidden'}\n`;
    caption += `🎬 *Videos:* ${(d.videoCount || d.videos || 0).toLocaleString()}\n`;
    caption += `👁️ *Total Views:* ${(d.viewCount || d.views || 0).toLocaleString()}\n`;
    caption += `📅 *Created:* ${d.publishedAt || d.createdAt || 'N/A'}\n`;
    caption += `🔗 *Channel:* ${d.url || d.channelUrl || `https://youtube.com/@${user}`}`;
    const imageUrl = d.thumbnail || d.avatar || d.profilePicture;
    return { caption, imageUrl };
}

function formatFreeFire(data, id) {
    const d = data.result || data;
    const basic = d.basicInfo || d;
    const guild = d.clanBasicInfo || d.guild || {};
    let caption = applyFont(`🔥 FREE FIRE STALK: ${id}\n\n`, 'bold');
    caption += `👤 *Name:* ${basic.nickname || basic.name || 'N/A'}\n`;
    caption += `🆔 *UID:* ${basic.accountId || basic.uid || id}\n`;
    caption += `⭐ *Level:* ${basic.level || 'N/A'}\n`;
    caption += `🏆 *Rank:* ${basic.rankingPoints || basic.rank || 'N/A'}\n`;
    caption += `🏅 *BR Rank:* ${basic.csRankingPoints || 'N/A'}\n`;
    caption += `💀 *Likes:* ${(basic.liked || basic.likes || 0).toLocaleString()}\n`;
    caption += `🏰 *Guild:* ${guild.clanName || guild.name || 'None'}\n`;
    caption += `🌍 *Region:* ${basic.region || 'N/A'}`;
    const imageUrl = basic.headPic || basic.avatar;
    return { caption, imageUrl };
}

// ─── Exported Commands ────────────────────────────────────────────────────────

export const igstalkCommand = {
    name: 'igstalk',
    description: 'Stalk an Instagram account',
    category: 'stalk',
    execute: (ctx) => handleStalk({
        ...ctx,
        endpoint: 'igstalk',
        title: 'Instagram',
        paramKey: 'user',
        emoji: '📸',
        formatter: formatIG
    })
};

export const ttstalkCommand = {
    name: 'ttstalk',
    description: 'Stalk a TikTok account',
    category: 'stalk',
    execute: (ctx) => handleStalk({
        ...ctx,
        endpoint: 'ttstalk',
        title: 'TikTok',
        paramKey: 'user',
        emoji: '🎵',
        formatter: formatTikTok
    })
};

export const twitterstalkCommand = {
    name: 'twitterstalk',
    description: 'Stalk a Twitter/X account',
    category: 'stalk',
    execute: (ctx) => handleStalk({
        ...ctx,
        endpoint: 'twitterstalk',
        title: 'Twitter',
        paramKey: 'user',
        emoji: '🐦',
        formatter: formatTwitter
    })
};

export const ytstalkCommand = {
    name: 'ytstalk',
    description: 'Stalk a YouTube channel',
    category: 'stalk',
    execute: (ctx) => handleStalk({
        ...ctx,
        endpoint: 'ytstalk',
        title: 'YouTube',
        paramKey: 'user',
        emoji: '📺',
        formatter: formatYouTube
    })
};

export const ffstalkCommand = {
    name: 'ffstalk',
    description: 'Stalk a Free Fire account by UID',
    category: 'stalk',
    execute: (ctx) => handleStalk({
        ...ctx,
        endpoint: 'ffstalk',
        title: 'Free Fire',
        paramKey: 'id',
        emoji: '🔥',
        formatter: formatFreeFire
    })
};
