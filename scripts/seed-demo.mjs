import mysql from "mysql2/promise";
import { randomBytes } from "node:crypto";
import { hashPassword } from "../src/lib/security.ts";
import {
  assertDemoTarget,
  demoAccounts,
  demoPassword,
} from "./demo-config.mjs";

assertDemoTarget(process.env);
const db = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME,
});
try {
  const [counts] = await db.query(
    "SELECT (SELECT COUNT(*) FROM users_creds) users,(SELECT COUNT(*) FROM crops) crops,(SELECT COUNT(*) FROM crop_log) logs,(SELECT COUNT(*) FROM consultant) consultants,(SELECT COUNT(*) FROM consultation) messages",
  );
  const [markers] = await db.query("SHOW TABLES LIKE 'monicrop_demo_seed'");
  if (Object.values(counts[0]).some((count) => count > 0)) {
    const [versions] = markers.length
      ? await db.query("SELECT version FROM monicrop_demo_seed WHERE version=1")
      : [[]];
    if (!versions.length)
      throw new Error(
        "Demo database has existing records without a demo marker. Refusing to replace or modify them.",
      );
    console.log(
      "Demo already seeded. Existing demo edits and passwords were preserved.",
    );
  } else {
    await db.query(
      "CREATE TABLE IF NOT EXISTS monicrop_demo_seed (version INT PRIMARY KEY) ENGINE=InnoDB",
    );
    await db.beginTransaction();
    try {
      const users = {};
      for (const person of demoAccounts) {
        const [result] = await db.execute(
          "INSERT INTO users_creds(user_name,email,pass,user_type,fname,lname) VALUES (?,?,?,?,?,?)",
          [
            `${person.first} ${person.last}`,
            person.email,
            randomBytes(24).toString("hex"),
            person.role,
            person.first,
            person.last,
          ],
        );
        users[person.role] = result.insertId;
        await db.execute(
          "INSERT INTO monicrop_auth(user_id,password_hash) VALUES (?,?)",
          [result.insertId, await hashPassword(demoPassword)],
        );
      }
      const [consultant] = await db.execute(
        "INSERT INTO consultant(user_ID,prof_name,expertise,certificate,description) VALUES (?,?,?,?,?)",
        [
          users.consultant,
          "Sam Consultant",
          "Crop care (fictional demo)",
          "Sample credential, not a real certification",
          "A fictional consultant for exploring the local demo.",
        ],
      );
      for (const [name, variety, stage] of [
        ["Rice", "Sample lowland variety", "Tillering"],
        ["Maize", "Sample sweet corn", "Vegetative"],
        ["Tomato", "Sample cherry variety", "Flowering"],
      ]) {
        const [crop] = await db.execute(
          "INSERT INTO crops(user_ID,cropname,variant,dateplanted,crop_location) VALUES (?,?,?,?,?)",
          [users.client, name, variety, "2026-09-01", "Fictional demo plot"],
        );
        await db.execute(
          "INSERT INTO crop_log(cropID,log_date,growth_stage,temperature,weather,lastWatering_date,fertilized,lastFertilization_date,fertilizer_name,pest_atk,pest_kind,lastPesticide_date,pesticide_solution,harvest,harvest_date,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          [
            crop.insertId,
            "2026-10-01 08:00:00",
            stage,
            28,
            "Sunny",
            "2026-10-01",
            "no",
            "",
            "",
            "no",
            "",
            "",
            "",
            "no",
            "",
            "Fictional observation for the demo. This is sample data, not agricultural advice.",
          ],
        );
      }
      for (const [direction, sender, recipient, message] of [
        [
          1,
          "Alex Farmer",
          "Sam Consultant",
          "This is a sample farmer question. Where can I find my crop care history?",
        ],
        [
          2,
          "Sam Consultant",
          "Alex Farmer",
          "Open Crops, choose a record, and review its care logs. This conversation is fictional demo content.",
        ],
      ])
        await db.execute(
          "INSERT INTO consultation(user_ID,cons_ID,tmp_ID,sender,sent_to,cons_date,message,status) VALUES (?,?,?,?,?,?,?,?)",
          [
            users.client,
            consultant.insertId,
            direction,
            sender,
            recipient,
            "2026-10-01 09:00:00",
            message,
            "Unread",
          ],
        );
      await db.execute(
        "INSERT IGNORE INTO monicrop_demo_seed(version) VALUES (1)",
      );
      await db.commit();
      console.log(
        "Created 3 fictional accounts, 3 crops, 3 care logs, and 2 messages. No existing database records were replaced.",
      );
    } catch (error) {
      await db.rollback();
      throw error;
    }
  }
  console.log("Local demo: http://127.0.0.1:3001");
  console.log(
    "Demo accounts: farmer@example.test, consultant@example.test, admin@example.test",
  );
  console.log(`Public demo password only: ${demoPassword}`);
} finally {
  await db.end();
}
