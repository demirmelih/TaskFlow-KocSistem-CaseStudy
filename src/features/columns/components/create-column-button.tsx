"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createColumn } from "../actions";

export function CreateColumnButton({ boardId }: { boardId: string }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [pending, startTransition] = React.useTransition();
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editing) inputRef.current?.focus();
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
        await createColumn({ boardId, title: trimmed });
        router.refresh();
        reset();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add column");
      }
    });
  }

  if (!editing) {
    return (
      <Button
        variant="outline"
        className="h-10 w-72 shrink-0 justify-start gap-2 border-dashed"
        onClick={() => setEditing(true)}
      >
        <Plus className="h-4 w-4" />
        Add column
      </Button>
    );
  }

  return (
    <div className="w-72 shrink-0 rounded-md border bg-card p-2 shadow-sm">
      <Input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") reset();
        }}
        onBlur={submit}
        placeholder="Column title"
        maxLength={120}
        disabled={pending}
      />
    </div>
  );
}
