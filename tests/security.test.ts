import test from "node:test";
import assert from "node:assert/strict";
import {
  hashPassword,
  verifyPassword,
  isSameOrigin,
} from "../src/lib/security.ts";

test("password hashing uses fresh salts and rejects incorrect passwords", async () => {
  const first = await hashPassword("local-test-password");
  const second = await hashPassword("local-test-password");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("local-test-password", first), true);
  assert.equal(await verifyPassword("wrong", first), false);
  assert.equal(await verifyPassword("anything", "bad-hash"), false);
});

test("mutations must come from the app origin", () => {
  assert.equal(
    isSameOrigin("http://127.0.0.1:3000", "http://127.0.0.1:3000"),
    true,
  );
  assert.equal(
    isSameOrigin("http://localhost:3000", "http://127.0.0.1:3000"),
    false,
  );
  assert.equal(
    isSameOrigin("https://untrusted.example", "http://127.0.0.1:3000"),
    false,
  );
  assert.equal(isSameOrigin(null, "http://127.0.0.1:3000"), false);
});
