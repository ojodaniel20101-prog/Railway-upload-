import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY;

if (!SECRET_KEY) {
  console.error('❌ SECRET_KEY is not set in environment variables!');
  process.exit(1);
}

app.use(express.json());

const IGNORE_LIST = [
  'node_modules', '.git', '.env', 'package-lock.json',
  'server.js', 'obfuscate.js', 'ecosystem.config.cjs', 'fetch_version.js'
];

async function getFiles(dir) {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name);
    if (IGNORE_LIST.includes(dirent.name)) return [];
    return dirent.isDirectory() ? getFiles(res) : res;
  }));
  return Array.prototype.concat(...files);
}

// Auth middleware
function authenticate(req, res, next) {
  const key = req.headers['x-secret-key'];
  if (!key || key !== SECRET_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.get('/fetch-core', authenticate, async (req, res) => {
  try {
    const rootDir = path.join(__dirname, 'src');
    const allFiles = await getFiles(rootDir);
    const fileContents = {};

    for (const file of allFiles) {
      const relativePath = path.relative(__dirname, file);
      const content = await fs.readFile(file, 'utf8');
      fileContents[relativePath] = content;
    }

    res.json(fileContents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Zentrix Railway Server running ⚡' });
});

app.listen(PORT, () => {
  console.log(`⚡ Zentrix Railway server running on port ${PORT}`);
});
