"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteBoard } from "../actions";
import type { Board } from "@/types/database";

export function BoardCard({ board }: { board: Board }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function handleDelete() {
    if (!confirm(`Delete "${board.title}"? This removes all columns and cards.`)) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteBoard({ id: board.id });
        toast.success("Board deleted");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete board");
      }
    });
  }

  return (
    <div className="group relative">
      <Link
        href={`/boards/${board.id}`}
        className="flex h-32 flex-col justify-between rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
      >
        <h3 className="line-clamp-2 text-base font-medium">{board.title}</h3>
        <p className="text-xs text-muted-foreground">
          Created {new Date(board.created_at).toLocaleDateString()}
        </p>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            aria-label="Board actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            disabled={pending}
            onSelect={(e) => {
              e.preventDefault();
              handleDelete();
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete board
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
