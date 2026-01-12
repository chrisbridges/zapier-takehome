'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createDatabase } = require('../db/database');
const { createApp } = require('./app');

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const dbPath =
  process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'usage.sqlite');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = createDatabase(dbPath);
const app = createApp({ db });

app.listen(port, () => {
  console.log(`Usage API listening on port ${port}`);
});
