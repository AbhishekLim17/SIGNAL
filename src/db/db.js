import { JSONFilePreset } from 'lowdb/node';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbFile = path.join(__dirname, '..', '..', 'data', 'db.json');

const defaultData = {
  users: [],
  emailAccounts: [],
  contacts: [],
  campaigns: [],
  sendLog: [],
};

let dbInstance;

export async function getDb() {
  if (!dbInstance) {
    dbInstance = await JSONFilePreset(dbFile, defaultData);
    // Ensure all collections exist even if the file predates them.
    for (const key of Object.keys(defaultData)) {
      if (!Array.isArray(dbInstance.data[key])) dbInstance.data[key] = [];
    }
  }
  return dbInstance;
}

/**
 * Serializes writes so concurrent requests (multiple users) never overlap
 * their file writes and corrupt the JSON store.
 */
let writeChain = Promise.resolve();
export function persist(db) {
  writeChain = writeChain.then(() => db.write()).catch(() => db.write());
  return writeChain;
}
