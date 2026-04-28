"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createCard } from "../actions";

export function CreateCardButton({ columnId }: { columnId: string }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  function reset() {
    setTitle("");
    setEditing(false);
  }

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) {
      reset();
      return;
    }
    startTransition(async () => {
      try {
        await createCard({ columnId, title: trimmed });
        router.refresh();
        // Stay in edit mode so the user can rapidly add more cards.
        setTitle("");
        textareaRef.current?.focus();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add card");
      }
    });
  }

  if (!editing) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        onClick={() => setEditing(true)}
      >
        <Plus className="h-4 w-4" />
        Add a card
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-md border bg-background p-2">
      <Textarea
        ref={textareaRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") reset();
        }}
        placeholder="Enter card title..."
        rows={2}
        maxLength={200}
        disabled={pending}
        className="resize-none text-sm"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={pending}>
          Add
        </Button>
        <Button size="sm" variant="ghost" onClick={reset} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
