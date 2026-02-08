#!/usr/bin/env node

const path = require("path");
const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config();

const projectRoot = path.resolve(__dirname, "..");

const sql = `
insert into users (telegram_id, username, email)
values (100000001, 'demo_user', 'demo@example.com')
on conflict (telegram_id) do update set username = excluded.username;
`;

function getPoolConfig() {
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
}

async function main() {
  const pool = new Pool(getPoolConfig());
  try {
    await pool.query(sql);
    console.log("Seed finished.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`seed failed: ${error.message}`);
  process.exit(1);
});
