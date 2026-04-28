import { test, expect } from "@playwright/test";

// End-to-end smoke test for the headline feature: drag a card across columns
// and verify the new position survives a page reload.
//
// Requirements to run:
// - .env.local has a working NEXT_PUBLIC_SUPABASE_URL and ANON_KEY
// - In Supabase Auth → Providers → Email, "Confirm email" is OFF
// - The migration in supabase/migrations/0001_init.sql has been applied
//
// The test creates a fresh user per run (timestamped email) so it does not
// collide with previous runs.

const stamp = Date.now();
const EMAIL = `e2e-${stamp}@taskflow.test`;
const PASSWORD = "test-password-12345";

test("drag a card across columns and verify persistence", async ({ page }) => {
  // Sign up
  await page.goto("/signup");
  await page.getByLabel(/email/i).fill(EMAIL);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/boards/);

  // Create a board
  await page.getByRole("button", { name: /new board/i }).click();
  await page.getByLabel(/title/i).fill("E2E Board");
  await page.getByRole("button", { name: /^create$/i }).click();
  await expect(page).toHaveURL(/\/boards\//);
  await expect(page.getByRole("heading", { name: "E2E Board" })).toBeVisible();

  // Add three columns
  for (const title of ["To Do", "In Progress", "Done"]) {
    await page.getByRole("button", { name: /add column/i }).click();
    await page.getByPlaceholder("Column title").fill(title);
    await page.getByPlaceholder("Column title").press("Enter");
    await expect(
      page.getByRole("button", { name: title, exact: true }),
    ).toBeVisible();
  }

  // Add a card to "To Do"
  const todoColumn = page
    .locator("div", { has: page.getByRole("button", { name: "To Do", exact: true }) })
    .first();
  await todoColumn.getByRole("button", { name: /add a card/i }).click();
  await page.getByPlaceholder("Enter card title...").fill("Drag me");
  await page.getByRole("button", { name: /^add$/i }).click();
  await expect(page.getByText("Drag me")).toBeVisible();

  // Drag the card to the "Done" column body
  const card = page.getByText("Drag me");
  const doneColumn = page
    .locator("div", { has: page.getByRole("button", { name: "Done", exact: true }) })
    .first();
  await card.dragTo(doneColumn);

  // Reload and verify the card is now under "Done"
  await page.reload();
  const doneAfterReload = page
    .locator("div", { has: page.getByRole("button", { name: "Done", exact: true }) })
    .first();
  await expect(doneAfterReload.getByText("Drag me")).toBeVisible();
});
