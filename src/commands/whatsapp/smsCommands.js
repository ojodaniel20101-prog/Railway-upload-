
import axios from 'axios';
import * as cheerio from 'cheerio';
import logger from '../../utils/logger.js';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Referer': 'https://www.google.com/',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
};

// Rate limit storage
const rateLimits = new Map();

async function getNumbers() {
    const sites = [
        {
            name: 'AnonymSMS',
            url: 'https://anonymsms.com/',
            numSelector: 'a[href*="/number/"]',
            numRegex: /\+(\d+)/
        },
        {
            name: 'SMS-Online',
            url: 'https://sms-online.co/receive-free-sms',
            numSelector: 'a[href*="/receive-free-sms/"]',
            numRegex: /\+(\d+)/
        }
    ];

    for (const site of sites) {
        try {
            const { data } = await axios.get(site.url, {
                headers: HEADERS,
                timeout: 10000
            });
            const $ = cheerio.load(data);
            const numbers = [];
            $(site.numSelector).each((i, el) => {
                const text = $(el).text().trim();
                const href = $(el).attr('href');
                const match = text.match(site.numRegex);
                if (match && href) {
                    numbers.push({
                        number: match[0].replace(/\s/g, ''),
                        url: href.startsWith('http') ? href : `${site.url.replace(/\/$/, '')}${href.startsWith('/') ? '' : '/'}${href}`
                    });
                }
            });
            if (numbers.length > 0) return numbers;
        } catch (e) {
            logger.error(`[SMS] Error fetching from ${site.url}: ${e.message}`);
        }
    }
    return [];
}

async function getMessages(number) {
    const cleanNumber = number.replace(/\+/g, '').replace(/\s/g, '');
    const numbers = await getNumbers();
    const target = numbers.find(n => n.number.replace(/\s/g, '') === cleanNumber);
    
    if (!target) return [];

    try {
        const { data } = await axios.get(target.url, {
            headers: HEADERS,
            timeout: 10000
        });
        const $ = cheerio.load(data);
        const messages = [];
        
        if (target.url.includes('anonymsms.com')) {
            $('table tbody tr').each((i, el) => {
                const tds = $(el).find('td');
                if (tds.length >= 3) {
                    messages.push({
                        from: $(tds[0]).text().trim(),
                        content: $(tds[1]).text().trim(),
                        time: $(tds[2]).text().trim()
                    });
                }
            });
            // Fallback for different layout
            if (messages.length === 0) {
                $('.row.border-bottom').each((i, el) => {
                    const from = $(el).find('.col-md-2').first().text().trim();
                    const content = $(el).find('.col-md-8').text().trim();
                    const time = $(el).find('.col-md-2').last().text().trim();
                    if (from && content) messages.push({ from, content, time });
                });
            }
        } else if (target.url.includes('sms-online.co')) {
            $('.sms-message-container').each((i, el) => {
                const from = $(el).find('.sms-message-sender').text().trim();
                const content = $(el).find('.sms-message-text').text().trim();
                const time = $(el).find('.sms-message-time').text().trim();
                if (from && content) messages.push({ from, content, time });
            });
        }
        
        return messages.slice(0, 5);
    } catch (error) {
        logger.error(`[SMS] Error fetching messages for ${number}: ${error.message}`);
        return [];
    }
}

export const getNumberCommand = {
    name: 'getnumber',
    description: 'Get a live temporary phone number.',
    category: 'utility',
    execute: async ({ sock, msg }) => {
        const jid = msg.key.remoteJid;
        const userId = msg.key.participant || jid;
        
        // Rate limiting: 30 seconds
        const now = Date.now();
        if (rateLimits.has(userId) && now - rateLimits.get(userId) < 30000) {
            const remaining = Math.ceil((30000 - (now - rateLimits.get(userId))) / 1000);
            return await sock.sendMessage(jid, { text: `⏳ Please wait ${remaining}s before getting another number.` }, { quoted: msg });
        }
        rateLimits.set(userId, now);

        try {
            const numbers = await getNumbers();
            if (numbers.length === 0) {
                return await sock.sendMessage(jid, { text: '❌ No numbers available right now. Please try again later.' }, { quoted: msg });
            }
            
            const randomNum = numbers[Math.floor(Math.random() * numbers.length)];
            const response = `📱 *Temporary Number:* ${randomNum.number}\n📩 Check messages with: .checksms ${randomNum.number}\n⚠️ Public number — messages visible to all.`;
            
            await sock.sendMessage(jid, { text: response }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(jid, { text: '❌ Failed to fetch a temporary number.' }, { quoted: msg });
        }
    }
};

export const checkSmsCommand = {
    name: 'checksms',
    description: 'Check the SMS inbox for a temporary number.',
    category: 'utility',
    execute: async ({ sock, msg, args }) => {
        const jid = msg.key.remoteJid;
        let number = args[0];
        
        if (!number) {
            return await sock.sendMessage(jid, { text: '❌ Please provide a number. Example: .checksms +1234567890' }, { quoted: msg });
        }

        // Normalize number
        number = number.replace(/[^\d+]/g, '');
        if (!number.startsWith('+')) number = '+' + number;

        try {
            const messages = await getMessages(number);
            
            if (messages.length === 0) {
                return await sock.sendMessage(jid, { text: `📭 *Inbox for ${number}*\n\nNo SMS yet — wait a few seconds and try again.` }, { quoted: msg });
            }
            
            let text = `📨 *Inbox for ${number}*\n━━━━━━━━━━━━━━━━━\n`;
            messages.forEach((m, i) => {
                const indexEmoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'][i];
                text += `${indexEmoji} From: ${m.from} | ${m.time}\n💬 ${m.content}\n━━━━━━━━━━━━━━━━━\n`;
            });
            
            await sock.sendMessage(jid, { text }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(jid, { text: '❌ Failed to fetch messages for this number.' }, { quoted: msg });
        }
    }
};
