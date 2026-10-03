"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="max-w-lg mx-auto p-8 mt-16">
      <h1 className="text-2xl font-semibold">Monicrop could not load</h1>
      <p className="text-muted-foreground my-5">
        Check that XAMPP MySQL is running and run <code>npm run db:setup</code>{" "}
        in the project folder, then try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
