"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "./ui/dialog";
import { ErrorNotice, request } from "./form-controls";
export function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function ActionLink({
  href,
  children,
  variant = "default",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "default" | "outline" | "ghost";
}) {
  return (
    <Button
      variant={variant}
      render={<Link href={href} />}
      nativeButton={false}
    >
      {children}
    </Button>
  );
}
export function DeleteRecord({
  url,
  label,
  description,
  redirectTo,
}: {
  url: string;
  label: string;
  description: string;
  redirectTo: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) {
          setOpen(value);
          setError("");
        }
      }}
    >
      <DialogTrigger render={<Button variant="destructive" />}>
        {label}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}?</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ErrorNotice error={error} />
        <DialogFooter>
          <DialogClose render={<Button variant="outline" disabled={pending} />}>
            Cancel
          </DialogClose>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await request(url, "DELETE");
                setOpen(false);
                router.push(redirectTo);
                router.refresh();
              } catch (error) {
                setError(error instanceof Error ? error.message : "Try again.");
              } finally {
                setPending(false);
              }
            }}
          >
            {pending ? "Deleting…" : label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
export function formatDate(value: string | null | undefined, withTime = false) {
  if (!value) return "—";
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-PH", {
        dateStyle: "medium",
        ...(withTime ? { timeStyle: "short" as const } : {}),
      }).format(date);
}
