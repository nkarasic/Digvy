import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { JSONFilePreset } from 'lowdb/node';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', 'db.json');

const defaultData = { items: [] };

const db = await JSONFilePreset(dbPath, defaultData);

export default db;
