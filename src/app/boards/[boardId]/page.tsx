import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBoardWithChildren } from "@/features/boards/queries";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function BoardDetailPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const board = await getBoardWithChildren(boardId);

  if (!board) notFound();

  return (
    <AppShell email={user?.email}>
      <div className="flex h-[calc(100vh-3.5rem)] flex-col">
        <div className="flex items-center gap-3 border-b px-4 py-3 sm:px-6">
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link href="/boards">
              <ChevronLeft className="h-4 w-4" />
              Boards
            </Link>
          </Button>
          <h1 className="truncate text-lg font-semibold">{board.title}</h1>
        </div>
        <div className="flex-1 overflow-hidden">
          <KanbanBoard board={board} />
        </div>
      </div>
    </AppShell>
  );
}
