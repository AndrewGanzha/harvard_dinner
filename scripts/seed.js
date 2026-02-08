#!/usr/bin/env node

const { spawnSync } = require("child_process");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const projectRoot = path.resolve(__dirname, "..");
const dbUser = process.env.PGUSER || process.env.POSTGRES_USER;
const dbPassword = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD;
const dbName = process.env.PGDATABASE || process.env.POSTGRES_DB;

const sql = `
insert into users (telegram_id, username, email)
values (100000001, 'demo_user', 'demo@example.com')
on duplicate key update username = values(username);
`;

if (!dbUser || !dbPassword || !dbName) {
  console.error("PostgreSQL credentials are missing in environment variables.");
  process.exit(1);
}

const result = spawnSync(
  "docker",
  [
    "compose",
    "exec",
    "-T",
    "postgres",
    "psql",
    "-U",
    dbUser,
    "-d",
    dbName,
  ],
  {
    cwd: projectRoot,
    input: sql,
    encoding: "utf8",
    env: { ...process.env, PGPASSWORD: dbPassword },
  },
);

if (result.status !== 0) {
  const stderr = result.stderr ? result.stderr.trim() : "unknown error";
  console.error(`seed failed: ${stderr}`);
  process.exit(1);
}

console.log("Seed finished.");
