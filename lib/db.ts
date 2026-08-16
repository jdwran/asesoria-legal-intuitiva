import { env } from "cloudflare:workers";

import { runtimeSchemaStatements } from "../db/schema.ts";

type D1Result<T = unknown> = {
  success: boolean;
  results?: T[];
  meta?: {
    changes?: number;
  };
};

type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
};

type D1Database = {
  prepare(query: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
};

export type AppUserRecord = {
  id: string;
  oaiUserId: string;
  displayName: string;
};

export type StoredCaseSession = {
  id: string;
  ciphertext: string;
  iv: string;
  keyVersion: number;
  revision: number;
};

const initializedDatabases = new WeakMap<object, Promise<void>>();

function databaseBinding(): D1Database {
  const binding = env.DB as D1Database | undefined;
  if (!binding || typeof binding.prepare !== "function" || typeof binding.batch !== "function") {
    throw new Error("Database binding is unavailable.");
  }
  return binding;
}

async function ensureRuntimeSchema(database: D1Database): Promise<void> {
  let initialization = initializedDatabases.get(database as object);
  if (!initialization) {
    initialization = database
      .batch(runtimeSchemaStatements.map((statement) => database.prepare(statement)))
      .then(() => undefined);
    initializedDatabases.set(database as object, initialization);
  }

  try {
    await initialization;
  } catch (error) {
    initializedDatabases.delete(database as object);
    throw error;
  }
}

export async function getDatabase(): Promise<D1Database> {
  const database = databaseBinding();
  await ensureRuntimeSchema(database);
  return database;
}

type AppUserRow = {
  id: string;
  oai_user_id: string;
  display_name: string;
};

function mapAppUser(row: AppUserRow): AppUserRecord {
  return {
    id: row.id,
    oaiUserId: row.oai_user_id,
    displayName: row.display_name,
  };
}

export async function upsertActiveAppUser(input: {
  oaiUserId: string;
  email: string;
  displayName: string;
  consentVersion: string;
}): Promise<AppUserRecord> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const row = await database
    .prepare(
      `INSERT INTO app_users (
        id, oai_user_id, email, display_name, status,
        storage_consent_version, storage_consent_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)
      ON CONFLICT(oai_user_id) DO UPDATE SET
        email = excluded.email,
        display_name = excluded.display_name,
        storage_consent_version = excluded.storage_consent_version,
        storage_consent_at = excluded.storage_consent_at,
        updated_at = excluded.updated_at
      WHERE app_users.status = 'active'
      RETURNING id, oai_user_id, display_name`,
    )
    .bind(
      crypto.randomUUID(),
      input.oaiUserId,
      input.email,
      input.displayName,
      input.consentVersion,
      now,
      now,
      now,
    )
    .first<AppUserRow>();

  if (!row) throw new Error("Account could not be saved.");
  return mapAppUser(row);
}

export async function findActiveAppUser(oaiUserId: string): Promise<AppUserRecord | null> {
  const database = await getDatabase();
  const row = await database
    .prepare(
      `SELECT id, oai_user_id, display_name
       FROM app_users
       WHERE oai_user_id = ? AND status = 'active'
       LIMIT 1`,
    )
    .bind(oaiUserId)
    .first<AppUserRow>();
  return row ? mapAppUser(row) : null;
}

type CaseSessionRow = {
  id: string;
  snapshot_ciphertext: string;
  snapshot_iv: string;
  encryption_key_version: number;
  revision: number;
};

export async function findOwnedCaseSession(user: AppUserRecord): Promise<StoredCaseSession | null> {
  const database = await getDatabase();
  const row = await database
    .prepare(
      `SELECT
         case_sessions.id,
         case_sessions.snapshot_ciphertext,
         case_sessions.snapshot_iv,
         case_sessions.encryption_key_version,
         case_sessions.revision
       FROM case_sessions
       INNER JOIN app_users ON app_users.id = case_sessions.user_id
       WHERE case_sessions.user_id = ?
         AND app_users.id = ?
         AND app_users.oai_user_id = ?
         AND app_users.status = 'active'
       LIMIT 1`,
    )
    .bind(user.id, user.id, user.oaiUserId)
    .first<CaseSessionRow>();

  return row
    ? {
        id: row.id,
        ciphertext: row.snapshot_ciphertext,
        iv: row.snapshot_iv,
        keyVersion: row.encryption_key_version,
        revision: row.revision,
      }
    : null;
}

export async function createOwnedCaseSession(input: {
  user: AppUserRecord;
  ciphertext: string;
  iv: string;
}): Promise<boolean> {
  const database = await getDatabase();
  const now = new Date().toISOString();
  const result = await database
    .prepare(
      `INSERT INTO case_sessions (
        id, user_id, snapshot_ciphertext, snapshot_iv,
        encryption_key_version, revision, created_at, updated_at
      )
      SELECT ?, app_users.id, ?, ?, 1, 1, ?, ?
      FROM app_users
      WHERE app_users.id = ?
        AND app_users.oai_user_id = ?
        AND app_users.status = 'active'
      ON CONFLICT(user_id) DO NOTHING`,
    )
    .bind(
      crypto.randomUUID(),
      input.ciphertext,
      input.iv,
      now,
      now,
      input.user.id,
      input.user.oaiUserId,
    )
    .run();
  return result.meta?.changes === 1;
}

export async function updateOwnedCaseSession(input: {
  user: AppUserRecord;
  ciphertext: string;
  iv: string;
  expectedRevision: number;
}): Promise<boolean> {
  const database = await getDatabase();
  const result = await database
    .prepare(
      `UPDATE case_sessions
       SET snapshot_ciphertext = ?,
           snapshot_iv = ?,
           encryption_key_version = 1,
           revision = revision + 1,
           updated_at = ?
       WHERE user_id = ?
         AND revision = ?
         AND EXISTS (
           SELECT 1
           FROM app_users
           WHERE app_users.id = case_sessions.user_id
             AND app_users.id = ?
             AND app_users.oai_user_id = ?
             AND app_users.status = 'active'
         )`,
    )
    .bind(
      input.ciphertext,
      input.iv,
      new Date().toISOString(),
      input.user.id,
      input.expectedRevision,
      input.user.id,
      input.user.oaiUserId,
    )
    .run();
  return result.meta?.changes === 1;
}
