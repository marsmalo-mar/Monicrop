"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { displayName, type User } from "@/lib/types";
import { DataTable } from "./data-table";
import { ActionLink, DeleteRecord, PageHeading } from "./page-parts";
import { Choice, ErrorNotice, request, TextField } from "./form-controls";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { FieldGroup } from "./ui/field";
export function Accounts({ accounts }: { accounts: User[] }) {
  const columns: ColumnDef<User>[] = [
    {
      accessorFn: displayName,
      id: "name",
      header: "Account",
      cell: ({ row }) => (
        <div>
          <strong className="font-semibold">{displayName(row.original)}</strong>
          <p className="text-xs text-muted-foreground mt-1">
            {row.original.user_name}
          </p>
        </div>
      ),
    },
    { accessorKey: "email", header: "Email" },
    {
      accessorKey: "user_type",
      header: "Role",
      cell: ({ getValue }) => (
        <Badge variant="secondary">
          {getValue<string>() === "client" ? "Farmer" : getValue<string>()}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <ActionLink
          href={`/accounts/${row.original.user_ID}/edit`}
          variant="outline"
        >
          Edit account
        </ActionLink>
      ),
    },
  ];
  return (
    <>
      <PageHeading
        title="Accounts"
        description="Manage farmer, consultant, and administrator accounts."
      >
        <ActionLink href="/accounts/new">
          <Plus data-icon="inline-start" />
          Create account
        </ActionLink>
      </PageHeading>
      <DataTable
        data={accounts}
        columns={columns}
        searchLabel="Search name, email, or role"
        emptyTitle="No accounts found"
        emptyDescription="Create an account to add someone to your farm community."
      />
    </>
  );
}
export function AccountForm({
  account,
  currentUserId,
}: {
  account?: User;
  currentUserId: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await request(
        `/api/accounts${account ? `/${account.user_ID}` : ""}`,
        account ? "PATCH" : "POST",
        data,
      );
      router.push("/accounts");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Try again.");
      setPending(false);
    }
  }
  return (
    <>
      <PageHeading
        title={account ? "Edit account" : "Create account"}
        description={
          account
            ? "Update account details and access. Leave the password empty to keep it."
            : "Add a member to your farm community."
        }
      />
      <form className="panel form-panel" onSubmit={submit}>
        <ErrorNotice error={error} />
        <FieldGroup>
          <div className="form-grid">
            <TextField
              label="First name"
              name="fname"
              maxLength={50}
              defaultValue={account?.fname || ""}
            />
            <TextField
              label="Middle initial"
              name="minitial"
              maxLength={5}
              defaultValue={account?.minitial || ""}
            />
            <TextField
              label="Last name"
              name="lname"
              maxLength={50}
              defaultValue={account?.lname || ""}
            />
            <TextField
              label="Username"
              name="user_name"
              maxLength={50}
              defaultValue={account?.user_name}
              required
            />
            <TextField
              label="Email"
              name="email"
              type="email"
              maxLength={100}
              defaultValue={account?.email}
              required
            />
            <TextField
              label={account ? "New password (optional)" : "Password"}
              name="password"
              type="password"
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              required={!account}
              description="Use at least 8 characters. Changing a password signs out existing sessions."
            />
            <Choice
              name="user_type"
              label="Account role"
              options={
                account?.user_ID === currentUserId
                  ? ["admin"]
                  : ["client", "consultant", "admin"]
              }
              defaultValue={account?.user_type}
            />
          </div>
        </FieldGroup>
        <div className="form-actions">
          <ActionLink href="/accounts" variant="outline">
            Cancel
          </ActionLink>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save account"}
          </Button>
        </div>
      </form>
      {account && account.user_ID !== currentUserId && (
        <div className="mt-8 max-w-[850px]">
          <h2 className="font-semibold mb-2">Delete account</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Deleting this account also removes its crops, care logs,
            credentials, and conversations.
          </p>
          <DeleteRecord
            url={`/api/accounts/${account.user_ID}`}
            label="Delete account"
            description="This permanently deletes the account and its related records. This action cannot be undone."
            redirectTo="/accounts"
          />
        </div>
      )}
    </>
  );
}
