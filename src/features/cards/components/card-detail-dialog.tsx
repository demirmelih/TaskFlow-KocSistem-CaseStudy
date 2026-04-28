"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { deleteCard, updateCard } from "../actions";
import type { Card } from "@/types/database";

interface CardDetailDialogProps {
  card: Card;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Split a UTC ISO string into [YYYY-MM-DD, HH:mm] in the browser's local timezone.
// Needed because <input type="date"> and <input type="time"> expect local values.
function splitDeadline(iso: string): [string, string] {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return [date, time];
}

export function CardDetailDialog({
  card,
  open,
  onOpenChange,
}: CardDetailDialogProps) {
  const router = useRouter();
  const [title, setTitle] = React.useState(card.title);
  const [description, setDescription] = React.useState(card.description ?? "");

  // Split into two separate controlled inputs to avoid the datetime-local
  // partial-fill bug: Chrome fires onChange with value="" whenever the user
  // fills the date sub-field but hasn't touched the time sub-field yet,
  // which clears the input immediately. Separate date/time inputs don't
  // have this problem — each always produces a complete value.
  const [deadlineDate, setDeadlineDate] = React.useState(() => {
    if (!card.deadline) return "";
    return splitDeadline(card.deadline)[0];
  });
  const [deadlineTime, setDeadlineTime] = React.useState(() => {
    if (!card.deadline) return "00:00";
    return splitDeadline(card.deadline)[1];
  });

  const [responsibleName, setResponsibleName] = React.useState(
    card.responsible_name ?? "",
  );
  const [responsibleEmail, setResponsibleEmail] = React.useState(
    card.responsible_email ?? "",
  );
  const [pending, startTransition] = React.useTransition();

  // Only reset form when a DIFFERENT card is opened (card.id changes).
  // Depending on all card fields caused background router.refresh() calls
  // (from drags or other mutations) to wipe edits mid-session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    setTitle(card.title);
    setDescription(card.description ?? "");
    if (card.deadline) {
      const [d, t] = splitDeadline(card.deadline);
      setDeadlineDate(d);
      setDeadlineTime(t);
    } else {
      setDeadlineDate("");
      setDeadlineTime("00:00");
    }
    setResponsibleName(card.responsible_name ?? "");
    setResponsibleEmail(card.responsible_email ?? "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

  function save() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast.error("Title cannot be empty");
      return;
    }

    const trimmedEmail = responsibleEmail.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Combine the split date + time back into a UTC ISO string for the DB.
    // If no date is set, the deadline is cleared (null).
    let deadlineISO: string | null = null;
    if (deadlineDate) {
      deadlineISO = new Date(
        `${deadlineDate}T${deadlineTime || "00:00"}`,
      ).toISOString();
    }

    startTransition(async () => {
      try {
        await updateCard({
          id: card.id,
          title: trimmedTitle,
          description: description.trim() === "" ? null : description,
          deadline: deadlineISO,
          responsible_name: responsibleName.trim() || null,
          responsible_email: trimmedEmail || null,
        });
        router.refresh();
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  function remove() {
    if (!confirm("Delete this card?")) return;
    startTransition(async () => {
      try {
        await deleteCard({ id: card.id });
        router.refresh();
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="sr-only">Edit card</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="card-title">Title</Label>
            <Input
              id="card-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="card-description">Description</Label>
            <Textarea
              id="card-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a more detailed description..."
              rows={4}
              maxLength={5000}
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Deadline</Label>
              {deadlineDate ? (
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                  onClick={() => { setDeadlineDate(""); setDeadlineTime("00:00"); }}
                  disabled={pending}
                >
                  Clear
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                id="card-deadline-date"
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                disabled={pending}
                aria-label="Deadline date"
              />
              <Input
                id="card-deadline-time"
                type="time"
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
                disabled={pending || !deadlineDate}
                aria-label="Deadline time"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="card-responsible-name">Responsible — name</Label>
              <Input
                id="card-responsible-name"
                value={responsibleName}
                onChange={(e) => setResponsibleName(e.target.value)}
                placeholder="Jane Doe"
                maxLength={200}
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-responsible-email">Responsible — email</Label>
              <Input
                id="card-responsible-email"
                type="email"
                value={responsibleEmail}
                onChange={(e) => setResponsibleEmail(e.target.value)}
                placeholder="jane@example.com"
                maxLength={200}
                disabled={pending}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button
            variant="ghost"
            className="gap-2 text-destructive hover:text-destructive"
            onClick={remove}
            disabled={pending}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
