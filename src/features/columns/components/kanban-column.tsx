"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { KanbanCard } from "@/features/cards/components/kanban-card";
import { CreateCardButton } from "@/features/cards/components/create-card-button";
import type { Card, Column } from "@/types/database";
import { deleteColumn, renameColumn } from "../actions";

interface KanbanColumnProps {
  column: Column;
  cards: Card[];
  isOverlay?: boolean;
}

export function KanbanColumn({
  column,
  cards,
  isOverlay = false,
}: KanbanColumnProps) {
  const router = useRouter();
  const [renaming, setRenaming] = React.useState(false);
  const [title, setTitle] = React.useState(column.title);
  const [pending, startTransition] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => setTitle(column.title), [column.title]);
  React.useEffect(() => {
    if (renaming) inputRef.current?.select();
  }, [renaming]);

  const sortable = useSortable({
    id: `column-${column.id}`,
    data: { type: "column", column },
    disabled: isOverlay,
  });

  // The droppable area used when a card is dragged onto an empty column or
  // onto the column body (not on top of another card).
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `column-droppable-${column.id}`,
    data: { type: "column-droppable", columnId: column.id },
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };

  function commitRename() {
    const next = title.trim();
    if (!next || next === column.title) {
      setTitle(column.title);
      setRenaming(false);
      return;
    }
    startTransition(async () => {
      try {
        await renameColumn({ id: column.id, title: next });
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to rename");
        setTitle(column.title);
      } finally {
        setRenaming(false);
      }
    });
  }

  function handleDelete() {
    if (
      !confirm(
        `Delete "${column.title}" and all ${cards.length} card${cards.length === 1 ? "" : "s"}?`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteColumn({ id: column.id });
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className={cn(
        "flex h-fit max-h-[calc(100vh-9rem)] w-72 shrink-0 flex-col rounded-md bg-muted/40 shadow-sm",
        sortable.isDragging && "opacity-40",
        isOverlay && "rotate-1 shadow-xl ring-2 ring-primary/40",
      )}
    >
      {/* Column header — drag handle lives here so cards stay clickable */}
      <div className="flex items-center gap-1 px-2 py-2">
        <button
          type="button"
          className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-accent active:cursor-grabbing"
          aria-label="Drag column"
          {...sortable.attributes}
          {...sortable.listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        {renaming ? (
          <Input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setTitle(column.title);
                setRenaming(false);
              }
            }}
            disabled={pending}
            className="h-7 text-sm"
            maxLength={120}
          />
        ) : (
          <button
            type="button"
            className="flex-1 truncate text-left text-sm font-semibold"
            onClick={() => setRenaming(true)}
          >
            {column.title}
          </button>
        )}
        <span className="text-xs text-muted-foreground">{cards.length}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Column actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setRenaming(true)}>
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Card list — droppable so cards can land on the column body too */}
      <div
        ref={setDroppableRef}
        className={cn(
          "flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2 transition-colors",
          isOver && "bg-primary/5",
        )}
      >
        <SortableContext
          items={cards.map((c) => `card-${c.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <KanbanCard key={card.id} card={card} />
          ))}
        </SortableContext>
        {cards.length === 0 ? (
          <div className="flex h-16 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
            Drop cards here
          </div>
        ) : null}
      </div>
      <div className="px-2 pb-2">
        <CreateCardButton columnId={column.id} />
      </div>
    </div>
  );
}
