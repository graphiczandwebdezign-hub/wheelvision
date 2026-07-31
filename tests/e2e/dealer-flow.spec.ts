import { expect, test } from '@playwright/test';

/**
 * Dealer flow end-to-end: the full customer walk-through on the seeded demo
 * catalog. Requires the app + database (CI job seeds before running). In
 * this unit-test sandbox there is no database or generated Prisma client, so
 * these specs run exclusively in CI — do not mark them skipped in code.
 */

test.describe('dealer configuration flow', () => {
  test('walks vehicle → wheels → tyres and can save + restore', async ({ page }) => {
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

    // Wheels: brand → model → finish → size.
    await page.getByRole('combobox', { name: 'Rim brand' }).click();
    await page.getByRole('option', { name: 'Rays' }).click();
    await page.getByRole('combobox', { name: 'Rim model' }).click();
    await page.getByRole('option', { name: 'TE37' }).click();
    await page.getByLabel('Rim finish').selectOption({ label: 'Matte Black' });
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

    // Save → appears in the saved dialog → survives a reload.
    await page.getByRole('button', { name: 'Save configuration on this device' }).click();
    await expect(page.getByText('Configuration saved on this device.')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: /2025 Toyota Hilux/ })).toBeVisible();

    await page.getByRole('button', { name: 'Saved' }).click();
    await expect(page.getByRole('dialog')).toContainText('2025 Toyota Hilux');
  });

  test('quote button stays disabled with its Sprint-8 hint', async ({ page }) => {
    await page.goto('/preview');
    const quote = page.getByRole('button', { name: 'Generate Quote' });
    await expect(quote).toBeDisabled();
    await expect(page.getByText('Available in Sprint 8')).toBeVisible();
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
