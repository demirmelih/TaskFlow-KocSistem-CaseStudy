"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateKeyBetween } from "@/lib/ordering/fractional";
import {
  createColumnSchema,
  deleteColumnSchema,
  moveColumnSchema,
  renameColumnSchema,
} from "./schemas";

export async function createColumn(input: {
  boardId: string;
  title: string;
}) {
  const parsed = createColumnSchema.parse(input);
  const supabase = await createClient();

  // Append to the end: read the current max position for this board.
  const { data: existing, error: readError } = await supabase
    .from("columns")
    .select("position")
    .eq("board_id", parsed.boardId)
    .order("position", { ascending: false })
    .limit(1);
  if (readError) throw new Error(readError.message);

  const lastPosition = existing?.[0]?.position ?? null;
  const position = generateKeyBetween(lastPosition, null);

  const { data, error } = await supabase
    .from("columns")
    .insert({
      board_id: parsed.boardId,
      title: parsed.title,
      position,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  revalidatePath(`/boards/${parsed.boardId}`);
  return data;
}

export async function renameColumn(input: { id: string; title: string }) {
  const parsed = renameColumnSchema.parse(input);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("columns")
    .update({ title: parsed.title })
    .eq("id", parsed.id)
    .select("board_id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath(`/boards/${data.board_id}`);
}

export async function deleteColumn(input: { id: string }) {
  const parsed = deleteColumnSchema.parse(input);
  const supabase = await createClient();
  // Look up the board id BEFORE deleting so we know which path to revalidate.
  const { data: column, error: lookupError } = await supabase
    .from("columns")
    .select("board_id")
    .eq("id", parsed.id)
    .single();
  if (lookupError) throw new Error(lookupError.message);

  const { error } = await supabase.from("columns").delete().eq("id", parsed.id);
  if (error) throw new Error(error.message);

  revalidatePath(`/boards/${column.board_id}`);
}

/** Move a column to a precomputed position string. The client picks the
 *  position via fractional indexing — server simply persists. */
export async function moveColumn(input: { id: string; position: string }) {
  const parsed = moveColumnSchema.parse(input);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("columns")
    .update({ position: parsed.position })
    .eq("id", parsed.id)
    .select("board_id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath(`/boards/${data.board_id}`);
}
