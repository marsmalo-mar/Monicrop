import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";
const name = process.env.DB_NAME || "monicrop";
if (!/^[a-zA-Z0-9_]+$/.test(name))
  throw new Error("DB_NAME must contain letters, digits or underscores.");
const db = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
});
try {
  await db.query(
    `CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await db.query(`USE \`${name}\``);
  const [tables] = await db.query("SHOW TABLES");
  const existing = new Set(tables.map((row) => Object.values(row)[0]));
  const expected = [
    "consultant",
    "consultation",
    "crops",
    "crop_log",
    "users_creds",
  ];
  if (
    expected.some((table) => existing.has(table)) &&
    !expected.every((table) => existing.has(table))
  )
    throw new Error(
      "Partial legacy schema: restore missing tables before setup. No existing tables were modified.",
    );
  if (!expected.some((table) => existing.has(table))) {
    const schema = await readFile(
      new URL("../database/schema.sql", import.meta.url),
      "utf8",
    );
    for (const statement of schema.matchAll(
      /(?:CREATE TABLE|ALTER TABLE)[\s\S]*?;/g,
    ))
      await db.query(statement[0]);
    console.log(
      "Created clean table definitions without importing any records.",
    );
  }
  await db.query(`CREATE TABLE IF NOT EXISTS monicrop_auth (
    user_id INT PRIMARY KEY, password_hash VARCHAR(255) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users_creds(user_ID) ON DELETE CASCADE
  ) ENGINE=InnoDB`);
  await db.query(`CREATE TABLE IF NOT EXISTS monicrop_sessions (
    token_hash CHAR(64) PRIMARY KEY, user_id INT NOT NULL, expires_at DATETIME NOT NULL,
    INDEX (user_id), INDEX (expires_at),
    FOREIGN KEY (user_id) REFERENCES users_creds(user_ID) ON DELETE CASCADE
  ) ENGINE=InnoDB`);
  await db.query(`CREATE TABLE IF NOT EXISTS monicrop_uploads (
    path VARCHAR(255) PRIMARY KEY, user_id INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users_creds(user_ID) ON DELETE CASCADE
  ) ENGINE=InnoDB`);
  await db.query(`CREATE TABLE IF NOT EXISTS monicrop_login_attempts (
    identity_hash CHAR(64) PRIMARY KEY, attempts INT NOT NULL, reset_at DATETIME NOT NULL
  ) ENGINE=InnoDB`);
  console.log(
    `Database ${name} ready. Existing records and credentials preserved.`,
  );
} finally {
  await db.end();
}
