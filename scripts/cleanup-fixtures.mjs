import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";
const { fixtures, before } = JSON.parse(
  await readFile("test-results/fixtures.json", "utf8"),
);
const db = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "monicrop",
});
try {
  for (const fixture of Object.values(fixtures)) {
    assert.match(
      fixture.email,
      /^verify-\d+-(admin|client|consultant|other)@example\.test$/,
    );
    const [owned] = await db.execute(
      "SELECT user_ID FROM users_creds WHERE user_ID=? AND email=?",
      [fixture.id, fixture.email],
    );
    if (!owned.length) continue;
    await db.execute(
      "DELETE m FROM consultation m LEFT JOIN consultant c ON c.cons_ID=m.cons_ID WHERE m.user_ID=? OR c.user_ID=?",
      [fixture.id, fixture.id],
    );
    await db.execute("DELETE FROM users_creds WHERE user_ID=? AND email=?", [
      fixture.id,
      fixture.email,
    ]);
  }
  const [after] = await db.query(
    "SELECT (SELECT COUNT(*) FROM users_creds) users,(SELECT COUNT(*) FROM crops) crops,(SELECT COUNT(*) FROM crop_log) logs,(SELECT COUNT(*) FROM consultation) messages",
  );
  assert.deepEqual(
    after[0],
    before,
    "Record counts changed outside the fixture set; inspect before claiming preservation.",
  );
  console.log(
    "Browser fixtures removed. Original user/crop/log/message counts are unchanged.",
  );
} finally {
  await db.end();
}
