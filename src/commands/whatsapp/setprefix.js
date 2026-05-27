/**
 * setprefix.js — Per-Session Custom Prefix Command for ZENTRIX MD BY ZENTRIX TECH.
 * Allows each bot session (paired number) to have its own command prefix.
 * Prefix is persisted to database and survives restarts.
 * Supports emojis (including multi-codepoint emoji like 🤸‍♂️, 🇳🇬, 👨‍👩‍👧‍👦).
 */

import { getPrefixForSession, setPrefixForSession } from '../../services/databaseService.js';
import { normalizeJidToNumber } from '../../utils/helpers.js';
import logger from '../../utils/logger.js';

// Prefixes that could break the bot or conflict with WhatsApp
const BLOCKED_PREFIXES = ['@', '#', '+', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

const ALLOWED_MAX_LENGTH = 3; // visual grapheme length — emojis count as 1 each

/**
 * Count visual grapheme clusters so that emoji like 🤸‍♂️ or 🇳🇬 count as 1,
 * not 3+ codepoints. Falls back to spread-based counting if Intl.Segmenter
 * is unavailable (Node < 16).
 */
function graphemeLength(str) {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        const seg = new Intl.Segmenter();
        return [...seg.segment(str)].length;
    }
    return [...str].length;
}

/**
 * Detect whether a string is purely emoji / emoji-like characters.
 */
function isEmojiPrefix(str) {
    const emojiRegex = /^[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}\u200D\uFE0F\u20E3]+$/u;
    return emojiRegex.test(str);
}

/**
 * Get the first grapheme cluster from a string.
 */
function firstGrapheme(str) {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        return [...new Intl.Segmenter().segment(str)][0]?.segment ?? str[0];
    }
    return str[0];
}

export default {
    name: 'setprefix',
    description: 'Set a custom command prefix for this bot session (supports emojis)',
    category: 'system',
    roleRequired: 'owner',
    execute: async ({ sock, msg, args, isOwner }) => {
        const jid       = msg.key.remoteJid;
        const botNumber = normalizeJidToNumber(sock.user?.id, sock);

        // Paired user (session owner) only
        if (!isOwner) {
            return sock.sendMessage(jid, {
                text: '❌ Only the paired bot owner can change the prefix.'
            }, { quoted: msg });
        }

        const current   = getPrefixForSession(botNumber);

        // Join all args — WhatsApp sometimes splits emoji sequences into multiple "words"
        const rawInput = args.join('');

        // Trim to ALLOWED_MAX_LENGTH grapheme clusters
        let newPrefix;
        if (typeof Intl !== 'undefined' && Intl.Segmenter) {
            const clusters = [...new Intl.Segmenter().segment(rawInput)].map(s => s.segment);
            newPrefix = clusters.slice(0, ALLOWED_MAX_LENGTH).join('');
        } else {
            newPrefix = [...rawInput].slice(0, ALLOWED_MAX_LENGTH).join('');
        }

        // No input — show current prefix and usage
        if (!newPrefix || newPrefix.trim() === '') {
            return sock.sendMessage(jid, {
                text: [
                    `⚙️ *PREFIX SETTINGS*`,
                    ``,
                    `📍 *Current Prefix:* \`${current}\``,
                    ``,
                    `*Usage:* ${current}setprefix <prefix>`,
                    ``,
                    `*Examples:*`,
                    `  \`${current}setprefix !\`        → commands start with !`,
                    `  \`${current}setprefix /\`        → commands start with /`,
                    `  \`${current}setprefix ?\`        → commands start with ?`,
                    `  \`${current}setprefix ~\`        → commands start with ~`,
                    `  \`${current}setprefix ..\`       → commands start with ..`,
                    `  \`${current}setprefix 🔥\`       → commands start with 🔥`,
                    `  \`${current}setprefix 🤸‍♂️\`     → commands start with 🤸‍♂️`,
                    `  \`${current}setprefix 👑\`       → commands start with 👑`,
                    `  \`${current}setprefix ⚡\`       → commands start with ⚡`,
                    ``,
                    `⚠️ *Reset to default:*`,
                    `  \`${current}setprefix .\``,
                    ``,
                    `_Prefix is saved and survives restarts._`,
                    `_Each paired session has its own independent prefix._`,
                    `_Emoji prefixes are fully supported! 🎉_`,
                ].join('\n')
            }, { quoted: msg });
        }

        // Block dangerous prefixes — check the first grapheme cluster only
        if (BLOCKED_PREFIXES.includes(firstGrapheme(newPrefix))) {
            return sock.sendMessage(jid, {
                text: `❌ *Cannot use* \`${newPrefix}\` *as a prefix.*\n\nIt may conflict with WhatsApp mentions, phone numbers, or group links.\n\nTry: \`!\`, \`/\`, \`?\`, \`~\`, \`>\`, or any emoji like 🔥 👑 ⚡ 🤸‍♂️`
            }, { quoted: msg });
        }

        // Length check using grapheme cluster count
        const visualLength = graphemeLength(newPrefix);
        if (visualLength > ALLOWED_MAX_LENGTH) {
            return sock.sendMessage(jid, {
                text: `❌ *Prefix too long.* Maximum is ${ALLOWED_MAX_LENGTH} visual characters.\n\nYou entered: \`${newPrefix}\` (${visualLength} chars)\n\n_Note: Each emoji counts as 1 character, even complex ones like 🤸‍♂️_`
            }, { quoted: msg });
        }

        // Same as current — no-op
        if (newPrefix === current) {
            return sock.sendMessage(jid, {
                text: `ℹ️ Prefix is already set to \`${current}\`. No change made.`
            }, { quoted: msg });
        }

        const prefixType = isEmojiPrefix(newPrefix) ? '✨ emoji' : 'text';

        try {
            setPrefixForSession(botNumber, newPrefix);

            logger.info(`[SetPrefix] Session ${botNumber} prefix changed: "${current}" → "${newPrefix}" (${prefixType})`);

            await sock.sendMessage(jid, {
                text: [
                    `✅ *Prefix Updated Successfully!*`,
                    ``,
                    `📍 *Old Prefix:* \`${current}\``,
                    `🆕 *New Prefix:* \`${newPrefix}\`  _(${prefixType} prefix)_`,
                    ``,
                    `*All commands now use:* \`${newPrefix}commandname\``,
                    ``,
                    `*Examples with new prefix:*`,
                    `  \`${newPrefix}menu\``,
                    `  \`${newPrefix}ping\``,
                    `  \`${newPrefix}help\``,
                    `  \`${newPrefix}setprefix .\`  ← to reset back`,
                    ``,
                    `💾 _Saved. Will persist after restart._`,
                    `🔗 _Each bot session has its own independent prefix._`,
                ].join('\n')
            }, { quoted: msg });

            try {
                await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            } catch (_) {}

        } catch (error) {
            logger.error('[SetPrefix] Error saving prefix:', error.message);
            await sock.sendMessage(jid, {
                text: `❌ *Failed to save prefix:* ${error.message}`
            }, { quoted: msg });
        }
    }
};
