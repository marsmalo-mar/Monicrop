"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Consultant, User } from "@/lib/types";
import { displayName } from "@/lib/types";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { FieldGroup, FieldLegend, FieldSet } from "./ui/field";
import { Alert, AlertDescription } from "./ui/alert";
import {
  ErrorNotice,
  ImageUpload,
  NoteField,
  request,
  TextField,
} from "./form-controls";
import { PageHeading } from "./page-parts";
export function Profile({
  user,
  credentials,
}: {
  user: User;
  credentials: Consultant | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [image, setImage] = useState(user.profile_pic);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    setPending(true);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await request("/api/me", "PATCH", {
        ...data,
        profile_pic: image,
      });
      if (result.passwordChanged) {
        router.replace("/login");
        router.refresh();
      } else {
        setSaved(true);
        router.refresh();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <PageHeading
        title="Your profile"
        description="Keep your account, contact details, and professional information up to date."
      />
      <div className="flex items-center gap-4 mb-8">
        {user.profile_pic ? (
          <Image
            src={`/api/media?path=${encodeURIComponent(user.profile_pic)}`}
            alt="Your profile photo"
            width={64}
            height={64}
            unoptimized
            className="size-16 rounded-full object-cover"
          />
        ) : (
          <span className="initial !size-16 text-xl">
            {displayName(user).charAt(0)}
          </span>
        )}
        <div>
          <h2 className="font-semibold text-xl">{displayName(user)}</h2>
          <Badge variant="secondary" className="mt-2">
            {user.user_type === "client" ? "Farmer" : user.user_type}
          </Badge>
        </div>
      </div>
      <form className="panel form-panel" onSubmit={submit}>
        <ErrorNotice error={error} />
        {saved && (
          <Alert className="mb-6">
            <AlertDescription role="status">
              Your profile was saved.
            </AlertDescription>
          </Alert>
        )}
        <FieldGroup>
          <FieldSet>
            <FieldLegend>Account details</FieldLegend>
            <div className="form-grid">
              <TextField
                label="Username"
                name="user_name"
                defaultValue={user.user_name}
                required
                maxLength={50}
              />
              <TextField
                label="Email"
                name="email"
                type="email"
                defaultValue={user.email}
                required
                maxLength={100}
              />
              <TextField
                label="New password (optional)"
                name="password"
                type="password"
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                description="Leave empty to keep your password. Changing it signs you out on all devices."
              />
            </div>
          </FieldSet>
          <FieldSet>
            <FieldLegend>Personal information</FieldLegend>
            <div className="form-grid">
              <TextField
                label="First name"
                name="fname"
                defaultValue={user.fname || ""}
                maxLength={50}
              />
              <TextField
                label="Middle initial"
                name="minitial"
                defaultValue={user.minitial || ""}
                maxLength={5}
              />
              <TextField
                label="Last name"
                name="lname"
                defaultValue={user.lname || ""}
                maxLength={50}
              />
              <TextField
                label="Birthdate"
                name="birthdate"
                type="date"
                defaultValue={user.birthdate || ""}
              />
              <TextField
                label="Phone"
                name="phone"
                type="tel"
                defaultValue={user.phone || ""}
                maxLength={20}
              />
            </div>
            <ImageUpload
              label="Profile photo"
              value={image}
              onChange={setImage}
              onBusy={setUploading}
            />
          </FieldSet>
          <FieldSet>
            <FieldLegend>Address</FieldLegend>
            <div className="form-grid">
              {(
                [
                  ["street", "Street", 100],
                  ["barangay", "Barangay", 100],
                  ["city", "City", 100],
                  ["province", "Province", 100],
                  ["country", "Country", 100],
                  ["postal_code", "Postal code", 10],
                ] as const
              ).map(([name, label, max]) => (
                <TextField
                  key={name}
                  label={label}
                  name={name}
                  defaultValue={user[name] || ""}
                  maxLength={max}
                />
              ))}
            </div>
          </FieldSet>
        </FieldGroup>
        <div className="form-actions">
          <Button type="submit" disabled={pending || uploading}>
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>
      {user.user_type === "consultant" && (
        <CredentialsForm credentials={credentials} />
      )}
    </>
  );
}
function CredentialsForm({ credentials }: { credentials: Consultant | null }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="panel form-panel mt-7"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError("");
        setSaved(false);
        const data = Object.fromEntries(new FormData(event.currentTarget));
        try {
          await request("/api/credentials", "PATCH", data);
          setSaved(true);
          router.refresh();
        } catch (error) {
          setError(error instanceof Error ? error.message : "Try again.");
        } finally {
          setPending(false);
        }
      }}
    >
      <h2>Consultant credentials</h2>
      <p className="panel-description mb-6">
        These details help farmers find the right expertise.
      </p>
      <ErrorNotice error={error} />
      {saved && (
        <Alert className="mb-5">
          <AlertDescription role="status">
            Your credentials were saved.
          </AlertDescription>
        </Alert>
      )}
      <FieldGroup>
        <TextField
          name="prof_name"
          label="Professional name"
          defaultValue={credentials?.prof_name}
          required
          maxLength={100}
        />
        <TextField
          name="expertise"
          label="Area of expertise"
          defaultValue={credentials?.expertise}
          required
          maxLength={255}
        />
        <TextField
          name="certificate"
          label="Certificate or qualification"
          defaultValue={credentials?.certificate}
          maxLength={255}
        />
        <NoteField
          name="description"
          label="Short introduction"
          defaultValue={credentials?.description}
          rows={4}
          maxLength={10000}
        />
      </FieldGroup>
      <div className="form-actions">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save credentials"}
        </Button>
      </div>
    </form>
  );
}
