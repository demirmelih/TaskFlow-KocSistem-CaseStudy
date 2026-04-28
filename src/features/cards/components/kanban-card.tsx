"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarClock, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Card } from "@/types/database";
import { CardDetailDialog } from "./card-detail-dialog";

interface KanbanCardProps {
  card: Card;
  isOverlay?: boolean;
}

function DeadlineBadge({ iso }: { iso: string }) {
  const d = new Date(iso);
  const now = Date.now();
  const diff = d.getTime() - now;
  const overdue = diff < 0;
  const soonMs = 24 * 60 * 60 * 1000;
  const soon = !overdue && diff < soonMs;

  const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    + " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium",
        overdue
          ? "bg-destructive/15 text-destructive"
          : soon
          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
          : "bg-muted text-muted-foreground",
      )}
      title={overdue ? "Overdue" : soon ? "Due soon" : "Deadline"}
    >
      <CalendarClock className="h-3 w-3 shrink-0" />
      {label}
    </span>
  );
}

function ResponsibleBadge({ name }: { name: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
      title={name}
    >
      <UserRound className="h-3 w-3 shrink-0" />
      <span className="max-w-[10rem] truncate">{name}</span>
    </span>
  );
}

export function KanbanCard({ card, isOverlay = false }: KanbanCardProps) {
  const [open, setOpen] = React.useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `card-${card.id}`,
    data: { type: "card", card },
    // Disable dnd-kit hooks on the overlay clone — it should just render as a
    // static visual.
    disabled: isOverlay,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasMetadata = card.deadline || card.responsible_name || card.description;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "no-touch-callout group/card cursor-grab touch-none rounded-md border bg-card p-3 text-sm shadow-sm transition-shadow",
          "hover:border-primary/40 hover:shadow",
          isDragging && "opacity-30",
          isOverlay && "rotate-2 cursor-grabbing shadow-xl ring-2 ring-primary/40",
        )}
        {...attributes}
        {...listeners}
        // Open detail when the card is clicked WITHOUT having been dragged.
        // dnd-kit's PointerSensor swallows the click when a drag starts, so a
        // bare onClick here only fires when no drag occurred.
        onClick={() => {
          if (!isOverlay) setOpen(true);
        }}
      >
        <p className="line-clamp-3 whitespace-pre-wrap break-words">
          {card.title}
        </p>
        {hasMetadata ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {card.description ? (
              <span
                className="inline-block h-1 w-6 self-center rounded-full bg-muted-foreground/30"
                aria-label="Has description"
                title="Has description"
              />
            ) : null}
            {card.deadline ? <DeadlineBadge iso={card.deadline} /> : null}
            {card.responsible_name ? (
              <ResponsibleBadge name={card.responsible_name} />
            ) : null}
          </div>
        ) : null}
      </div>
      {!isOverlay ? (
        <CardDetailDialog card={card} open={open} onOpenChange={setOpen} />
      ) : null}
    </>
  );
}
