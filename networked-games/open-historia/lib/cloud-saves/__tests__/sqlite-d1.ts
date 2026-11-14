import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readFileSync } from 'node:fs';

/** Real SQLite transactions and FK enforcement behind the small D1 surface under test. */
export function sqliteD1(
  options: {
    beforeMigration?: (sqlite: DatabaseSync) => void;
    beforeBatch?: () => Promise<void>;
  } = {}
) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  sqlite.exec(
    readFileSync(new URL('../../../drizzle/0000_watery_scrambler.sql', import.meta.url), 'utf8')
  );
  options.beforeMigration?.(sqlite);
  sqlite.exec(
    readFileSync(new URL('../../../drizzle/0002_player_cloud_saves.sql', import.meta.url), 'utf8')
  );
  for (const id of ['alice', 'bob'])
    sqlite
      .prepare(
        'INSERT OR IGNORE INTO user(id,name,email,emailVerified,createdAt,updatedAt) VALUES(?,?,?,1,1,1)'
      )
      .run(id, id, `${id}@example.test`);
  class Statement {
    constructor(
      readonly sql: string,
      readonly values: SQLInputValue[] = []
    ) {}
    bind(...values: unknown[]) {
      return new Statement(
        this.sql,
        values.map((value) =>
          value instanceof ArrayBuffer ? new Uint8Array(value) : (value as SQLInputValue)
        )
      );
    }
    async first<T>(column?: string): Promise<T | null> {
      const row = sqlite.prepare(this.sql).get(...this.values) as
        | Record<string, unknown>
        | undefined;
      return (row ? (column ? row[column] : row) : null) as T | null;
    }
    async all<T>() {
      const results = sqlite.prepare(this.sql).all(...this.values);
      return { success: true, results: results as T[], meta: { changes: 0 } };
    }
    async run() {
      const result = sqlite.prepare(this.sql).run(...this.values);
      return { success: true, results: [], meta: { changes: Number(result.changes) } };
    }
    async raw() {
      return sqlite
        .prepare(this.sql)
        .all(...this.values)
        .map((row) => Object.values(row));
    }
  }
  const database = {
    prepare(sql: string) {
      return new Statement(sql);
    },
    withSession() {
      return database;
    },
    async batch(statements: Statement[]) {
      await options.beforeBatch?.();
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const result = [];
        for (const statement of statements)
          result.push({
            success: true,
            results: sqlite.prepare(statement.sql).all(...statement.values),
            meta: { changes: 0 },
          });
        sqlite.exec('COMMIT');
        return result;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return { sqlite, db: database as unknown as D1Database };
}
