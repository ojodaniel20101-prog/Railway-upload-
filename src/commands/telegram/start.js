/**
 * start.js — ZENTRIX MD BY ZENTRIX TECH · Boot Sequence
 * First contact. Routes straight into menu.
 */

import menuCommand  from './menu.js';
import { userStorage } from '../../services/userStorage.js';
import logger from '../../utils/logger.js';

export default {
  name: 'start',
  description: 'Initialize the ZENTRIX MD BY ZENTRIX TECH control system.',
  async execute(ctx) {
    await userStorage.saveUser(ctx.msg.from);
    logger.info(`[Boot] /start by ${ctx.msg.from.id} (@${ctx.msg.from.username || 'unknown'})`);
    return menuCommand.execute(ctx);
  },
};
