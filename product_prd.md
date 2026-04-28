# TaskFlow — Product Requirements Document

> **Status:** Locked. This document defines what ships in the 48-hour build. Anything not in this document is explicitly out of scope.

## 1. Problem

A small software team needs a lightweight Trello-style task board. Members must be able to create boards, add columns and cards, and drag cards across columns to update their status. Card order must survive page reloads.

## 2. Goal

Ship a deployed (Vercel) web app where a single authenticated user can manage their own Kanban boards end-to-end, with a drag-and-drop experience that feels good on both desktop and mobile.

## 3. In Scope (must-haves)

| # | User story | Acceptance criteria |
|---|---|---|
| F1 | As a visitor, I can create an account with email + password and log in. | Signup creates a Supabase Auth user. Login redirects to `/boards`. Logout returns to `/login`. |
| F2 | As a logged-in user, I can create, view, and delete my own boards. | `/boards` lists my boards. "New board" dialog accepts a title. Delete asks for confirmation. I cannot see other users' boards. |
| F3 | As a board owner, I can create, rename, and delete columns. | Columns appear in saved order. Adding a column inserts at the end. |
| F4 | As a board owner, I can create cards in a column. | Inline "Add card" input at the bottom of each column. New card appears at the end of the column. |
| F5 | As a board owner, I can edit a card's title, description, deadline, and responsible person. | Click card opens a dialog with editable title, multi-line description, a date+time deadline picker, and name/email fields for the responsible person. Save persists; cancel discards. |
| F5a | As a board owner, I can see a deadline badge on each card. | Badge shows the date and time. It turns amber when due within 24 h and red when overdue. |
| F5b | As a board owner, I can see who is responsible for a card. | The responsible person's name appears as a badge on the card face. |
| F6 | As a board owner, I can delete a card. | Delete from card dialog or column menu. |
| F7 | As a board owner, I can drag a card to reorder it within a column. | Smooth pointer + touch drag with floating preview. Reordering persists across reload. |
| F8 | As a board owner, I can drag a card from one column to another. | Card moves to the dropped position in the target column. Persists across reload. |
| F9 | As a board owner, I can reorder columns by dragging the column header. | Persists across reload. |
| F10 | As a mobile user, I can drag cards by long-pressing. | 200 ms activation delay prevents accidental drags while scrolling. Tested at 375 px width. |

## 4. Out of Scope (explicit non-goals)

These are deliberately deferred so the in-scope list ships polished. The rationale is the brief's explicit guidance: **"temel sürükle-bırak mükemmel"** over **"çok özellik yarım"**.

- Real-time multi-user collaboration
- Board sharing / invitations / view-only links
- Card labels (colored chips)
- Deadline reminders / notifications
- Avatar photos for assignees; multiple assignees per card
- Card attachments / comments
- Activity log / move history
- Keyboard shortcuts beyond what dnd-kit provides for free
- Search / filter
- Dark mode toggle (system theme via Tailwind is acceptable bonus)
- Export / import
- Templates
- Native mobile app

## 5. Non-Functional Requirements

- **Persistence:** Every drag, edit, create, delete is durable in Postgres before the user navigates away. Page reload always reflects the latest state.
- **Authorization:** A user can never read or modify another user's data. Enforced by Supabase Row Level Security at the database level (defense in depth — not just app-layer checks).
- **Performance:** Drag remains smooth with 50 cards per column on mid-range hardware. Optimistic UI: drag feels instant regardless of network latency.
- **Mobile:** Layout works at 375 px. Cards are draggable on touch with long-press.
- **Accessibility:** dnd-kit's keyboard sensors are enabled (Tab to focus, Space to pick up, arrows to move, Space to drop).
- **Deploy:** Live on a Vercel URL with a working Supabase backend.

## 6. Success Criteria (mapped to grading rubric)

| Brief criterion | How we satisfy it |
|---|---|
| Drag-and-drop quality (visual cues, ordering, persistence) | DragOverlay floating preview, opacity dim on the source, smooth reordering animations, every drop writes to Postgres |
| Ordering robustness (survives reload) | Fractional indexing — order is stored in the row itself, fetched and sorted on every page load |
| Data model consistency (board → column → card) | Foreign-key cascades, RLS policies that traverse the chain, single source of truth in Postgres |
| Conscious library choices | DECISIONS.md documents every pick with alternatives and trade-offs |
| Mobile usability | Touch sensors with activation delay, horizontal-scroll layout, 375 px tested |
| Code quality and architectural consistency | Feature-sliced directory layout, Server Actions for mutations, pure ordering logic isolated and unit-tested |
| 48-hour focus discipline | Out-of-scope list above is enforced; polish over feature breadth |

## 7. Data Model (canonical)

```
boards   (id, owner_id → auth.users, title, created_at)
columns  (id, board_id → boards, title, position TEXT, created_at)
cards    (id, column_id → columns, title, description, position TEXT,
          deadline TIMESTAMPTZ, responsible_name TEXT, responsible_email TEXT,
          created_at, updated_at)
```

`position` is a fractional-index string (LexoRank-style). Rows are ordered lexicographically by `position`. Inserting between two siblings generates a string between their positions — no neighbor row is rewritten. See `src/lib/ordering/fractional.ts`.

## 8. Demo Script (used for final smoke test)

1. Sign up as `demo@example.com`.
2. Create board "Sprint 1".
3. Add columns: "To Do", "In Progress", "Done".
4. Add 4 cards to "To Do".
5. Drag the 3rd card to the top of "Done".
6. Reload the page → card is exactly where it was dropped.
7. Open in mobile emulation (375 px) → long-press a card and drag it.
8. Open second browser as `demo2@example.com` → verify they see no boards.
