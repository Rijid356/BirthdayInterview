// @ts-check
const { test, expect } = require('@playwright/test');

// React Native Web renders testID as data-testid
const tid = (id) => `[data-testid="${id}"]`;

/**
 * Navigate from HomeScreen to AddChildScreen and wait for the birthday input.
 * Returns locators for the key elements.
 */
async function navigateToAddChild(page) {
  await page.goto('/');

  // Wait for HomeScreen to load, then click the add-first-child button
  const addButton = page.locator(tid('button-add-first-child'));
  await addButton.waitFor({ state: 'visible', timeout: 30000 });
  await addButton.click();

  // Wait for AddChildScreen inputs to appear
  const nameInput = page.locator(tid('input-name'));
  await nameInput.waitFor({ state: 'visible', timeout: 10000 });

  return {
    nameInput,
    birthdayInput: page.locator(tid('input-birthday')),
    saveButton: page.locator(tid('button-save')),
    errorName: page.locator(tid('error-name')),
    errorBirthday: page.locator(tid('error-birthday')),
  };
}

test.describe('AddChildScreen — Birthday Input', () => {
  test('1. Valid date saves and navigates back to HomeScreen', async ({ page }) => {
    const { nameInput, birthdayInput, saveButton } = await navigateToAddChild(page);

    await nameInput.fill('Nina');
    await birthdayInput.fill('02/14/2020');
    await saveButton.click();

    // Should navigate back to HomeScreen and show the child card
    await expect(page.getByText('Nina')).toBeVisible({ timeout: 10000 });
  });

  test('2. Digits only (no slashes) auto-formats and saves successfully', async ({ page }) => {
    const { nameInput, birthdayInput, saveButton } =
      await navigateToAddChild(page);

    await nameInput.fill('Test');
    await birthdayInput.fill('02142020');

    // Auto-formatter should produce MM/DD/YYYY
    await expect(birthdayInput).toHaveValue('02/14/2020');
    await saveButton.click();

    // Should navigate back to HomeScreen and show the child card
    await expect(page.getByText('Test')).toBeVisible({ timeout: 10000 });
  });

  test('3. Empty fields show required errors', async ({ page }) => {
    const { saveButton, errorName, errorBirthday } = await navigateToAddChild(page);

    await saveButton.click();

    await expect(errorName).toBeVisible();
    await expect(errorName).toHaveText('Name is required');
    await expect(errorBirthday).toBeVisible();
    await expect(errorBirthday).toHaveText('Birthday is required');
  });

  test('4. Invalid month (13) is rejected', async ({ page }) => {
    const { nameInput, birthdayInput, saveButton, errorBirthday } =
      await navigateToAddChild(page);

    await nameInput.fill('Test');
    await birthdayInput.fill('13/15/2020');
    await saveButton.click();

    await expect(errorBirthday).toBeVisible();
    await expect(errorBirthday).toHaveText('Enter a valid date (MM/DD/YYYY)');
  });

  test('5. Invalid day for month (Feb 30) is rejected', async ({ page }) => {
    const { nameInput, birthdayInput, saveButton, errorBirthday } =
      await navigateToAddChild(page);

    await nameInput.fill('Test');
    await birthdayInput.fill('02/30/2020');
    await saveButton.click();

    await expect(errorBirthday).toBeVisible();
    await expect(errorBirthday).toHaveText('Enter a valid date (MM/DD/YYYY)');
  });

  test('6. Error clears when user types in the field', async ({ page }) => {
    const { nameInput, birthdayInput, saveButton, errorBirthday } =
      await navigateToAddChild(page);

    // Trigger error first
    await nameInput.fill('Test');
    await saveButton.click();
    await expect(errorBirthday).toBeVisible();

    // Type in birthday field — error should disappear
    await birthdayInput.fill('0');
    await expect(errorBirthday).not.toBeVisible();
  });

  test('7. pressSequentially with valid date saves successfully', async ({ page }) => {
    const { nameInput, birthdayInput, saveButton } = await navigateToAddChild(page);

    await nameInput.fill('Milo');
    await birthdayInput.pressSequentially('02/14/2020', { delay: 50 });
    await saveButton.click();

    // Should navigate back and show the child
    await expect(page.getByText('Milo')).toBeVisible({ timeout: 10000 });
  });

  test('8. maxLength=10 truncates longer input', async ({ page }) => {
    const { birthdayInput } = await navigateToAddChild(page);

    await birthdayInput.fill('02/14/20201');

    // The value should be truncated to 10 characters
    const value = await birthdayInput.inputValue();
    expect(value.length).toBeLessThanOrEqual(10);
  });

  test('9. Digits-only via pressSequentially auto-formats and saves', async ({
    page,
  }) => {
    const { nameInput, birthdayInput, saveButton } =
      await navigateToAddChild(page);

    await nameInput.fill('Zara');
    // Type digits only, no slashes — simulates a number-pad keyboard
    await birthdayInput.pressSequentially('02142020', { delay: 50 });

    // Auto-formatter should produce MM/DD/YYYY
    await expect(birthdayInput).toHaveValue('02/14/2020');
    await saveButton.click();

    // Should navigate back to HomeScreen and show the child card
    await expect(page.getByText('Zara')).toBeVisible({ timeout: 10000 });
  });
});
