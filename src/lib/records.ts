import { execute, query } from "./db";
import { ensure } from "./api";
import type { Crop, CropLog, User } from "./types";
import { cropSchema, logSchema } from "./validation";
import type { z } from "zod";
export async function ownCrop(user: User, id: number) {
  ensure(
    user.user_type === "client",
    403,
    "Crop records are available to farmers.",
  );
  const crop = (
    await query<Crop>("SELECT * FROM crops WHERE cropID=? AND user_ID=?", [
      id,
      user.user_ID,
    ])
  )[0];
  ensure(crop, 404, "Crop not found.");
  return crop;
}
export async function listCrops(user: User) {
  ensure(
    user.user_type === "client",
    403,
    "Crop records are available to farmers.",
  );
  return query<Crop>(
    "SELECT c.*, (SELECT COUNT(*) FROM crop_log l WHERE l.cropID=c.cropID) AS log_count FROM crops c WHERE c.user_ID=? ORDER BY c.cropID DESC",
    [user.user_ID],
  );
}
export async function saveCrop(
  user: User,
  data: z.infer<typeof cropSchema>,
  id?: number,
) {
  ensure(
    user.user_type === "client",
    403,
    "Crop records are available to farmers.",
  );
  if (id) {
    await ownCrop(user, id);
    await execute(
      "UPDATE crops SET cropname=?,variant=?,dateplanted=?,crop_location=? WHERE cropID=? AND user_ID=?",
      [...Object.values(data), id, user.user_ID],
    );
    return id;
  }
  return (
    await execute(
      "INSERT INTO crops(cropname,variant,dateplanted,crop_location,user_ID) VALUES (?,?,?,?,?)",
      [...Object.values(data), user.user_ID],
    )
  ).insertId;
}
export async function ownLog(user: User, id: number) {
  const log = (
    await query<CropLog>(
      "SELECT l.* FROM crop_log l JOIN crops c ON c.cropID=l.cropID WHERE l.logID=? AND c.user_ID=?",
      [id, user.user_ID],
    )
  )[0];
  ensure(log && user.user_type === "client", 404, "Care log not found.");
  return log;
}
export async function saveLog(
  user: User,
  cropId: number,
  data: z.infer<typeof logSchema>,
  id?: number,
) {
  await ownCrop(user, cropId);
  const previous = id ? await ownLog(user, id) : null;
  ensure(!previous || previous.cropID === cropId, 404, "Care log not found.");
  const image =
    data.image === undefined ? (previous?.image ?? null) : data.image;
  await validateImage(user, image, previous?.image);
  const values = [
    data.log_date.replace("T", " "),
    data.growth_stage,
    data.temperature,
    data.weather,
    data.lastWatering_date,
    data.fertilized,
    data.lastFertilization_date,
    data.fertilizer_name,
    data.pest_atk,
    data.pest_kind,
    data.lastPesticide_date,
    data.pesticide_solution,
    image,
    data.harvest,
    data.harvest_date,
    data.notes,
  ];
  if (id) {
    await execute(
      "UPDATE crop_log SET log_date=?,growth_stage=?,temperature=?,weather=?,lastWatering_date=?,fertilized=?,lastFertilization_date=?,fertilizer_name=?,pest_atk=?,pest_kind=?,lastPesticide_date=?,pesticide_solution=?,image=?,harvest=?,harvest_date=?,notes=? WHERE logID=?",
      [...values, id],
    );
    return id;
  }
  return (
    await execute(
      "INSERT INTO crop_log(log_date,growth_stage,temperature,weather,lastWatering_date,fertilized,lastFertilization_date,fertilizer_name,pest_atk,pest_kind,lastPesticide_date,pesticide_solution,image,harvest,harvest_date,notes,cropID) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [...values, cropId],
    )
  ).insertId;
}
export async function validateImage(
  user: User,
  path: string | null | undefined,
  previous?: string | null,
) {
  if (!path || path === previous) return;
  const rows = await query(
    "SELECT path FROM monicrop_uploads WHERE path=? AND user_id=?",
    [path, user.user_ID],
  );
  ensure(rows.length, 422, "Upload the image through Monicrop first.");
}
