import Link from "next/link";
import { Sprout, NotebookPen, MessagesSquare } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
export default function Landing() {
  return (
    <>
      <nav className="landing-nav">
        <Brand />
        <Button render={<Link href="/login" />} nativeButton={false}>
          Sign in
        </Button>
      </nav>
      <main className="landing-hero">
        <section>
          <h1>Grow every crop with more confidence.</h1>
          <p>
            Monicrop gives farmers one place to record planting details, track
            crop care, and ask a consultant when advice matters.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              render={<Link href="/register" />}
              nativeButton={false}
            >
              Create an account
            </Button>
            <Button
              size="lg"
              variant="outline"
              render={<Link href="/login" />}
              nativeButton={false}
            >
              Sign in
            </Button>
          </div>
        </section>
        <aside className="season-panel">
          <h2>From first planting to harvest.</h2>
          <ul>
            <li>
              <Sprout />
              Keep crop records organized
            </li>
            <li>
              <NotebookPen />
              Log weather, watering, fertilizer, and pests
            </li>
            <li>
              <MessagesSquare />
              Talk to agricultural consultants
            </li>
          </ul>
        </aside>
      </main>
    </>
  );
}
