import { createClient } from "@/lib/supabase/server";
import { listBoards } from "@/features/boards/queries";
import { BoardCard } from "@/features/boards/components/board-card";
import { CreateBoardDialog } from "@/features/boards/components/create-board-dialog";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function BoardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const boards = await listBoards();

  return (
    <AppShell email={user?.email}>
      <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Your boards</h1>
          <CreateBoardDialog />
        </div>
        {boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-16 text-center">
            <p className="text-sm text-muted-foreground">
              You don&apos;t have any boards yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Create one to start organizing work.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {boards.map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
