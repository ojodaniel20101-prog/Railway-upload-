import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger.js';

class PluginLoader {
  constructor() {
    this.plugins = [];
  }

  async loadPlugins() {
    logger.info('Loading plugins...');
    const pluginsDir = path.resolve('src/plugins');
    try {
      const files = await fs.readdir(pluginsDir);
      for (const file of files) {
        if (file.endsWith('.js')) {
          const pluginName = path.basename(file, '.js');
          try {
            const pluginModule = await import(`file://${path.join(pluginsDir, file)}`);
            if (pluginModule.default && typeof pluginModule.default.execute === 'function') {
              this.plugins.push(pluginModule.default);
              logger.info(`Loaded plugin: ${pluginName}`);
            } else {
              logger.warn(`Could not load plugin from ${file}: missing default export or execute function.`);
            }
          } catch (error) {
            logger.error(`Error loading plugin ${pluginName}:`, error);
          }
        }
      }
    } catch (error) {
        if (error.code === 'ENOENT') {
            logger.warn(`Plugins directory not found: ${pluginsDir}. Skipping.`)
        } else {
            logger.error('Failed to read plugins directory:', error);
        }
    }
  }

  async executePlugins(context) {
    for (const plugin of this.plugins) {
      try {
        await plugin.execute(context);
      } catch (error) {
        logger.error(`Error executing plugin ${plugin.name || 'unnamed'}:`, error);
        // This sandboxing prevents one plugin from crashing the whole application
      }
    }
  }
}

export const pluginLoader = new PluginLoader();
