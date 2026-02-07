#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const dotenv = require("dotenv");

dotenv.config();

const projectRoot = path.resolve(__dirname, "..");
const migrationsDir = path.join(
  projectRoot,
  "src",
  "services",
  "supabase",
  "migrations",
);

const dbUser = process.env.SUPABASE_DB_USER || "postgres";
const dbName = process.env.SUPABASE_DB_NAME || "postgres";

function runDockerCompose(args, options = {}) {
  const result = spawnSync("docker", ["compose", ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    ...options,
  });

  if (result.status !== 0) {
    const stderr = result.stderr ? result.stderr.trim() : "unknown error";
    throw new Error(`docker compose ${args.join(" ")} failed: ${stderr}`);
  }

  return result.stdout ? result.stdout.trim() : "";
}

function runPsqlSql(sql) {
  return runDockerCompose(
    [
      "exec",
      "-T",
      "supabase-db",
      "psql",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      dbUser,
      "-d",
      dbName,
      "-t",
      "-A",
      "-c",
      sql,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
}

function applyMigrationSql(sql) {
  runDockerCompose(
    [
      "exec",
      "-T",
      "supabase-db",
      "psql",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      dbUser,
      "-d",
      dbName,
    ],
    { input: sql, stdio: ["pipe", "pipe", "pipe"] },
  );
}

function ensureDbRunning() {
  const services = runDockerCompose(["ps", "--services", "--filter", "status=running"]);
  const running = services.split("\n").map((line) => line.trim());
  if (!running.includes("supabase-db")) {
    throw new Error(
      "Container supabase-db is not running. Start stack first: docker compose up -d",
    );
  }
}

function ensureMigrationsTable() {
  runPsqlSql(`
    create table if not exists public.schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    );
  `);
}

function getAppliedMigrations() {
  const out = runPsqlSql(`
    select version
    from public.schema_migrations
    order by version;
  `);

  if (!out) return new Set();
  return new Set(out.split("\n").map((line) => line.trim()).filter(Boolean));
}

function recordMigration(version) {
  const escaped = version.replace(/'/g, "''");
  runPsqlSql(`
    insert into public.schema_migrations (version)
    values ('${escaped}')
    on conflict (version) do nothing;
  `);
}

function getMigrationFiles() {
  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }

  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));
}

function main() {
  ensureDbRunning();
  ensureMigrationsTable();

  const files = getMigrationFiles();
  const applied = getAppliedMigrations();

  if (files.length === 0) {
    console.log("No migration files found.");
    return;
  }

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`skip ${file}`);
      continue;
    }

    const fullPath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(fullPath, "utf8");

    console.log(`apply ${file}`);
    applyMigrationSql(sql);
    recordMigration(file);
  }

  console.log("Migrations finished.");
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
