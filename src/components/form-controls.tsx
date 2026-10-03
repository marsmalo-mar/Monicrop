"use client";
import { useState, type ComponentProps } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
export async function request<
  T = { id: number; redirect?: string; passwordChanged?: boolean },
>(url: string, method: string, data?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers:
      data instanceof FormData ? {} : { "Content-Type": "application/json" },
    body:
      data === undefined
        ? undefined
        : data instanceof FormData
          ? data
          : JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Something went wrong. Try again.");
  return result;
}
export function ErrorNotice({ error }: { error: string }) {
  return error ? (
    <Alert variant="destructive" className="mb-5">
      <AlertDescription role="alert">{error}</AlertDescription>
    </Alert>
  ) : null;
}
export function TextField({
  label,
  description,
  defaultValue,
  value,
  onChange,
  ...props
}: ComponentProps<typeof Input> & { label: string; description?: string }) {
  const [fieldValue, setFieldValue] = useState(defaultValue ?? "");
  return (
    <Field>
      <FieldLabel htmlFor={props.id || props.name}>{label}</FieldLabel>
      <Input
        id={props.id || props.name}
        {...props}
        value={value ?? fieldValue}
        onChange={(event) => {
          setFieldValue(event.target.value);
          onChange?.(event);
        }}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  );
}
export function NoteField({
  label,
  ...props
}: ComponentProps<typeof Textarea> & { label: string }) {
  return (
    <Field>
      <FieldLabel htmlFor={props.name}>{label}</FieldLabel>
      <Textarea id={props.name} {...props} />
    </Field>
  );
}
export function Choice({
  label,
  name,
  options,
  defaultValue,
  onValueChange,
}: {
  label: string;
  name: string;
  options: string[];
  defaultValue?: string;
  onValueChange?: (v: string) => void;
}) {
  const [value, setValue] = useState(defaultValue || options[0]);
  const items = options.map((value) => ({
    value,
    label: value.charAt(0).toUpperCase() + value.slice(1),
  }));
  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Select
        name={name}
        items={items}
        value={value}
        onValueChange={(next) => {
          if (next) {
            setValue(next);
            onValueChange?.(next);
          }
        }}
      >
        <SelectTrigger id={name} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}
export function ImageUpload({
  label,
  value,
  onChange,
  onBusy,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Field>
      <FieldLabel htmlFor="image-upload">{label}</FieldLabel>
      <Input
        id="image-upload"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setBusy(true);
          onBusy(true);
          setError("");
          try {
            const form = new FormData();
            form.set("file", file);
            const result = await request<{ path: string }>(
              "/api/uploads",
              "POST",
              form,
            );
            onChange(result.path);
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : "Could not upload image.",
            );
          } finally {
            setBusy(false);
            onBusy(false);
          }
        }}
      />
      <FieldDescription>
        {busy
          ? "Uploading image…"
          : value
            ? "Image attached. Choose a file to replace it."
            : "Optional JPEG, PNG, or WebP, up to 5 MB."}
      </FieldDescription>
      {value && (
        <button
          className="text-left text-sm text-primary underline"
          type="button"
          onClick={() => onChange(null)}
        >
          Remove attached image
        </button>
      )}
      <ErrorNotice error={error} />
    </Field>
  );
}
