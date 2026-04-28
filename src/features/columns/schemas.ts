import { z } from "zod";

export const createColumnSchema = z.object({
  boardId: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
});

export const renameColumnSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
});

export const deleteColumnSchema = z.object({
  id: z.string().uuid(),
});

export const moveColumnSchema = z.object({
  id: z.string().uuid(),
  position: z.string().min(1),
});
