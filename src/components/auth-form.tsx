"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Brand } from "./brand";
import { ErrorNotice, request, TextField } from "./form-controls";
export function AuthForm({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await request(
        `/api/auth/${register ? "register" : "login"}`,
        "POST",
        Object.fromEntries(form),
      );
      if (register) {
        setRegistered(true);
      } else {
        router.replace(result.redirect || "/crops");
        router.refresh();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <Brand />
        <div>
          <h2>Know what your crops need next.</h2>
          <p>
            Organize crop records, monitor growing conditions, and connect with
            agricultural consultants in one calm workspace.
          </p>
        </div>
        <footer className="text-sm text-secondary">
          A simpler way to care for every growing season.
        </footer>
      </aside>
      <main className="auth-main">
        <section className="auth-form">
          <h1>
            {registered
              ? "Your account is ready"
              : register
                ? "Create your account"
                : "Welcome back"}
          </h1>
          <p className="mt-2 mb-8 text-sm text-muted-foreground">
            {registered
              ? "Sign in to start recording your crops."
              : register
                ? "Start keeping planting details and crop care together."
                : "Sign in to your Monicrop workspace."}
          </p>
          {registered ? (
            <Button render={<Link href="/login" />} nativeButton={false}>
              Go to sign in
            </Button>
          ) : (
            <form onSubmit={submit}>
              <ErrorNotice error={error} />
              <FieldGroup>
                {register && (
                  <TextField
                    label="Username"
                    name="user_name"
                    autoComplete="username"
                    maxLength={50}
                    required
                  />
                )}
                <TextField
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={100}
                  required
                />
                <TextField
                  label="Password"
                  name="password"
                  type="password"
                  autoComplete={register ? "new-password" : "current-password"}
                  minLength={register ? 8 : 1}
                  maxLength={128}
                  description={
                    register ? "Use at least 8 characters." : undefined
                  }
                  required
                />
                <Button type="submit" size="lg" disabled={pending}>
                  {pending
                    ? "Please wait…"
                    : register
                      ? "Create account"
                      : "Sign in"}
                </Button>
                <Link
                  className="text-sm text-primary text-center underline"
                  href={register ? "/login" : "/register"}
                >
                  {register
                    ? "Already have an account? Sign in"
                    : "New to Monicrop? Create an account"}
                </Link>
              </FieldGroup>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
