import { exec } from 'child_process';
import { promisify } from 'util';
import { getSystemDiagnostics } from '../../utils/menu.js';

const execAsync = promisify(exec);

export default {
  execute: async ({ sock, msg, args, isOwner }) => {
    if (!isOwner) return;

    const jid = msg.key.remoteJid;

    // FIX ISSUE 1: Allow ".system" to run with NO arguments
    if (args.length === 0) {
      const diagnostics = getSystemDiagnostics();
      return await sock.sendMessage(jid, { text: diagnostics });
    }

    const command = args.join(' ');
    try {
      const { stdout, stderr } = await execAsync(command);
      const output = stdout || stderr || 'Command executed with no output.';
      await sock.sendMessage(jid, { text: `💻 *System Output:*\n\n${output}` });
    } catch (error) {
      await sock.sendMessage(jid, { text: `❌ *Error:*\n\n${error.message}` });
    }
  }
};
