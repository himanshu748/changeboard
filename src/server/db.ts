import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { readFile } from "node:fs/promises";
export interface Sql {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }>;
}
export interface Database extends Sql {
  transaction<T>(fn: (tx: Sql) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
export async function openDatabase(
  path = process.env.DATA_DIR || "work/data",
): Promise<Database> {
  if (process.env.DATABASE_URL && path !== ":memory:") {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 8,
    });
    return {
      query: async <T>(sql: string, params?: unknown[]) => ({
        rows: (await pool.query(sql, params)).rows as T[],
      }),
      transaction: async (fn) => {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const value = await fn({
            query: async <T>(sql: string, params?: unknown[]) => ({
              rows: (await client.query(sql, params)).rows as T[],
            }),
          });
          await client.query("COMMIT");
          return value;
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }
      },
      close: () => pool.end(),
    };
  }
  const db = new PGlite(path === ":memory:" ? undefined : path);
  await db.waitReady;
  return {
    query: async <T>(sql: string, params?: unknown[]) => ({
      rows: (await db.query(sql, params)).rows as T[],
    }),
    transaction: (fn) =>
      db.transaction((tx) =>
        fn({
          query: async <T>(sql: string, params?: unknown[]) => ({
            rows: (await tx.query(sql, params)).rows as T[],
          }),
        }),
      ),
    close: () => db.close(),
  };
}
export async function migrate(db: Database) {
  const sql = await readFile(
    new URL("../../migrations/001_initial.sql", import.meta.url),
    "utf8",
  );
  await db.transaction(async (tx) => {
    for (const statement of sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean))
      await tx.query(statement);
  });
}
export async function jsonRow<T>(
  db: Sql,
  sql: string,
  params: unknown[] = [],
): Promise<T | undefined> {
  return (await db.query<{ data: T }>(sql, params)).rows[0]?.data;
}
