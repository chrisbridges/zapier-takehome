import fs from 'node:fs';
import path from 'node:path';
import { createDatabase } from '../db/database';
import { createApp } from './app';

const portEnv = process.env.PORT;
const port = portEnv ? Number(portEnv) : 3000;

if (!Number.isFinite(port) || port <= 0) {
  throw new Error(`Invalid PORT value: ${portEnv}`);
}

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'usage.sqlite');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = createDatabase(dbPath);
const app = createApp({ db });

app.listen(port, () => {
  console.log(`Usage API listening on port ${port}`);
});
