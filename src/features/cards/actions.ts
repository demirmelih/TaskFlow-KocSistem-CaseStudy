"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateKeyBetween } from "@/lib/ordering/fractional";
import {
  createCardSchema,
  deleteCardSchema,
  moveCardSchema,
  updateCardSchema,
} from "./schemas";

async function boardIdForColumn(
  supabase: Awaited<ReturnType<typeof createClient>>,
  columnId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("columns")
    .select("board_id")
    .eq("id", columnId)
    .single();
  if (error) throw new Error(error.message);
  return data.board_id;
}

async function boardIdForCard(
  supabase: Awaited<ReturnType<typeof createClient>>,
  cardId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("cards")
    .select("column_id, columns!inner(board_id)")
    .eq("id", cardId)
    .single();
  if (error) throw new Error(error.message);
  // Supabase types `columns` as an array on nested selects; pick first.
  const cols = data.columns as unknown as { board_id: string };
  return cols.board_id;
}

export async function createCard(input: {
  columnId: string;
  title: string;
}) {
  const parsed = createCardSchema.parse(input);
  const supabase = await createClient();

  // Append to bottom of the column.
  const { data: tail, error: readError } = await supabase
    .from("cards")
    .select("position")
    .eq("column_id", parsed.columnId)
    .order("position", { ascending: false })
    .limit(1);
  if (readError) throw new Error(readError.message);

  const lastPosition = tail?.[0]?.position ?? null;
  const position = generateKeyBetween(lastPosition, null);

  const { data, error } = await supabase
    .from("cards")
    .insert({
      column_id: parsed.columnId,
      title: parsed.title,
      position,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const boardId = await boardIdForColumn(supabase, parsed.columnId);
  revalidatePath(`/boards/${boardId}`);
  return data;
}

export async function updateCard(input: {
  id: string;
  title?: string;
  description?: string | null;
  deadline?: string | null;
  responsible_name?: string | null;
  responsible_email?: string | null;
}) {
  const parsed = updateCardSchema.parse(input);
  const supabase = await createClient();

  const patch: Record<string, unknown> = {};
  if (parsed.title !== undefined) patch.title = parsed.title;
  if (parsed.description !== undefined) patch.description = parsed.description;
  if (parsed.deadline !== undefined) patch.deadline = parsed.deadline;
  if (parsed.responsible_name !== undefined) patch.responsible_name = parsed.responsible_name;
  if (parsed.responsible_email !== undefined) patch.responsible_email = parsed.responsible_email;
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase.from("cards").update(patch).eq("id", parsed.id);
  if (error) throw new Error(error.message);

  const boardId = await boardIdForCard(supabase, parsed.id);
  revalidatePath(`/boards/${boardId}`);
}

export async function deleteCard(input: { id: string }) {
  const parsed = deleteCardSchema.parse(input);
  const supabase = await createClient();
  const boardId = await boardIdForCard(supabase, parsed.id);
  const { error } = await supabase.from("cards").delete().eq("id", parsed.id);
  if (error) throw new Error(error.message);
  revalidatePath(`/boards/${boardId}`);
}

/** Persist a card's new column and position after a drag. The client computes
 *  the position string via fractional indexing; the server only writes it. */
export async function moveCard(input: {
  id: string;
  columnId: string;
  position: string;
}) {
  const parsed = moveCardSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("cards")
    .update({
      column_id: parsed.columnId,
      position: parsed.position,
    })
    .eq("id", parsed.id);
  if (error) throw new Error(error.message);

  const boardId = await boardIdForColumn(supabase, parsed.columnId);
  revalidatePath(`/boards/${boardId}`);
}
