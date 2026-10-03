import { requireUser } from "@/lib/auth";
import { WorkspaceShell } from "@/components/workspace-shell";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WorkspaceShell user={await requireUser()}>{children}</WorkspaceShell>;
}
