export const createAppUsersTableSql = `
CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY NOT NULL,
  oai_user_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  storage_consent_version TEXT NOT NULL,
  storage_consent_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`;

export const createCaseSessionsTableSql = `
CREATE TABLE IF NOT EXISTS case_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL UNIQUE,
  snapshot_ciphertext TEXT NOT NULL,
  snapshot_iv TEXT NOT NULL,
  encryption_key_version INTEGER NOT NULL DEFAULT 1 CHECK (encryption_key_version >= 1),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
)`;

export const createCaseFilesTableSql = `
CREATE TABLE IF NOT EXISTS case_files (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  metadata_ciphertext TEXT NOT NULL,
  metadata_iv TEXT NOT NULL,
  content_iv TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 1 AND size_bytes <= 10485760),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'deleting', 'discarding')),
  encryption_key_version INTEGER NOT NULL DEFAULT 1 CHECK (encryption_key_version >= 1),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES app_users(id) ON DELETE CASCADE
)`;

export const createCaseFilesOwnerIndexSql = `
CREATE INDEX IF NOT EXISTS idx_case_files_user_created
ON case_files(user_id, created_at)`;

export const runtimeSchemaStatements = [
  createAppUsersTableSql,
  createCaseSessionsTableSql,
  createCaseFilesTableSql,
  createCaseFilesOwnerIndexSql,
] as const;
