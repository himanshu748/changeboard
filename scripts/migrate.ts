import { openDatabase, migrate } from "../src/server/db";
const db = await openDatabase();
await migrate(db);
await db.close();
console.log("Database migration applied.");
