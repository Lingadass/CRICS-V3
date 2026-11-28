import { test, expect, Page } from '@playwright/test';

const MOBILE_DEVICE = {
  viewport: { width: 360, height: 728 },
  hasTouch: true,
  isMobile: true,
};

async function dismissSplashAndEnsureSampleData(page: Page) {
  await page.goto('/');
  const splash = page.getByTestId('intro-splash');
  if (await splash.isVisible({ timeout: 2000 }).catch(() => false)) {
    await splash.click({ force: true }).catch(() => {});
    await expect(splash).toBeHidden({ timeout: 5000 }).catch(() => {});
  }
  const resumeBtn = page.getByTestId('hero-resume-live-btn');
  if (await resumeBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    return;
  }
  const sampleBtn = page.getByTestId('welcome-sample-data-btn');
  await expect(sampleBtn).toBeVisible({ timeout: 10000 });
  await sampleBtn.click();
  await expect(page.getByTestId('hero-resume-live-btn')).toBeVisible({ timeout: 15000 });
}

test.describe('STAGE 11.3: Modal Focus Bug (Typing focus retention & Mobile keyboard prevention)', () => {
  test.use(MOBILE_DEVICE);

  test('a) Team form: character-by-character typing in short code maintains focus and grows value', async ({
    page,
  }) => {
    await dismissSplashAndEnsureSampleData(page);
    await page.goto('/#/teams');

    // Open Add Team Modal
    const createBtn = page.getByRole('button', { name: /create team|new team|add team|टीम बनाएं/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();

    const teamDialog = page.getByRole('dialog');
    await expect(teamDialog).toBeVisible();

    // Tap Team Name input
    const nameInput = page.locator('#team-form-name');
    await nameInput.click();
    await page.keyboard.type('Titans', { delay: 50 });
    expect(await nameInput.inputValue()).toBe('Titans');

    // Tap Short code input
    const shortCodeInput = page.locator('#team-form-shortcode');
    await shortCodeInput.click();

    // Type "ABCD" character by character with small delay
    const chars = 'ABCD';
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      await page.keyboard.type(char, { delay: 50 });

      // After every character assert short code input is still activeElement
      const activeElementId = await page.evaluate(() => document.activeElement?.id);
      expect(activeElementId, `Active element after typing '${char}'`).toBe('team-form-shortcode');

      // Value grows appropriately
      const val = await shortCodeInput.inputValue();
      expect(val).toBe(chars.slice(0, i + 1));
    }
    expect(await shortCodeInput.inputValue()).toBe('ABCD');
  });

  test('b) Team form: selecting squad players does not focus text inputs or open keyboard', async ({
    page,
  }) => {
    await dismissSplashAndEnsureSampleData(page);
    await page.goto('/#/teams');

    const createBtn = page.getByRole('button', { name: /create team|new team|add team|टीम बनाएं/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();

    const teamDialog = page.getByRole('dialog');
    await expect(teamDialog).toBeVisible();

    // Wait for squad member checkboxes to be rendered
    const firstCheckbox = teamDialog.locator('input[type="checkbox"]').first();
    await expect(firstCheckbox).toBeVisible({ timeout: 10000 });

    const checkboxes = teamDialog.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    expect(count).toBeGreaterThan(0);

    // Tap squad member checkboxes
    for (let i = 0; i < Math.min(count, 3); i++) {
      await checkboxes.nth(i).click();

      // Assert active element is not a text input or textarea
      const activeTag = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return { tag: 'none', type: '' };
        const tag = el.tagName.toUpperCase();
        const type = (el as HTMLInputElement).type?.toLowerCase() || '';
        return { tag, type };
      });

      expect(activeTag.tag !== 'INPUT' || activeTag.type === 'checkbox', `Active element should not be text entry after squad selection`).toBe(true);
      expect(activeTag.tag).not.toBe('TEXTAREA');
    }
  });

  test('c) Player registration: focus retention in all text fields and dropdown selection safety', async ({
    page,
  }) => {
    await dismissSplashAndEnsureSampleData(page);
    await page.goto('/#/players');

    // Open Add Player Modal
    const addPlayerBtn = page.getByRole('button', { name: /add player|register player|खिलाड़ी जोड़ें/i }).first();
    await expect(addPlayerBtn).toBeVisible({ timeout: 10000 });
    await addPlayerBtn.click();

    const playerDialog = page.getByRole('dialog');
    await expect(playerDialog).toBeVisible();

    // 1. Name input
    const nameInput = page.locator('#player-form-name');
    await nameInput.click();
    const nameStr = 'Virat';
    for (let i = 0; i < nameStr.length; i++) {
      await page.keyboard.type(nameStr[i], { delay: 50 });
      expect(await page.evaluate(() => document.activeElement?.id)).toBe('player-form-name');
    }
    expect(await nameInput.inputValue()).toBe('Virat');

    // 2. Phone input
    const phoneInput = page.locator('#player-form-phone');
    await phoneInput.click();
    const phoneStr = '98765';
    for (let i = 0; i < phoneStr.length; i++) {
      await page.keyboard.type(phoneStr[i], { delay: 50 });
      expect(await page.evaluate(() => document.activeElement?.id)).toBe('player-form-phone');
    }
    expect(await phoneInput.inputValue()).toBe('98765');

    // 3. Jersey input
    const jerseyInput = page.locator('#player-form-jersey');
    await jerseyInput.click();
    const jerseyStr = '18';
    for (let i = 0; i < jerseyStr.length; i++) {
      await page.keyboard.type(jerseyStr[i], { delay: 50 });
      expect(await page.evaluate(() => document.activeElement?.id)).toBe('player-form-jersey');
    }
    expect(await jerseyInput.inputValue()).toBe('18');

    // 4. Notes input
    const notesInput = page.locator('#player-form-notes');
    await notesInput.click();
    const notesStr = 'TopOrder';
    for (let i = 0; i < notesStr.length; i++) {
      await page.keyboard.type(notesStr[i], { delay: 50 });
      expect(await page.evaluate(() => document.activeElement?.id)).toBe('player-form-notes');
    }
    expect(await notesInput.inputValue()).toBe('TopOrder');

    // 5. Change role dropdown: assert focus is NOT on a text input
    const roleSelect = page.locator('#player-form-role');
    await roleSelect.focus();
    await roleSelect.selectOption('All-Rounder');
    const activeAfterRole = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? { tag: el.tagName.toUpperCase(), type: (el as HTMLInputElement).type } : null;
    });
    expect(activeAfterRole?.type).not.toBe('text');
    expect(activeAfterRole?.tag).not.toBe('TEXTAREA');

    // 6. Change batting style dropdown: assert focus is NOT on a text input
    const battingSelect = page.locator('#player-form-batting');
    await battingSelect.focus();
    await battingSelect.selectOption('Left-hand bat');
    const activeAfterBat = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? { tag: el.tagName.toUpperCase(), type: (el as HTMLInputElement).type } : null;
    });
    expect(activeAfterBat?.type).not.toBe('text');
    expect(activeAfterBat?.tag).not.toBe('TEXTAREA');
  });

  test('d) Focus retention in Tournament creation, Settings code, and Live scorer dialogs', async ({
    page,
  }) => {
    await dismissSplashAndEnsureSampleData(page);

    // 1. Tournament Creation Name Field
    await page.goto('/#/tournaments');
    const newTourBtn = page.getByTestId('create-tournament-btn').first();
    await expect(newTourBtn).toBeVisible({ timeout: 10000 });
    await newTourBtn.click({ force: true });

    const tourDialog = page.getByRole('dialog');
    await expect(tourDialog).toBeVisible();

    const tourNameInput = page.locator('#create-tour-name');
    await tourNameInput.click();
    const tourStr = 'PremierLeague';
    for (let i = 0; i < tourStr.length; i++) {
      await page.keyboard.type(tourStr[i], { delay: 50 });
      expect(await page.evaluate(() => document.activeElement?.id)).toBe('create-tour-name');
    }
    expect(await tourNameInput.inputValue()).toBe('PremierLeague');

    // Close tournament modal via Escape
    await page.keyboard.press('Escape');
    await expect(tourDialog).toBeHidden();

    // 2. Settings Security Code Field
    await page.goto('/#/settings');
    const secCodeInput = page.getByTestId('settings-club-code-input');
    await expect(secCodeInput).toBeVisible({ timeout: 10000 });
    await secCodeInput.click();
    const codeStr = 'SEC9';
    for (let i = 0; i < codeStr.length; i++) {
      await page.keyboard.type(codeStr[i], { delay: 50 });
      expect(await page.evaluate(() => document.activeElement?.getAttribute('data-testid'))).toBe(
        'settings-club-code-input'
      );
    }
    expect(await secCodeInput.inputValue()).toBe('SEC9');

    // 3. Live Scorer Edit / Target Dialog
    await page.goto('/');
    const splash = page.getByTestId('intro-splash');
    if (await splash.isVisible({ timeout: 1500 }).catch(() => false)) {
      await splash.click({ force: true }).catch(() => {});
      await expect(splash).toBeHidden({ timeout: 5000 }).catch(() => {});
    }
    const resumeBtn = page.getByTestId('hero-resume-live-btn');
    await expect(resumeBtn).toBeVisible({ timeout: 10000 });
    await resumeBtn.click();
    await expect(page.getByTestId('live-scoreboard-card')).toBeVisible();

    // Open More Actions -> Revised Target (DLS)
    await page.getByTestId('live-more-actions-btn').click();
    const moreSheet = page.getByRole('dialog');
    await expect(moreSheet).toBeVisible();

    const dlsActionBtn = moreSheet.getByRole('button', { name: /revised target|dls/i });
    if (await dlsActionBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dlsActionBtn.click();
      const targetModal = page.getByRole('dialog');
      await expect(targetModal).toBeVisible();

      const runsInput = page.locator('#revised-target-runs-input');
      await expect(runsInput).toBeVisible();
      await runsInput.click();
      await runsInput.fill('');
      const targetVal = '185';
      for (let i = 0; i < targetVal.length; i++) {
        await page.keyboard.type(targetVal[i], { delay: 50 });
        expect(await page.evaluate(() => document.activeElement?.id)).toBe('revised-target-runs-input');
      }
      expect(await runsInput.inputValue()).toBe('185');

      // Close modal via Escape
      await page.keyboard.press('Escape');
      await expect(targetModal).toBeHidden();
    } else {
      const editBallActionBtn = moreSheet.getByRole('button', { name: /edit ball/i });
      await editBallActionBtn.click();
      const editModal = page.getByRole('dialog');
      await expect(editModal).toBeVisible();

      const deliveryItem = editModal.getByRole('button', { name: /seq/i }).first();
      if (await deliveryItem.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deliveryItem.click();
      }

      const runsOffBatInput = page.locator('#edit-runs-off-bat');
      if (await runsOffBatInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await runsOffBatInput.click();
        await page.keyboard.type('2', { delay: 50 });
        expect(await page.evaluate(() => document.activeElement?.id)).toBe('edit-runs-off-bat');
      }
      await page.keyboard.press('Escape');
      await expect(editModal).toBeHidden();
    }
  });

  test('e) Open each dialog and assert document.activeElement is dialog container or button, NEVER input', async ({
    page,
  }) => {
    await dismissSplashAndEnsureSampleData(page);

    // 1. Team form modal
    await page.goto('/#/teams');
    const createTeamBtn = page.getByRole('button', { name: /create team|new team|add team/i }).first();
    await createTeamBtn.click();
    await page.waitForSelector('[role="dialog"]');

    const activeInTeamDialog = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        role: el?.getAttribute('role'),
        tag: el?.tagName.toUpperCase(),
        tabIndex: el?.getAttribute('tabindex'),
      };
    });
    // Dialog container or button, never INPUT/TEXTAREA/SELECT
    expect(['INPUT', 'TEXTAREA', 'SELECT'].includes(activeInTeamDialog.tag || '')).toBe(false);
    expect(activeInTeamDialog.role === 'dialog' || activeInTeamDialog.tag === 'BUTTON').toBe(true);

    // Close team dialog
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // 2. Player registration modal
    await page.goto('/#/players');
    const addPlayerBtn = page.getByRole('button', { name: /add player|register player/i }).first();
    await addPlayerBtn.click();
    await page.waitForSelector('[role="dialog"]');

    const activeInPlayerDialog = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        role: el?.getAttribute('role'),
        tag: el?.tagName.toUpperCase(),
        tabIndex: el?.getAttribute('tabindex'),
      };
    });
    expect(['INPUT', 'TEXTAREA', 'SELECT'].includes(activeInPlayerDialog.tag || '')).toBe(false);
    expect(activeInPlayerDialog.role === 'dialog' || activeInPlayerDialog.tag === 'BUTTON').toBe(true);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // 3. Tournament modal
    await page.goto('/#/tournaments');
    const newTourBtn = page.getByTestId('create-tournament-btn').first();
    await expect(newTourBtn).toBeVisible({ timeout: 10000 });
    await newTourBtn.click({ force: true });
    await page.waitForSelector('[role="dialog"]');

    const activeInTourDialog = await page.evaluate(() => {
      const el = document.activeElement;
      return {
        role: el?.getAttribute('role'),
        tag: el?.tagName.toUpperCase(),
        tabIndex: el?.getAttribute('tabindex'),
      };
    });
    expect(['INPUT', 'TEXTAREA', 'SELECT'].includes(activeInTourDialog.tag || '')).toBe(false);
    expect(activeInTourDialog.role === 'dialog' || activeInTourDialog.tag === 'BUTTON').toBe(true);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  });

  test('f) Open a dialog, close it, and assert focus returns to the button that opened it', async ({
    page,
  }) => {
    await dismissSplashAndEnsureSampleData(page);
    await page.goto('/#/players');

    const addPlayerBtn = page.getByRole('button', { name: /add player|register player/i }).first();
    await expect(addPlayerBtn).toBeVisible({ timeout: 10000 });

    // Focus the button and open dialog
    await addPlayerBtn.focus();
    await addPlayerBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Close the dialog using Escape key
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // Assert focus has returned to addPlayerBtn
    const isTriggerFocused = await addPlayerBtn.evaluate((node) => document.activeElement === node);
    expect(isTriggerFocused, 'Focus must return to the trigger button that opened the dialog').toBe(true);
  });
});
