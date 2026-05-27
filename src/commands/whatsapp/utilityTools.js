/**
 * utilityTools.js — Advanced utility commands: .tempmail, .gitclone, .webpdf.
 */

import axios from 'axios';
import { writeFile, unlink, readFile } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../../utils/logger.js';

const execPromise = promisify(exec);
const TEMP_DIR = path.join(process.cwd(), 'tmp/media');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

export const tempmailCommand = {
  name: 'tempmail',
  description: 'Generate a temporary email address.',
  category: 'utility',
  execute: async ({ sock, msg, args }) => {
    const jid = msg.key.remoteJid;
    
    if (args[0] === 'check' && args[1]) {
      // Check inbox
      try {
        const [user, domain] = args[1].split('@');
        const res = await axios.get(`https://www.1secmail.com/api/v1/?action=getMessages&login=${user}&domain=${domain}`);
        const messages = res.data;
        
        if (messages.length === 0) {
          return await sock.sendMessage(jid, { text: '📭 *Inbox is empty.*' }, { quoted: msg });
        }
        
        let text = `📬 *Inbox for ${args[1]}:*\n\n`;
        for (const m of messages.slice(0, 5)) {
          text += `📧 *From:* ${m.from}\n*Subject:* ${m.subject}\n*Date:* ${m.date}\n*ID:* ${m.id}\n\n`;
        }
        text += `_Use .tempmail read ${args[1]} <id> to read a message._`;
        await sock.sendMessage(jid, { text }, { quoted: msg });
      } catch (e) {
        throw new Error('Failed to check inbox.');
      }
    } else if (args[0] === 'read' && args[1] && args[2]) {
      // Read specific message
      try {
        const [user, domain] = args[1].split('@');
        const res = await axios.get(`https://www.1secmail.com/api/v1/?action=readMessage&login=${user}&domain=${domain}&id=${args[2]}`);
        const m = res.data;
        const text = `📧 *From:* ${m.from}\n*Subject:* ${m.subject}\n*Date:* ${m.date}\n\n*Message:*\n${m.textBody || m.body}`;
        await sock.sendMessage(jid, { text }, { quoted: msg });
      } catch (e) {
        throw new Error('Failed to read message.');
      }
    } else {
      // Generate new email
      try {
        const res = await axios.get('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1');
        const email = res.data[0];
        await sock.sendMessage(jid, { 
          text: `📧 *Your Temporary Email:*\n\n\`${email}\`\n\n*Commands:*\n- \`.tempmail check ${email}\`\n- \`.tempmail read ${email} <id>\`` 
        }, { quoted: msg });
      } catch (e) {
        throw new Error('Failed to generate temporary email.');
      }
    }
  }
};

export const gitcloneCommand = {
  name: 'gitclone',
  description: 'Clone a GitHub repository and send it as a ZIP.',
  category: 'utility',
  execute: async ({ sock, msg, args }) => {
    const repoUrl = args[0];
    if (!repoUrl || !repoUrl.includes('github.com')) throw new Error('Please provide a valid GitHub repository URL.');

    await sock.sendMessage(msg.key.remoteJid, { react: { text: '📥', key: msg.key } });

    const repoName = repoUrl.split('/').pop().replace('.git', '');
    const zipPath = path.join(TEMP_DIR, `${repoName}_${Date.now()}.zip`);

    try {
      // Use a public API to get the zip directly to save time and resources
      const zipUrl = `${repoUrl.replace('.git', '')}/archive/refs/heads/main.zip`;
      const res = await axios.get(zipUrl, { responseType: 'arraybuffer' });
      
      await writeFile(zipPath, res.data);

      await sock.sendMessage(msg.key.remoteJid, {
        document: { url: zipPath },
        fileName: `${repoName}.zip`,
        mimetype: 'application/zip',
        caption: `📦 *Repository:* ${repoName}\n🔗 ${repoUrl}`
      }, { quoted: msg });

    } catch (e) {
      // Try 'master' branch if 'main' fails
      try {
        const zipUrl = `${repoUrl.replace('.git', '')}/archive/refs/heads/master.zip`;
        const res = await axios.get(zipUrl, { responseType: 'arraybuffer' });
        await writeFile(zipPath, res.data);
        await sock.sendMessage(msg.key.remoteJid, {
          document: { url: zipPath },
          fileName: `${repoName}.zip`,
          mimetype: 'application/zip',
          caption: `📦 *Repository:* ${repoName}\n🔗 ${repoUrl}`
        }, { quoted: msg });
      } catch (e2) {
        logger.error('[GitClone] Error:', e2);
        throw new Error('Failed to clone repository. Ensure the URL is correct and the repo is public.');
      }
    } finally {
      try { await unlink(zipPath); } catch (_) {}
    }
  }
};

export const webpdfCommand = {
  name: 'webpdf',
  description: 'Convert a website URL to a PDF.',
  category: 'utility',
  execute: async ({ sock, msg, args }) => {
    const url = args[0];
    if (!url || !url.startsWith('http')) throw new Error('Please provide a valid URL starting with http/https.');

    await sock.sendMessage(msg.key.remoteJid, { react: { text: '📄', key: msg.key } });

    const pdfPath = path.join(TEMP_DIR, `web_${Date.now()}.pdf`);

    try {
      // Using a public API for web-to-pdf conversion
      const res = await axios.get(`https://api.html2pdf.app/v1/generate?url=${encodeURIComponent(url)}&apiKey=public`, { responseType: 'arraybuffer' });
      
      await writeFile(pdfPath, res.data);

      await sock.sendMessage(msg.key.remoteJid, {
        document: { url: pdfPath },
        fileName: `website.pdf`,
        mimetype: 'application/pdf',
        caption: `📄 *Web to PDF*\n🔗 ${url}`
      }, { quoted: msg });

    } catch (e) {
      logger.error('[WebPDF] Error:', e);
      throw new Error('Failed to convert website to PDF.');
    } finally {
      try { await unlink(pdfPath); } catch (_) {}
    }
  }
};
