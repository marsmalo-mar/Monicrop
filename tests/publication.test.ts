import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { assertDemoTarget } from "../scripts/demo-config.mjs";
import { publicationFindings } from "../scripts/publication-policy.mjs";

const demo = {
  DB_NAME: "monicrop_demo",
  DB_HOST: "127.0.0.1",
  APP_ORIGIN: "http://127.0.0.1:3001",
};

test("demo commands refuse the real database and remote destinations", () => {
  assert.doesNotThrow(() => assertDemoTarget(demo));
  for (const unsafe of [
    { ...demo, DB_NAME: "monicrop" },
    { ...demo, DB_NAME: "" },
    { ...demo, DB_HOST: "db.example.com" },
    { ...demo, APP_ORIGIN: "https://demo.example.com" },
    { ...demo, APP_ORIGIN: "http://127.0.0.1:3000" },
  ])
    assert.throws(() => assertDemoTarget(unsafe));
});

test("the public database schema contains definitions without personal records", async () => {
  const schema = await readFile(
    new URL("../database/schema.sql", import.meta.url),
    "utf8",
  );
  assert.match(schema, /CREATE TABLE `users_creds`/);
  assert.match(schema, /FOREIGN KEY/);
  assert.doesNotMatch(schema, /\b(INSERT|REPLACE)\s+INTO\b/i);
  assert.doesNotMatch(schema, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
});

test("publication checks reject private paths even if they were already tracked", () => {
  for (const path of [
    ".env.local",
    ".env.demo.local",
    "database/monicrop.sql",
    "profile/photo.png",
    "pics/crop.jpg",
    "test-results/fixtures.json",
    "private.pem",
    "login.php",
    "legacy/README.md",
    "legacy/profile/photo.png",
  ]) {
    assert.ok(publicationFindings(path, "").length, path);
  }
  assert.equal(
    publicationFindings(".env.demo.example", "DB_PASSWORD=\n").length,
    0,
  );
  assert.ok(
    publicationFindings(".env.example", "DB_PASSWORD=nonempty-value").length,
  );
});

test("publication checks detect personal records and credential patterns without printing values", () => {
  const token = ["ghp_", "a".repeat(36)].join("");
  assert.ok(publicationFindings("src/config.ts", token).length);
  assert.ok(
    publicationFindings(
      "database/schema.sql",
      "INSERT INTO users_creds VALUES (1);",
    ).length,
  );
  assert.ok(
    publicationFindings("notes.md", ["person", "gmail.com"].join("@")).length,
  );
  assert.equal(
    publicationFindings("README.md", "farmer@example.test").length,
    0,
  );
});
