import Link from "next/link";
import { signOut } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function AppShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email?: string | null;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/boards" className="text-lg font-semibold tracking-tight">
            TaskFlow
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {email ? (
              <span className="hidden text-muted-foreground sm:inline">
                {email}
              </span>
            ) : null}
            <form action={signOut}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
