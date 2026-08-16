import { getDb } from '../src/db/db.js';

const db = await getDb();
db.data.contacts = [];
db.data.campaigns = [];
db.data.sendLog = [];
await db.write();
console.log('Database reset.');
