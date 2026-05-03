import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="container max-w-md pt-12 text-center space-y-4">
      <h1 className="text-2xl font-bold">Not found</h1>
      <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
      <Button asChild>
        <Link href="/today">Go home</Link>
      </Button>
    </main>
  );
}
