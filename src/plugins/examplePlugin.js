import logger from '../utils/logger.js';

export default {
  name: 'ExamplePlugin',
  description: 'An example plugin that logs incoming messages.',
  async execute({ sock, msg, sessionManager }) {
    // This is a simple example. In a real plugin, you might do something more complex,
    // like forwarding messages, saving them to a database, or calling an external API.
    const from = msg.key.remoteJid;
    const messageType = Object.keys(msg.message || {})[0];
    logger.info(`[ExamplePlugin] Received a ${messageType} from ${from}`);

    // You can also interact with the sessionManager or the socket itself
    // For example, to get the current session's phone number:
    // const currentPhoneNumber = Object.keys(sessionManager.sessions).find(phone => sessionManager.sessions[phone].sock === sock);
    // logger.info(`[ExamplePlugin] This message is from session: ${currentPhoneNumber}`);
  },
};
