/**
 * systemLogs.js — Tracks last 10 system events for the /logs command.
 */

class SystemLogsService {
  constructor() {
    this.logs = [];
    this.maxLogs = 10;
  }

  /**
   * Adds a new event to the system logs.
   * @param {string} event - Description of the event.
   */
  addEvent(event) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${event}`;
    this.logs.unshift(logEntry);
    
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
  }

  /**
   * Returns the last 10 system events as a formatted string.
   * @returns {string}
   */
  getFormattedLogs() {
    if (this.logs.length === 0) return 'No system events recorded.';
    return this.logs.join('\n');
  }
}

export const systemLogs = new SystemLogsService();
