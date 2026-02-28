const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = process.env.DB_PATH || path.join(dbDir, 'mediqueue.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  const schemaPath = path.join(dbDir, 'schema.sql');
  const seedPath = path.join(dbDir, 'seed.sql');

  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);

  // Check if data exists
  const count = db.prepare('SELECT COUNT(*) as c FROM doctors').get();
  if (count.c === 0) {
    const seed = fs.readFileSync(seedPath, 'utf-8');
    db.exec(seed);
    console.log('✅ Database seeded with demo data');
  }
}

module.exports = { db, initializeDatabase };
