import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Board, BoardWithChildren } from "@/types/database";

export async function listBoards(): Promise<Board[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getBoardWithChildren(
  boardId: string,
): Promise<BoardWithChildren | null> {
  const supabase = await createClient();
  // Single round-trip: nested select pulls columns and their cards.
  // Both are sorted by `position` so the UI can render directly without
  // re-sorting on every render.
  const { data, error } = await supabase
    .from("boards")
    .select(
      `
      id, owner_id, title, created_at,
      columns (
        id, board_id, title, position, created_at,
        cards (
          id, column_id, title, description, position,
          deadline, responsible_name, responsible_email,
          created_at, updated_at
        )
      )
      `,
    )
    .eq("id", boardId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // no rows
    throw error;
  }

  // Supabase returns related rows in arbitrary order — sort by `position`.
  const columns = (data.columns ?? [])
    .slice()
    .sort((a, b) => (a.position < b.position ? -1 : 1))
    .map((col) => ({
      ...col,
      cards: (col.cards ?? [])
        .slice()
        .sort((a, b) => (a.position < b.position ? -1 : 1)),
    }));

  return { ...data, columns };
}
