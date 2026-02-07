#!/usr/bin/env node

const { spawnSync } = require("child_process");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const projectRoot = path.resolve(__dirname, "..");
const dbUser = process.env.SUPABASE_DB_USER || "postgres";
const dbName = process.env.SUPABASE_DB_NAME || "postgres";

const sql = `
insert into public.users (telegram_id, username, email)
values (100000001, 'demo_user', 'demo@example.com')
on conflict (telegram_id) do update
set username = excluded.username;
`;

const result = spawnSync(
  "docker",
  [
    "compose",
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
  {
    cwd: projectRoot,
    input: sql,
    encoding: "utf8",
  },
);

if (result.status !== 0) {
  const stderr = result.stderr ? result.stderr.trim() : "unknown error";
  console.error(`seed failed: ${stderr}`);
  process.exit(1);
}

console.log("Seed finished.");
