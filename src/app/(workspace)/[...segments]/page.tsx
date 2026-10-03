import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { HttpError, numericId } from "@/lib/api";
import { query, userColumns } from "@/lib/db";
import { listCrops, ownCrop, ownLog } from "@/lib/records";
import { account, credentials } from "@/lib/accounts";
import {
  consultantDirectory,
  getMessages,
  listConversations,
} from "@/lib/messages";
import { homeFor, type CropLog, type User } from "@/lib/types";
import { CropDetail, CropForm, Crops } from "@/components/crops";
import { LogDetail, LogForm } from "@/components/care-logs";
import { AccountForm, Accounts } from "@/components/accounts";
import { Profile } from "@/components/profile";
import { Consultations, ConversationView } from "@/components/consultations";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ segments: string[] }>;
}) {
  const { segments } = await params;
  return {
    title:
      segments[0] === "crops"
        ? "My crops"
        : segments[0] === "accounts"
          ? "Accounts"
          : segments[0] === "profile"
            ? "Your profile"
            : "Consultations",
  };
}
async function pageData<T>(load: () => Promise<T>) {
  try {
    return await load();
  } catch (error) {
    if (error instanceof HttpError && [400, 403, 404].includes(error.status))
      notFound();
    throw error;
  }
}
export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ segments: string[] }>;
}) {
  const user = await requireUser();
  const { segments } = await params;
  const [area, rawId, operation, rawLogId, logOperation] = segments;
  if (area === "profile" && segments.length === 1)
    return (
      <Profile
        user={user}
        credentials={
          user.user_type === "consultant" ? await credentials(user) : null
        }
      />
    );
  if (area === "crops") {
    if (user.user_type !== "client") redirect(homeFor(user.user_type));
    if (segments.length === 1) return <Crops crops={await listCrops(user)} />;
    if (rawId === "new" && segments.length === 2) return <CropForm />;
    const crop = await pageData(() => ownCrop(user, numericId(rawId)));
    if (segments.length === 2)
      return (
        <CropDetail
          crop={crop}
          logs={await query<CropLog>(
            "SELECT * FROM crop_log WHERE cropID=? ORDER BY log_date DESC,logID DESC",
            [crop.cropID],
          )}
        />
      );
    if (operation === "edit" && segments.length === 3)
      return <CropForm crop={crop} />;
    if (operation === "logs") {
      if (rawLogId === "new" && segments.length === 4)
        return <LogForm crop={crop} />;
      const log = await pageData(() => ownLog(user, numericId(rawLogId)));
      if (log.cropID !== crop.cropID) notFound();
      if (segments.length === 4) return <LogDetail crop={crop} log={log} />;
      if (logOperation === "edit" && segments.length === 5)
        return <LogForm crop={crop} log={log} />;
    }
  }
  if (area === "accounts") {
    if (user.user_type !== "admin") notFound();
    if (segments.length === 1)
      return (
        <Accounts
          accounts={await query<User>(
            `SELECT ${userColumns} FROM users_creds ORDER BY user_ID DESC`,
          )}
        />
      );
    if (rawId === "new" && segments.length === 2)
      return <AccountForm currentUserId={user.user_ID} />;
    if (operation === "edit" && segments.length === 3)
      return (
        <AccountForm
          account={await pageData(() => account(numericId(rawId)))}
          currentUserId={user.user_ID}
        />
      );
  }
  if (area === "consultations") {
    if (user.user_type === "admin") redirect("/accounts");
    if (segments.length === 1)
      return (
        <Consultations
          user={user}
          consultants={
            user.user_type === "client" ? await consultantDirectory() : []
          }
          conversations={await listConversations(user)}
        />
      );
    if (segments.length === 3)
      return (
        <ConversationView
          user={user}
          {...await pageData(() =>
            getMessages(user, numericId(rawId), numericId(operation)),
          )}
        />
      );
  }
  notFound();
}
