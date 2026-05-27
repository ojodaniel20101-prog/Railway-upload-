import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to serve static files if needed, but we mainly want to serve code
app.use(express.json());

const IGNORE_LIST = ['node_modules', '.git', '.env', 'package-lock.json', 'server.js'];

async function getFiles(dir) {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name);
    if (IGNORE_LIST.includes(dirent.name)) return [];
    return dirent.isDirectory() ? getFiles(res) : res;
  }));
  return Array.prototype.concat(...files);
}

app.get('/fetch-core', async (req, res) => {
  try {
    const rootDir = __dirname;
    const allFiles = await getFiles(rootDir);
    const fileContents = {};

    for (const file of allFiles) {
      const relativePath = path.relative(rootDir, file);
      const content = await fs.readFile(file, 'utf8');
      fileContents[relativePath] = content;
    }

    res.json(fileContents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Railway server running on port ${PORT}`);
});
