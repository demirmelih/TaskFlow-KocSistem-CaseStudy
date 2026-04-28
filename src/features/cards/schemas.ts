import { z } from "zod";

export const createCardSchema = z.object({
  columnId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
});

export const updateCardSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  deadline: z.string().datetime({ offset: true }).nullable().optional(),
  responsible_name: z.string().trim().max(200).nullable().optional(),
  responsible_email: z.string().email().max(200).nullable().optional(),
});

export const deleteCardSchema = z.object({
  id: z.string().uuid(),
});

export const moveCardSchema = z.object({
  id: z.string().uuid(),
  columnId: z.string().uuid(),
  position: z.string().min(1),
});
