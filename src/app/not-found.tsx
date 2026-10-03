import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <section className="p-8">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground my-4">
        This record may have been removed, or you may not have access to it.
      </p>
      <Button render={<Link href="/" />} nativeButton={false}>
        Go to Monicrop
      </Button>
    </section>
  );
}
