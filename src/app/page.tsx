import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/boards");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          TaskFlow
        </h1>
        <p className="max-w-md text-muted-foreground">
          A lightweight Kanban board for small teams. Create boards, add cards,
          drag them where they belong.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/signup">Get started</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Log in</Link>
        </Button>
      </div>
    </main>
  );
}
