import { Pool } from "pg";
import fs from "fs";
import path from "path";

type PoolConfig = ConstructorParameters<typeof Pool>[0];

const getPoolConfig = (): PoolConfig => {
  const connectionString = process.env.DATABASE_URL;
  const host = process.env.PGHOST;
  const port = Number(process.env.PGPORT || 5432);
  const database = process.env.PGDATABASE || process.env.POSTGRES_DB;
  const user = process.env.PGUSER || process.env.POSTGRES_USER;
  const password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD;
  const sslEnabled =
    process.env.PGSSL === "true" ||
    process.env.PGSSL === "1" ||
    (connectionString ? connectionString.includes("sslmode=require") : false);

  if (!connectionString && (!host || !database || !user || !password)) {
    throw new Error("PostgreSQL credentials are missing in environment variables.");
  }

  return {
    connectionString: connectionString || undefined,
    host,
    port,
    database,
    user,
    password,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
  };
};

const ensureMigrationsTable = async (pool: Pool) => {
  await pool.query(`
    create table if not exists public.schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    );
  `);
};

const getAppliedMigrations = async (pool: Pool) => {
  const result = await pool.query<{ version: string }>(`
    select version
    from public.schema_migrations
    order by version;
  `);
  return new Set(result.rows.map((row) => row.version));
};

const recordMigration = async (pool: Pool, version: string) => {
  await pool.query(
    `
      insert into public.schema_migrations (version)
      values ($1)
      on conflict (version) do nothing;
    `,
    [version],
  );
};

const getMigrationFiles = () => {
  const migrationsDir = path.join(__dirname, "migrations");
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b))
    .map((file) => ({ file, fullPath: path.join(migrationsDir, file) }));
};

export const runMigrationsIfNeeded = async () => {
  const autoMigrate =
    process.env.AUTO_MIGRATE === undefined ||
    process.env.AUTO_MIGRATE === "true" ||
    process.env.AUTO_MIGRATE === "1";

  if (!autoMigrate) {
    return;
  }

  const pool = new Pool(getPoolConfig());
  try {
    await ensureMigrationsTable(pool);
    const files = getMigrationFiles();
    const applied = await getAppliedMigrations(pool);

    for (const { file, fullPath } of files) {
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(fullPath, "utf8");
      await pool.query(sql);
      await recordMigration(pool, file);
      console.log(`✅ Applied migration: ${file}`);
    }
  } finally {
    await pool.end();
  }
};
