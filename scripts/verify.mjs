import assert from "node:assert/strict";
import { randomBytes, scryptSync } from "node:crypto";
import mysql from "mysql2/promise";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
const origin = process.env.APP_ORIGIN || "http://127.0.0.1:3000";
const db = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "monicrop",
});
const ids = [];
const prefix = `verify-${Date.now()}`;
const password = "Monicrop-test-2026!";
const fixtures = {};
const legacyFixtureFiles = [];
async function create(role) {
  const email = `${prefix}-${role}@example.test`;
  const [result] = await db.execute(
    "INSERT INTO users_creds(user_name,email,pass,user_type,fname,lname) VALUES (?,?,?,?,?,?)",
    [
      `Test ${role}`,
      email,
      randomBytes(24).toString("hex"),
      role,
      "Test",
      role,
    ],
  );
  ids.push(result.insertId);
  const salt = randomBytes(16).toString("hex");
  const hash = `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
  await db.execute(
    "INSERT INTO monicrop_auth(user_id,password_hash) VALUES (?,?)",
    [result.insertId, hash],
  );
  fixtures[role] = { id: result.insertId, email, password };
  return result.insertId;
}
async function login(email) {
  const response = await fetch(`${origin}/api/auth/login`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 200, await response.clone().text());
  return response.headers.get("set-cookie").split(";")[0];
}
async function api(
  path,
  method = "GET",
  data,
  session,
  expected = 200,
  customOrigin = origin,
) {
  const response = await fetch(`${origin}/api/${path}`, {
    method,
    headers: {
      Origin: customOrigin,
      ...(data instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(session ? { Cookie: session } : {}),
    },
    body:
      data === undefined
        ? undefined
        : data instanceof FormData
          ? data
          : JSON.stringify(data),
  });
  const result = await response.json();
  assert.equal(
    response.status,
    expected,
    `${method} ${path}: ${JSON.stringify(result)}`,
  );
  return result;
}
try {
  const [before] = await db.query(
    "SELECT (SELECT COUNT(*) FROM users_creds) users,(SELECT COUNT(*) FROM crops) crops,(SELECT COUNT(*) FROM crop_log) logs,(SELECT COUNT(*) FROM consultation) messages",
  );
  const adminId = await create("admin");
  const farmerId = await create("client");
  const consultantId = await create("consultant");
  const otherId = await create("other");
  // The other fixture is a farmer. Its DB role is set separately to keep unique fixture names.
  await db.execute(
    "UPDATE users_creds SET user_type='client',pass=? WHERE user_ID=?",
    [password, otherId],
  );
  await db.execute("DELETE FROM monicrop_auth WHERE user_id=?", [otherId]);
  const admin = await login(fixtures.admin.email);
  const farmer = await login(fixtures.client.email);
  const consultant = await login(fixtures.consultant.email);
  const other = await login(fixtures.other.email);
  const [legacyUpgrade] = await db.execute(
    "SELECT u.pass,a.password_hash FROM users_creds u JOIN monicrop_auth a ON a.user_id=u.user_ID WHERE u.user_ID=?",
    [otherId],
  );
  assert.equal(legacyUpgrade[0].pass, password);
  assert.match(legacyUpgrade[0].password_hash, /^scrypt:/);
  const status = await api("status");
  assert.equal(status.database, "connected");
  await api("crops", "GET", undefined, undefined, 401);
  await api("accounts", "GET", undefined, farmer, 403);
  await api(
    "auth/register",
    "POST",
    { email: fixtures.client.email, password, user_name: "Duplicate" },
    undefined,
    409,
  );
  await api(
    "crops",
    "POST",
    {
      cropname: "Unauthorized",
      variant: "",
      dateplanted: "2026-10-01",
      crop_location: "Local",
    },
    farmer,
    403,
    "https://untrusted.example",
  );
  await api(
    "crops",
    "POST",
    { cropname: "", variant: "", dateplanted: "2026-02-30", crop_location: "" },
    farmer,
    422,
  );
  const { id: cropId } = await api(
    "crops",
    "POST",
    {
      cropname: "Test rice",
      variant: "Jasmine",
      dateplanted: "2026-10-01",
      crop_location: "Temporary test field",
    },
    farmer,
    201,
  );
  const badUpload = new FormData();
  badUpload.set(
    "file",
    new Blob(["not an image"], { type: "image/png" }),
    "invalid.png",
  );
  await api("uploads", "POST", badUpload, farmer, 422);
  const png = await sharp({
    create: { width: 20, height: 20, channels: 3, background: "#165b36" },
  })
    .png()
    .toBuffer();
  const uploadForm = new FormData();
  uploadForm.set("file", new Blob([png], { type: "image/png" }), "test.png");
  const uploaded = await api("uploads", "POST", uploadForm, farmer, 201);
  // Stored DB paths remain unchanged when the original image folders move.
  for (const folder of ["pics", "profile"]) {
    const stored = `${folder}/${prefix}.png`;
    const file = path.join(process.cwd(), "legacy", folder, `${prefix}.png`);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, png, { flag: "wx" });
    legacyFixtureFiles.push(file);
    await db.execute("UPDATE users_creds SET profile_pic=? WHERE user_ID=?", [
      stored,
      farmerId,
    ]);
    const response = await fetch(
      `${origin}/api/media?path=${encodeURIComponent(stored)}`,
      { headers: { Cookie: farmer } },
    );
    assert.equal(
      response.status,
      200,
      `Relocated legacy ${folder} image must remain accessible`,
    );
    assert.equal(response.headers.get("content-type"), "image/png");
    await api(
      `media?path=${encodeURIComponent(stored)}`,
      "GET",
      undefined,
      other,
      404,
    );
  }
  await db.execute("UPDATE users_creds SET profile_pic=NULL WHERE user_ID=?", [
    farmerId,
  ]);
  const imageResponse = await fetch(
    `${origin}/api/media?path=${encodeURIComponent(uploaded.path)}`,
    { headers: { Cookie: farmer } },
  );
  assert.equal(imageResponse.status, 200);
  assert.equal(imageResponse.headers.get("content-type"), "image/webp");
  await api(
    `media?path=${encodeURIComponent(uploaded.path)}`,
    "GET",
    undefined,
    other,
    404,
  );
  await api(`crops/${cropId}`, "GET", undefined, other, 404);
  await api(
    `crops/${cropId}`,
    "PATCH",
    {
      cropname: "Updated test rice",
      variant: "Jasmine",
      dateplanted: "2026-10-01",
      crop_location: "Temporary test field",
    },
    farmer,
  );
  assert.equal(
    (await api(`crops/${cropId}`, "GET", undefined, farmer)).cropname,
    "Updated test rice",
  );
  const log = {
    log_date: "2026-10-03T10:00",
    growth_stage: "Vegetative",
    temperature: 28,
    weather: "sunny",
    lastWatering_date: "2026-10-02",
    fertilized: "yes",
    lastFertilization_date: "2026-10-02",
    fertilizer_name: "Test fertilizer",
    pest_atk: "no",
    pest_kind: "",
    lastPesticide_date: "",
    pesticide_solution: "",
    harvest: "no",
    harvest_date: "",
    notes: "Temporary integration log",
    image: uploaded.path,
  };
  const { id: logId } = await api(
    `crops/${cropId}/logs`,
    "POST",
    log,
    farmer,
    201,
  );
  assert.equal(
    (await api(`crops/${cropId}/logs`, "GET", undefined, farmer))[0].notes,
    log.notes,
  );
  await api(
    `crops/${cropId}/logs/${logId}`,
    "PATCH",
    { ...log, notes: "Edited care log" },
    farmer,
  );
  await api(`crops/${cropId}/logs/${logId}`, "DELETE", undefined, other, 404);
  await api(
    "credentials",
    "PATCH",
    {
      prof_name: "Test agronomist",
      expertise: "Crop care",
      certificate: "Test qualification",
      description: "Temporary test consultant",
    },
    consultant,
  );
  const directory = await api("consultants", "GET", undefined, farmer);
  const consId = directory.find((row) => row.user_ID === consultantId).cons_ID;
  assert.notEqual(
    consId,
    consultantId,
    "Fixture should exercise different consultant/user IDs",
  );
  await api(
    `conversations/${consId}/${farmerId}`,
    "POST",
    { message: "Local integration question", pictu: uploaded.path },
    farmer,
    201,
  );
  assert.equal(
    (
      await fetch(
        `${origin}/api/media?path=${encodeURIComponent(uploaded.path)}`,
        { headers: { Cookie: consultant } },
      )
    ).status,
    200,
  );
  assert.equal(
    (await api("conversations", "GET", undefined, consultant))[0].unread,
    1,
  );
  await api(
    `conversations/${consId}/${farmerId}/read`,
    "POST",
    undefined,
    consultant,
  );
  await api(
    `conversations/${consId}/${farmerId}`,
    "POST",
    { message: "Local integration reply" },
    consultant,
    201,
  );
  const conversation = await api(
    `conversations/${consId}/${farmerId}`,
    "GET",
    undefined,
    farmer,
  );
  assert.equal(conversation.messages.length, 2);
  await api(
    `conversations/${consId}/${farmerId}`,
    "GET",
    undefined,
    other,
    403,
  );
  await api(
    `conversations/${consId}/${farmerId}/read`,
    "POST",
    undefined,
    farmer,
  );
  assert.equal(
    (await api("conversations", "GET", undefined, farmer))[0].unread,
    0,
  );
  const accounts = await api("accounts", "GET", undefined, admin);
  assert(
    accounts.every(
      (row) =>
        !Object.hasOwn(row, "pass") && !Object.hasOwn(row, "password_hash"),
    ),
  );
  await api(`accounts/${adminId}`, "DELETE", undefined, admin, 409);
  const { id: addedId } = await api(
    "accounts",
    "POST",
    {
      user_name: "Temporary account",
      email: `${prefix}-added@example.test`,
      password,
      user_type: "client",
      fname: "Temporary",
      minitial: "",
      lname: "Farmer",
    },
    admin,
    201,
  );
  ids.push(addedId);
  await api(
    `accounts/${addedId}`,
    "PATCH",
    {
      user_name: "Edited account",
      email: `${prefix}-added@example.test`,
      password: "",
      user_type: "client",
      fname: "Temporary",
      minitial: "",
      lname: "Farmer",
    },
    admin,
  );
  assert.equal(
    (await api(`accounts/${addedId}`, "GET", undefined, admin)).user_name,
    "Edited account",
  );
  await api(`accounts/${addedId}`, "DELETE", undefined, admin);
  const { user } = await api("me", "GET", undefined, farmer);
  const profile = Object.fromEntries(
    [
      "user_name",
      "email",
      "fname",
      "minitial",
      "lname",
      "birthdate",
      "phone",
      "street",
      "barangay",
      "city",
      "province",
      "country",
      "postal_code",
    ].map((key) => [key, user[key] || ""]),
  );
  await api(
    "me",
    "PATCH",
    {
      ...profile,
      phone: "09170000000",
      profile_pic: null,
      password: "",
      user_type: "admin",
    },
    farmer,
  );
  assert.equal(
    (await api("me", "GET", undefined, farmer)).user.user_type,
    "client",
  );
  await api(`crops/${cropId}/logs/${logId}`, "DELETE", undefined, farmer);
  // Keep a realistic record for the optional browser pass, otherwise delete it.
  if (process.argv.includes("--keep")) {
    for (let index = 1; index <= 8; index++)
      await api(
        "crops",
        "POST",
        {
          cropname: `Pagination test crop ${index}`,
          variant: "Test variety",
          dateplanted: "2026-10-01",
          crop_location: "Temporary test field",
        },
        farmer,
        201,
      );
    await api(
      `crops/${cropId}/logs`,
      "POST",
      {
        ...log,
        fertilized: "no",
        fertilizer_name: "",
        lastFertilization_date: "",
        notes: "Healthy growth observed in the temporary test field.",
      },
      farmer,
      201,
    );
    await mkdir("test-results", { recursive: true });
    await writeFile(
      "test-results/fixtures.json",
      JSON.stringify(
        { fixtures, ids, cropId, consId, before: before[0] },
        null,
        2,
      ),
    );
    console.log(
      "Integration checks passed. Temporary fixtures retained for browser verification.",
    );
  } else {
    await api(`crops/${cropId}`, "DELETE", undefined, farmer);
    await api(
      "me",
      "PATCH",
      { ...profile, password: "Changed-test-password!", profile_pic: null },
      farmer,
    );
    await api("me", "GET", undefined, farmer, 401);
    await api(
      "auth/login",
      "POST",
      { email: fixtures.client.email, password },
      undefined,
      401,
    );
    const relogin = await fetch(`${origin}/api/auth/login`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: fixtures.client.email,
        password: "Changed-test-password!",
      }),
    });
    assert.equal(relogin.status, 200);
    const changedSession = relogin.headers.get("set-cookie").split(";")[0];
    await api("auth/logout", "POST", undefined, changedSession);
    await api("me", "GET", undefined, changedSession, 401);
    console.log(
      "Integration checks passed: auth, roles, crop/log CRUD, consultations, read status, account CRUD, profile, CSRF and validation.",
    );
  }
} finally {
  for (const file of legacyFixtureFiles) await unlink(file);
  if (!process.argv.includes("--keep"))
    for (const id of ids) {
      await db.execute(
        "DELETE m FROM consultation m LEFT JOIN consultant c ON c.cons_ID=m.cons_ID WHERE m.user_ID=? OR c.user_ID=?",
        [id, id],
      );
      await db.execute(
        "DELETE FROM users_creds WHERE user_ID=? AND email LIKE ?",
        [id, `${prefix}%`],
      );
    }
  await db.end();
}
