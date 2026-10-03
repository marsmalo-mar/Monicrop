import { NextResponse } from "next/server";
import { z } from "zod";
import { isSameOrigin } from "./security";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function ensure(
  condition: unknown,
  status: number,
  message: string,
): asserts condition {
  if (!condition) throw new HttpError(status, message);
}
export function numericId(value: string | undefined) {
  ensure(value && /^[1-9]\d*$/.test(value), 400, "Invalid record ID.");
  const id = Number(value);
  ensure(Number.isSafeInteger(id), 400, "Invalid record ID.");
  return id;
}
export function checkOrigin(request: Request) {
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
  ensure(
    isSameOrigin(request.headers.get("origin"), expected),
    403,
    "Reload Monicrop and try again from this app.",
  );
}
export async function body<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<T> {
  ensure(
    Number(request.headers.get("content-length") || 0) <= 100000,
    413,
    "The request is too large.",
  );
  let value;
  try {
    value = await request.json();
  } catch {
    throw new HttpError(400, "Send valid JSON.");
  }
  return schema.parse(value);
}
export function apiError(error: unknown) {
  if (error instanceof HttpError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof z.ZodError)
    return NextResponse.json(
      {
        error: error.issues[0]?.message || "Check your entries.",
        fields: z.flattenError(error).fieldErrors,
      },
      { status: 422 },
    );
  console.error(
    "Monicrop request failed",
    error instanceof Error ? error.name : "Unknown error",
  );
  return NextResponse.json(
    {
      error:
        "Monicrop could not save or load this record. Check MySQL is running and database setup is complete, then try again.",
    },
    { status: 503 },
  );
}
