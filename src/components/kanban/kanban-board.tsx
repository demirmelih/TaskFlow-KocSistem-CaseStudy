"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { KanbanColumn } from "@/features/columns/components/kanban-column";
import { KanbanCard } from "@/features/cards/components/kanban-card";
import { CreateColumnButton } from "@/features/columns/components/create-column-button";
import { moveCard } from "@/features/cards/actions";
import { moveColumn } from "@/features/columns/actions";
import { positionForIndex } from "@/lib/ordering/fractional";
import type { BoardWithChildren, Card, Column } from "@/types/database";

// Local working copy of the board state. Drag handlers mutate this
// optimistically; server actions persist the result. On failure or after
// success we router.refresh() to sync with the server's truth.
type LocalColumn = Column & { cards: Card[] };

interface KanbanBoardProps {
  board: BoardWithChildren;
}

export function KanbanBoard({ board }: KanbanBoardProps) {
  const router = useRouter();
  const [columns, setColumns] = React.useState<LocalColumn[]>(board.columns);
  const [activeCard, setActiveCard] = React.useState<Card | null>(null);
  const [activeColumn, setActiveColumn] = React.useState<LocalColumn | null>(
    null,
  );

  // Sync local state when the server data changes (e.g. router.refresh()
  // after a CRUD mutation).
  React.useEffect(() => {
    setColumns(board.columns);
  }, [board.columns]);

  // PointerSensor: small activation distance prevents drags on stray clicks.
  // TouchSensor: 200ms long-press lets mobile users scroll without grabbing.
  // KeyboardSensor: free accessibility — Tab to focus, Space to pick up.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function findColumnByCardId(cardId: string): LocalColumn | undefined {
    return columns.find((c) => c.cards.some((card) => card.id === cardId));
  }

  function parseId(id: string): { type: "card" | "column"; raw: string } {
    if (id.startsWith("card-")) return { type: "card", raw: id.slice(5) };
    if (id.startsWith("column-droppable-"))
      return { type: "column", raw: id.slice("column-droppable-".length) };
    if (id.startsWith("column-")) return { type: "column", raw: id.slice(7) };
    throw new Error(`Unknown drag id: ${id}`);
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const data = active.data.current as
      | { type: "card"; card: Card }
      | { type: "column"; column: LocalColumn }
      | undefined;
    if (!data) return;
    if (data.type === "card") setActiveCard(data.card);
    if (data.type === "column") setActiveColumn(data.column);
  }

  // While a card is dragged, splice it into the column under the cursor so the
  // user sees the card "follow" them across columns. Within a column,
  // reordering happens here too — onDragEnd just persists.
  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    const activeInfo = parseId(String(active.id));
    if (activeInfo.type !== "card") return; // column reorder handled in onDragEnd

    const sourceColumn = findColumnByCardId(activeInfo.raw);
    if (!sourceColumn) return;

    const overInfo = parseId(String(over.id));
    let targetColumnId: string;
    let targetIndex: number;

    if (overInfo.type === "card") {
      // Dropping over another card — splice in just before/after it.
      const targetColumn = findColumnByCardId(overInfo.raw);
      if (!targetColumn) return;
      targetColumnId = targetColumn.id;
      targetIndex = targetColumn.cards.findIndex((c) => c.id === overInfo.raw);
      // If we're dragging within the same column past our current index, the
      // displacement should land us AFTER the over-card, not before.
      if (sourceColumn.id === targetColumn.id) {
        const currentIndex = sourceColumn.cards.findIndex(
          (c) => c.id === activeInfo.raw,
        );
        if (currentIndex < targetIndex) targetIndex += 0; // arrayMove handles this
      }
    } else {
      // Dropping over a column body — append to end.
      targetColumnId = overInfo.raw;
      const targetColumn = columns.find((c) => c.id === targetColumnId);
      if (!targetColumn) return;
      targetIndex = targetColumn.cards.length;
    }

    if (sourceColumn.id === targetColumnId) {
      // Same-column reorder: arrayMove keeps semantics simple.
      const currentIndex = sourceColumn.cards.findIndex(
        (c) => c.id === activeInfo.raw,
      );
      if (currentIndex === targetIndex) return;
      setColumns((prev) =>
        prev.map((col) =>
          col.id === sourceColumn.id
            ? {
                ...col,
                cards: arrayMove(col.cards, currentIndex, targetIndex),
              }
            : col,
        ),
      );
      return;
    }

    // Cross-column move: remove from source, insert into target.
    setColumns((prev) => {
      const card = prev
        .find((c) => c.id === sourceColumn.id)
        ?.cards.find((c) => c.id === activeInfo.raw);
      if (!card) return prev;
      return prev.map((col) => {
        if (col.id === sourceColumn.id) {
          return {
            ...col,
            cards: col.cards.filter((c) => c.id !== activeInfo.raw),
          };
        }
        if (col.id === targetColumnId) {
          const next = col.cards.slice();
          next.splice(targetIndex, 0, { ...card, column_id: col.id });
          return { ...col, cards: next };
        }
        return col;
      });
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const activeInfo = parseId(String(active.id));

    setActiveCard(null);
    setActiveColumn(null);

    if (!over) return;

    if (activeInfo.type === "column") {
      // Column reorder: figure out new index, compute fractional position.
      const overInfo = parseId(String(over.id));
      if (overInfo.type !== "column") return;
      if (activeInfo.raw === overInfo.raw) return;

      const oldIndex = columns.findIndex((c) => c.id === activeInfo.raw);
      const newIndex = columns.findIndex((c) => c.id === overInfo.raw);
      if (oldIndex < 0 || newIndex < 0) return;

      const reordered = arrayMove(columns, oldIndex, newIndex);
      setColumns(reordered);

      const newPosition = positionForIndex(
        columns,
        newIndex,
        activeInfo.raw,
      );

      try {
        await moveColumn({ id: activeInfo.raw, position: newPosition });
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to move column",
        );
        setColumns(board.columns); // rollback
      }
      return;
    }

    // CARD: at this point onDragOver has already moved the card into its new
    // column/index in local state. Use that final position to compute the key.
    const cardId = activeInfo.raw;
    const owningColumn = columns.find((c) =>
      c.cards.some((card) => card.id === cardId),
    );
    if (!owningColumn) return;
    const finalIndex = owningColumn.cards.findIndex((c) => c.id === cardId);
    const newPosition = positionForIndex(owningColumn.cards, finalIndex, cardId);

    // Optimistically write the new position into local state so a quick second
    // drag has a consistent base to compute against.
    setColumns((prev) =>
      prev.map((col) =>
        col.id === owningColumn.id
          ? {
              ...col,
              cards: col.cards.map((c) =>
                c.id === cardId ? { ...c, position: newPosition } : c,
              ),
            }
          : col,
      ),
    );

    try {
      await moveCard({
        id: cardId,
        columnId: owningColumn.id,
        position: newPosition,
      });
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to move card");
      setColumns(board.columns); // rollback
    }
  }

  return (
    <DndContext
      id="kanban-board"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveCard(null);
        setActiveColumn(null);
        setColumns(board.columns);
      }}
    >
      <div className="flex h-full items-start gap-3 overflow-x-auto p-4 sm:p-6">
        <SortableContext
          items={columns.map((c) => `column-${c.id}`)}
          strategy={horizontalListSortingStrategy}
        >
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              cards={column.cards}
            />
          ))}
        </SortableContext>
        <CreateColumnButton boardId={board.id} />
      </div>
      <DragOverlay dropAnimation={null}>
        {activeCard ? <KanbanCard card={activeCard} isOverlay /> : null}
        {activeColumn ? (
          <KanbanColumn
            column={activeColumn}
            cards={activeColumn.cards}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
