import { z } from "zod";

export const createBoardSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(120, "Title is too long"),
});

export const renameBoardSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
});

export const deleteBoardSchema = z.object({
  id: z.string().uuid(),
});

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
