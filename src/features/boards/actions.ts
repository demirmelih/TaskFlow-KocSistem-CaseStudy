"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createBoardSchema,
  deleteBoardSchema,
  renameBoardSchema,
} from "./schemas";

// All board mutations rely on RLS for authorization — we never check ownership
// in app code. The policy `boards_owner_all` does it at the database.

export async function createBoard(input: { title: string }) {
  const parsed = createBoardSchema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("boards")
    .insert({ title: parsed.title, owner_id: user.id })
    .select()
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/boards");
  return data;
}

export async function renameBoard(input: { id: string; title: string }) {
  const parsed = renameBoardSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("boards")
    .update({ title: parsed.title })
    .eq("id", parsed.id);
  if (error) throw new Error(error.message);

  revalidatePath("/boards");
  revalidatePath(`/boards/${parsed.id}`);
}

export async function deleteBoard(input: { id: string }) {
  const parsed = deleteBoardSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase.from("boards").delete().eq("id", parsed.id);
  if (error) throw new Error(error.message);

  revalidatePath("/boards");
}
