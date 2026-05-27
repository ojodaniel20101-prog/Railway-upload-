/**
 * userStorage.js — Persistent storage for Telegram users.
 */

import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger.js';
import { environment } from '../config/environment.js';

const STORAGE_FILE = path.join(environment.sessionDataPath, 'users.json');

class UserStorageService {
  constructor() {
    this.users = new Map();
    this.initialized = false;
  }

  /**
   * Loads users from the JSON storage file into memory.
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      await fs.mkdir(environment.sessionDataPath, { recursive: true });
      const data = await fs.readFile(STORAGE_FILE, 'utf-8').catch(() => '[]');
      const userList = JSON.parse(data);
      
      userList.forEach(user => {
        this.users.set(user.userId, user);
      });
      
      this.initialized = true;
      logger.system(`Loaded ${this.users.size} users from persistent storage.`);
    } catch (error) {
      logger.error('UserStorage Initialization failed', error);
      this.users = new Map();
      this.initialized = true;
    }
  }

  /**
   * Saves a user to storage if they don't already exist.
   * @param {object} user - Telegram user object.
   */
  async saveUser(user) {
    if (!this.initialized) await this.initialize();
    
    if (this.users.has(user.id)) return;
    
    const newUser = {
      userId: user.id,
      username: user.username || 'unknown',
      firstName: user.first_name || '',
      lastName: user.last_name || '',
      firstInteraction: new Date().toISOString(),
    };
    
    this.users.set(user.id, newUser);
    await this.persist();
    logger.success(`New User Registered: ${newUser.firstName} (@${newUser.username})`, 'SYSTEM');
  }

  /**
   * Persists the in-memory user map to the JSON file.
   */
  async persist() {
    try {
      const data = JSON.stringify(Array.from(this.users.values()), null, 2);
      await fs.writeFile(STORAGE_FILE, data, 'utf-8');
    } catch (error) {
      logger.error('UserStorage Persistence failed', error);
    }
  }

  /**
   * Returns the total count of registered users.
   * @returns {number}
   */
  getUserCount() {
    return this.users.size;
  }

  /**
   * Returns all registered user IDs.
   * @returns {number[]}
   */
  getAllUserIds() {
    return Array.from(this.users.keys());
  }
}

export const userStorage = new UserStorageService();
export default userStorage;
