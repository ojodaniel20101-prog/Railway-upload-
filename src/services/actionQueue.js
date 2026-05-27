import logger from '../utils/logger.js';

class ActionQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  async add(action, delayRange = [800, 1500]) {
    return new Promise((resolve, reject) => {
      this.queue.push({ action, delayRange, resolve, reject });
      if (!this.isProcessing) {
        this.process();
      }
    });
  }

  async process() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const { action, delayRange, resolve, reject } = this.queue[0];

    try {
      const result = await action();
      resolve(result);
    } catch (error) {
      logger.error('Action execution failed in queue:', error);
      reject(error);
    } finally {
      this.queue.shift();
      const [min, max] = delayRange;
      const delay = Math.floor(Math.random() * (max - min + 1)) + min;
      setTimeout(() => this.process(), delay);
    }
  }
}

const actionQueue = new ActionQueue();
export default actionQueue;
