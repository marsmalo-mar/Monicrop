import { z } from "zod";
const text = (max: number) => z.string().trim().max(max);
const required = (max: number) => text(max).min(1, "This field is required.");
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date.")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Use a valid date.");
const optionalDate = z.union([date, z.literal("")]);
export const password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128);
export const loginSchema = z.object({
  email: z.email().max(100),
  password: z.string().min(1).max(128),
});
export const registerSchema = z.object({
  user_name: required(50),
  email: z.email().max(100),
  password,
});
export const cropSchema = z.object({
  cropname: required(100),
  variant: text(100),
  dateplanted: date,
  crop_location: required(255),
});
const yesNo = z.enum(["yes", "no"]);
export const logSchema = z
  .object({
    log_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}[T ]([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
      .refine(
        (v) => date.safeParse(v.slice(0, 10)).success,
        "Use a valid date and time.",
      ),
    growth_stage: required(100),
    temperature: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.coerce.number().min(-99).max(99),
    ),
    weather: required(100),
    lastWatering_date: optionalDate,
    fertilized: yesNo,
    lastFertilization_date: optionalDate,
    fertilizer_name: text(100),
    pest_atk: yesNo,
    pest_kind: text(100),
    lastPesticide_date: optionalDate,
    pesticide_solution: text(100),
    harvest: yesNo,
    harvest_date: optionalDate,
    notes: text(10000),
    image: z.string().max(255).nullable().optional(),
  })
  .superRefine((value, context) => {
    if (
      value.fertilized === "yes" &&
      (!value.lastFertilization_date || !value.fertilizer_name)
    )
      context.addIssue({
        code: "custom",
        path: ["fertilizer_name"],
        message: "Add the fertilizer name and application date.",
      });
    if (value.harvest === "yes" && !value.harvest_date)
      context.addIssue({
        code: "custom",
        path: ["harvest_date"],
        message: "Add the harvest date.",
      });
  });
export const profileSchema = z.object({
  user_name: required(50),
  email: z.email().max(100),
  fname: text(50),
  minitial: text(5),
  lname: text(50),
  birthdate: optionalDate,
  phone: text(20),
  street: text(100),
  barangay: text(100),
  city: text(100),
  province: text(100),
  country: text(100),
  postal_code: text(10),
  profile_pic: z.string().max(255).nullable().optional(),
  password: z.union([password, z.literal("")]).optional(),
});
export const accountSchema = registerSchema.extend({
  user_type: z.enum(["client", "consultant", "admin"]),
  fname: text(50),
  minitial: text(5),
  lname: text(50),
});
export const accountEditSchema = accountSchema.extend({
  password: z.union([password, z.literal("")]),
});
export const credentialSchema = z.object({
  prof_name: required(100),
  expertise: required(255),
  certificate: text(255),
  description: text(10000),
});
export const messageSchema = z.object({
  message: required(10000),
  pictu: z.string().max(100).nullable().optional(),
});
