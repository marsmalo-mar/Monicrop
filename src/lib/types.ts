export type Role = "client" | "consultant" | "admin";
export interface User {
  user_ID: number;
  user_name: string;
  email: string;
  user_type: Role;
  fname: string | null;
  minitial: string | null;
  lname: string | null;
  prof_name: string | null;
  birthdate: string | null;
  phone: string | null;
  street: string | null;
  barangay: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  postal_code: string | null;
  profile_pic: string | null;
}
export interface Crop {
  cropID: number;
  user_ID: number;
  cropname: string;
  variant: string;
  dateplanted: string;
  crop_location: string;
  log_count?: number;
}
export interface CropLog {
  logID: number;
  cropID: number;
  log_date: string;
  growth_stage: string;
  temperature: string | number;
  weather: string;
  lastWatering_date: string;
  fertilized: string;
  lastFertilization_date: string;
  fertilizer_name: string;
  pest_atk: string;
  pest_kind: string;
  lastPesticide_date: string;
  pesticide_solution: string;
  image: string | null;
  harvest: string;
  harvest_date: string;
  notes: string;
}
export interface Consultant {
  cons_ID: number;
  user_ID: number;
  prof_name: string;
  expertise: string;
  certificate: string;
  description: string;
}
export interface Message {
  msg_no: number;
  user_ID: number;
  cons_ID: number;
  tmp_ID: number;
  sender: string;
  sent_to: string;
  cons_date: string;
  message: string;
  pictu: string | null;
  status: string;
}
export interface Conversation {
  user_ID: number;
  cons_ID: number;
  name: string;
  message: string;
  cons_date: string;
  unread: number;
}
export function displayName(user: User) {
  return [user.fname, user.lname].filter(Boolean).join(" ") || user.user_name;
}
export function homeFor(role: Role) {
  return role === "admin"
    ? "/accounts"
    : role === "consultant"
      ? "/consultations"
      : "/crops";
}
