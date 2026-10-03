import test from "node:test";
import assert from "node:assert/strict";
import {
  cropSchema,
  logSchema,
  registerSchema,
  profileSchema,
} from "../src/lib/validation.ts";
test("crop dates reject impossible calendar dates", () => {
  const input = {
    cropname: "Rice",
    variant: "Jasmine",
    crop_location: "North field",
    dateplanted: "2026-02-30",
  };
  assert.equal(cropSchema.safeParse(input).success, false);
  assert.equal(
    cropSchema.safeParse({ ...input, dateplanted: "2026-10-01" }).success,
    true,
  );
});
test("public registration cannot set an elevated role", () => {
  const value = registerSchema.parse({
    email: "farmer@example.test",
    user_name: "Farmer",
    password: "valid-password",
    user_type: "admin",
  });
  assert.equal(Object.hasOwn(value, "user_type"), false);
});
test("care logs require a harvest date and fertilizer details when applicable", () => {
  const log = {
    log_date: "2026-10-03T10:00",
    growth_stage: "Vegetative",
    temperature: 28,
    weather: "sunny",
    lastWatering_date: "",
    fertilized: "no",
    lastFertilization_date: "",
    fertilizer_name: "",
    pest_atk: "no",
    pest_kind: "",
    lastPesticide_date: "",
    pesticide_solution: "",
    harvest: "no",
    harvest_date: "",
    notes: "",
  };
  assert.equal(logSchema.safeParse(log).success, true);
  assert.equal(logSchema.safeParse({ ...log, harvest: "yes" }).success, false);
  assert.equal(
    logSchema.safeParse({ ...log, fertilized: "yes" }).success,
    false,
  );
  assert.equal(
    logSchema.safeParse({ ...log, log_date: "2026-02-30T10:00" }).success,
    false,
  );
  assert.equal(logSchema.safeParse({ ...log, temperature: "" }).success, false);
});
test("profile editing cannot write an account role", () => {
  const profile = {
    user_name: "Farmer",
    email: "farmer@example.test",
    fname: "",
    minitial: "",
    lname: "",
    birthdate: "",
    phone: "",
    street: "",
    barangay: "",
    city: "",
    province: "",
    country: "",
    postal_code: "",
    user_type: "admin",
  };
  assert.equal(Object.hasOwn(profileSchema.parse(profile), "user_type"), false);
});
