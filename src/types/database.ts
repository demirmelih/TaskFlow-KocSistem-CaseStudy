// Hand-typed mirror of the Supabase schema. In a longer-lived project we'd
// generate this with `supabase gen types typescript`, but for a 48h scope a
// hand-written contract is faster and equally type-safe.

export type Board = {
  id: string;
  owner_id: string;
  title: string;
  created_at: string;
};

export type Column = {
  id: string;
  board_id: string;
  title: string;
  position: string;
  created_at: string;
};

export type Card = {
  id: string;
  column_id: string;
  title: string;
  description: string | null;
  position: string;
  deadline: string | null;
  responsible_name: string | null;
  responsible_email: string | null;
  created_at: string;
  updated_at: string;
};

export type BoardWithChildren = Board & {
  columns: (Column & { cards: Card[] })[];
};
