import { fetchLatestWaWebVersion } from '@whiskeysockets/baileys';

async function run() {
  try {
    const { version, isLatest } = await fetchLatestWaWebVersion();
    console.log('Latest WhatsApp Web Version:', version);
    console.log('Is Latest:', isLatest);
  } catch (error) {
    console.error('Failed to fetch version:', error);
  }
}

run();
