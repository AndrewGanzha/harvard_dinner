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
  "mysql",
  "migrations",
);

const dbUser = process.env.MYSQL_USER;
const dbPassword = process.env.MYSQL_PASSWORD;
const dbName = process.env.MYSQL_DATABASE;

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

function runMysqlSql(sql) {
  return runDockerCompose(
    [
      "exec",
      "-T",
      "mysql",
      "mysql",
      "-N",
      "-B",
      "-u",
      dbUser,
      dbName,
      "-e",
      sql,
    ],
    {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, MYSQL_PWD: dbPassword },
    },
  );
}

function applyMigrationSql(sql) {
  runDockerCompose(
    ["exec", "-T", "mysql", "mysql", "-u", dbUser, dbName],
    {
      input: sql,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, MYSQL_PWD: dbPassword },
    },
  );
}

function ensureDbRunning() {
  const services = runDockerCompose(["ps", "--services", "--filter", "status=running"]);
  const running = services.split("\n").map((line) => line.trim());
  if (!running.includes("mysql")) {
    throw new Error(
      "Container mysql is not running. Start stack first: docker compose up -d",
    );
  }
}

function ensureMigrationsTable() {
  runMysqlSql(`
    create table if not exists schema_migrations (
      version varchar(255) primary key,
      applied_at datetime not null default current_timestamp
    );
  `);
}

function getAppliedMigrations() {
  const out = runMysqlSql(`
    select version
    from schema_migrations
    order by version;
  `);

  if (!out) return new Set();
  return new Set(out.split("\n").map((line) => line.trim()).filter(Boolean));
}

function recordMigration(version) {
  const escaped = version.replace(/'/g, "''");
  runMysqlSql(`
    insert into schema_migrations (version)
    values ('${escaped}')
    on duplicate key update version = version;
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
  if (!dbUser || !dbPassword || !dbName) {
    throw new Error("MySQL credentials are missing in environment variables.");
  }

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
