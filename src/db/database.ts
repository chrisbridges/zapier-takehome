import Database from 'better-sqlite3';

export type DatabaseInstance = ReturnType<typeof Database>;

type CustomerSeed = {
  id: number;
  name: string;
};

const SAMPLE_CUSTOMERS: CustomerSeed[] = [
  { id: 123, name: 'Alice' },
  { id: 456, name: 'Bob' },
  { id: 789, name: 'Taylor' },
];

function initializeSchema(db: DatabaseInstance): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS usage_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      service TEXT NOT NULL,
      units_consumed INTEGER NOT NULL,
      price_per_unit_cents INTEGER NOT NULL,
      occurred_at TEXT NOT NULL,
      billing_period TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS idempotency_keys (
      idempotency_key TEXT PRIMARY KEY,
      request_hash TEXT NOT NULL,
      response_body TEXT NOT NULL,
      response_status INTEGER NOT NULL,
      usage_record_id INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (usage_record_id) REFERENCES usage_records(id)
    );

    CREATE INDEX IF NOT EXISTS idx_usage_records_customer
      ON usage_records(customer_id);
  `);
}

function seedCustomers(db: DatabaseInstance): void {
  const insert = db.prepare('INSERT OR IGNORE INTO customers (id, name) VALUES (?, ?)');
  const transaction = db.transaction(() => {
    for (const customer of SAMPLE_CUSTOMERS) {
      insert.run(customer.id, customer.name);
    }
  });

  transaction();
}

export function createDatabase(path: string): DatabaseInstance {
  const db = new Database(path);
  db.pragma('foreign_keys = ON');
  initializeSchema(db);
  seedCustomers(db);
  return db;
}
