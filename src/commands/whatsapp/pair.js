/**
 * pair.js — Request a WhatsApp pairing code for a given phone number.
 * Usage: .pair <phone number with country code>
 * Example: .pair 2349057467015
 */

export default {
  name: 'pair',
  aliases: ['paircode', 'getcode'],
  category: 'general',
  description: 'Request a pairing code for a phone number.',
  usage: 'pair <phone number>',
  cooldown: 10,
  permissions: ['user'],
  args: true,

  async execute({ sock, msg, args }) {
    const from = msg.key.remoteJid;

    // Get phone number from args
    let phoneNumber = args.join('').trim().replace(/[^0-9]/g, '');

    if (!phoneNumber) {
      await sock.sendMessage(from, {
        text: `❌ *Invalid Usage*\n\nPlease provide a phone number.\n\n📌 *Example:* .pair 2349057467015`
      }, { quoted: msg });
      return;
    }

    // Basic validation — must be at least 7 digits
    if (phoneNumber.length < 7) {
      await sock.sendMessage(from, {
        text: `❌ *Invalid Number*\n\nThe number you entered doesn't look valid.\nMake sure to include your country code.\n\n📌 *Example:* .pair 2349057467015`
      }, { quoted: msg });
      return;
    }

    // Let user know we're working on it
    await sock.sendMessage(from, {
      text: `⏳ Requesting pairing code for *+${phoneNumber}*...`
    }, { quoted: msg });

    try {
      const code = await sock.requestPairingCode(phoneNumber);

      const formatted = code?.match(/.{1,4}/g)?.join('-') || code;

      await sock.sendMessage(from, {
        text: 
`╔══════════════════════════╗
║   ⚡ ZENTRIX MD PAIRING ⚡  ║
╚══════════════════════════╝

✅ *Pairing Code Generated!*

📞 *Number:* +${phoneNumber}
🔑 *Code:* *${formatted}*

━━━━━━━━━━━━━━━━━━━━━━━━━
📲 *How to use:*
1. Open WhatsApp on your phone
2. Go to *Settings → Linked Devices*
3. Tap *Link a Device*
4. Choose *Link with phone number*
5. Enter the code above

⏱ Code expires in *60 seconds*
━━━━━━━━━━━━━━━━━━━━━━━━━

_Powered by ZENTRIX TECH Enterprise_`
      }, { quoted: msg });

    } catch (error) {
      await sock.sendMessage(from, {
        text: `❌ *Failed to generate pairing code*\n\n${error.message || 'An unexpected error occurred.'}\n\nMake sure the number is correct and try again.`
      }, { quoted: msg });
    }
  }
};
