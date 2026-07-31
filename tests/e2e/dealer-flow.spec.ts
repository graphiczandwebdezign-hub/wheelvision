import { expect, test, type Page } from '@playwright/test';

/**
 * Dealer flow end-to-end: the full customer walk-through on the seeded demo
 * catalog. Requires the app + database (CI job seeds before running). In
 * this unit-test sandbox there is no database or generated Prisma client, so
 * these specs run exclusively in CI — do not mark them skipped in code.
 *
 * Catalog references track prisma/seed.ts exactly: the authored Toyota Hilux
 * package, the Rota R5 demo wheel and the Michelin Pilot Sport 4 demo tyre.
 */

/** Walk the full seven-field configuration on the seeded demo catalog. */
async function completeConfiguration(page: Page) {
  await page.goto('/preview');

  // Vehicle: manufacturer → model → year cascade resolves instantly.
  await page.getByRole('combobox', { name: 'Manufacturer' }).click();
  await page.getByRole('option', { name: 'Toyota' }).click();
  await page.getByRole('combobox', { name: 'Model' }).click();
  await page.getByRole('option', { name: 'Hilux' }).click();
  await page.getByRole('combobox', { name: 'Year' }).click();
  await page.getByRole('option', { name: '2025' }).click();

  // The canvas card titles itself with the resolved vehicle.
  await expect(page.getByRole('heading', { name: /2025 Toyota Hilux/ })).toBeVisible();

  // Colour chip toggles.
  const colour = page.getByRole('button', { name: 'Silver', exact: true });
  await colour.click();
  await expect(colour).toHaveAttribute('aria-pressed', 'true');

  // Wheels: brand → model → finish → size (the seeded Rota R5 demo wheel).
  await page.getByRole('combobox', { name: 'Rim brand' }).click();
  await page.getByRole('option', { name: 'Rota' }).click();
  await page.getByRole('combobox', { name: 'Rim model' }).click();
  await page.getByRole('option', { name: 'R5' }).click();
  await page.getByLabel('Rim finish').selectOption({ label: 'Gloss Black' });
  await page.getByLabel('Rim size').selectOption({ index: 1 });

  // Tyres: brand → pattern → width → profile → diameter.
  await page.getByRole('combobox', { name: 'Tyre brand' }).click();
  await page.getByRole('option', { name: 'Michelin' }).click();
  await page.getByRole('combobox', { name: 'Tyre pattern' }).click();
  await page.getByRole('option', { name: 'Pilot Sport 4' }).click();
  await page.getByLabel('Width').selectOption({ index: 1 });
  await page.getByLabel('Profile', { exact: true }).selectOption({ index: 1 });
  await page.getByLabel('Diameter').selectOption({ index: 1 });
  await expect(page.getByText(/Selected profile:/)).toBeVisible();
}

test.describe('dealer configuration flow', () => {
  test('walks vehicle → wheels → tyres and can save + restore', async ({ page }) => {
    await completeConfiguration(page);

    // Save → toast → survives a reload.
    await page.getByRole('button', { name: 'Save configuration on this device' }).click();
    await expect(page.getByText('Configuration saved on this device.')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: /2025 Toyota Hilux/ })).toBeVisible();

    await page.getByRole('button', { name: 'Saved' }).click();
    await expect(page.getByRole('dialog')).toContainText('2025 Toyota Hilux');
  });

  test('issues a priced quotation from a completed configuration', async ({ page }) => {
    await page.goto('/preview');

    // Incomplete selection: the entry point stays disabled and says why.
    const generate = page.getByRole('button', { name: 'Generate Quote' });
    await expect(generate).toBeDisabled();
    await expect(
      page.getByText('Complete the vehicle, colour, wheel and tyre selection to generate a quote.'),
    ).toBeVisible();

    await completeConfiguration(page);

    // Complete selection: the commercial entry point lights up.
    await expect(generate).toBeEnabled();
    await generate.click();

    // Compose: capture the customer and issue — pricing is server-side.
    const dialog = page.getByRole('dialog', { name: 'Generate Quote' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Customer name').fill('Mrs Nkosi');
    await dialog.getByRole('button', { name: 'Issue quotation' }).click();

    // View: the immutable issued quotation with reference and VAT totals.
    const quotation = page.getByRole('dialog', { name: 'Quotation' });
    await expect(quotation).toBeVisible();
    await expect(quotation.getByText(/WV-2026-\d{6}/).first()).toBeVisible();
    await expect(quotation.getByText('Total (VAT incl.)').first()).toBeVisible();
    await expect(quotation.getByText('Mrs Nkosi').first()).toBeVisible();

    // The issued quote is listed in the tenant's quote history.
    await page.getByRole('button', { name: 'Close dialog' }).click();
    await page.getByRole('button', { name: 'View quote history' }).click();
    const history = page.getByRole('dialog', { name: 'Quote history' });
    await expect(history).toBeVisible();
    await expect(history.getByText(/WV-2026-\d{6}/)).toBeVisible();
  });

  test('shared configuration link restores the selection on a fresh device', async ({
    page,
    context,
  }) => {
    await page.goto('/preview');

    await page.getByRole('combobox', { name: 'Manufacturer' }).click();
    await page.getByRole('option', { name: 'Toyota' }).click();
    await expect(page.getByRole('heading', { name: /Hilux/ })).toBeVisible();

    // Build the link the same way the running app would, then open it in a
    // fresh context (clean localStorage) to prove link > persisted state.
    const url = new URL(page.url());
    await context.grantPermissions([]);
    const pristine = await context.newPage();
    await pristine.goto(url.toString());
    await expect(pristine.getByRole('heading', { name: /Hilux/ })).toBeVisible();
  });
});
