import { describe, expect, it, vi, afterEach } from 'vitest';
import { registerModalEscapeListener } from './useFocusTrap';

describe('useFocusTrap & registerModalEscapeListener unit tests (existing stubs)', () => {
  const origDocument = globalThis.document;
  const origWindow = globalThis.window;

  afterEach(() => {
    Object.defineProperty(globalThis, 'document', {
      value: origDocument,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'window', {
      value: origWindow,
      configurable: true,
      writable: true,
    });
    vi.restoreAllMocks();
  });

  function createMockTarget() {
    const listeners: Record<string, ((ev: { key: string; shiftKey?: boolean; preventDefault?: () => void }) => void)[]> = {};
    return {
      listeners,
      target: {
        addEventListener: (type: 'keydown', fn: (ev: { key: string; shiftKey?: boolean; preventDefault?: () => void }) => void) => {
          listeners[type] = listeners[type] || [];
          listeners[type].push(fn);
        },
        removeEventListener: (type: 'keydown', fn: (ev: { key: string; shiftKey?: boolean; preventDefault?: () => void }) => void) => {
          listeners[type] = (listeners[type] || []).filter((f) => f !== fn);
        },
      },
    };
  }

  it('1. initial focus rule: focuses dialog container (tabIndex=-1), never an input/textarea/select', () => {
    let containerFocused = false;
    let inputFocused = false;
    let buttonFocused = false;

    const mockInput = {
      tagName: 'INPUT',
      getAttribute: () => null,
      focus: () => {
        inputFocused = true;
      },
    };

    const mockButton = {
      tagName: 'BUTTON',
      getAttribute: () => null,
      focus: () => {
        buttonFocused = true;
      },
    };

    const mockDialog = {
      tagName: 'DIV',
      getAttribute: (attr: string) => (attr === 'tabindex' ? '-1' : null),
      focus: () => {
        containerFocused = true;
      },
      querySelectorAll: (_sel: string) => {
        return [mockInput, mockButton];
      },
    };

    const mockDoc = {
      activeElement: null as unknown,
      querySelectorAll: (sel: string) => (sel.includes('role="dialog"') ? [mockDialog] : []),
    };

    Object.defineProperty(globalThis, 'document', {
      value: mockDoc,
      configurable: true,
      writable: true,
    });

    const { target } = createMockTarget();
    const cleanup = registerModalEscapeListener(true, () => {}, target);

    expect(containerFocused, 'Container with tabIndex=-1 must be focused').toBe(true);
    expect(inputFocused, 'Input must NEVER be automatically focused').toBe(false);
    expect(buttonFocused, 'Button was not needed because container had tabIndex=-1').toBe(false);

    cleanup();
  });

  it('2. initial focus fallback: focuses first button/link if container has no tabIndex, never input', () => {
    let inputFocused = false;
    let buttonFocused = false;

    const mockInput = {
      tagName: 'INPUT',
      getAttribute: () => null,
      focus: () => {
        inputFocused = true;
      },
    };

    const mockButton = {
      tagName: 'BUTTON',
      getAttribute: () => null,
      focus: () => {
        buttonFocused = true;
      },
    };

    const mockDialog = {
      tagName: 'DIV',
      getAttribute: () => null,
      // No focus method or no tabIndex on dialog container
      querySelectorAll: (_sel: string) => [mockInput, mockButton],
    };

    const mockDoc = {
      activeElement: null as unknown,
      querySelectorAll: (sel: string) => (sel.includes('role="dialog"') ? [mockDialog] : []),
    };

    Object.defineProperty(globalThis, 'document', {
      value: mockDoc,
      configurable: true,
      writable: true,
    });

    const { target } = createMockTarget();
    const cleanup = registerModalEscapeListener(true, () => {}, target);

    expect(inputFocused, 'Input must NEVER be automatically focused').toBe(false);
    expect(buttonFocused, 'First button must be focused as safe fallback').toBe(true);

    cleanup();
  });

  it('3. if document.activeElement is already inside the dialog, do not move focus', () => {
    let containerFocused = false;
    const buttonFocused = false;

    const mockInput = {
      tagName: 'INPUT',
      getAttribute: () => null,
      focus: vi.fn(),
    };

    const mockDialog = {
      tagName: 'DIV',
      getAttribute: (attr: string) => (attr === 'tabindex' ? '-1' : null),
      focus: () => {
        containerFocused = true;
      },
      contains: (el: unknown) => el === mockInput,
      querySelectorAll: () => [mockInput],
    };

    const mockDoc = {
      activeElement: mockInput as unknown,
      querySelectorAll: (sel: string) => (sel.includes('role="dialog"') ? [mockDialog] : []),
    };

    Object.defineProperty(globalThis, 'document', {
      value: mockDoc,
      configurable: true,
      writable: true,
    });

    const { target } = createMockTarget();
    const cleanup = registerModalEscapeListener(true, () => {}, target);

    expect(containerFocused, 'Must not move focus if activeElement is already inside').toBe(false);
    expect(buttonFocused, 'Must not move focus').toBe(false);

    cleanup();
  });

  it('4. closes only the latest dialog when two dialogs are open on Escape', () => {
    let dialog1Closed = false;
    let dialog2Closed = false;

    const mockDialog1 = {
      getAttribute: () => '-1',
      focus: vi.fn(),
      querySelectorAll: () => [],
    };
    const mockDialog2 = {
      getAttribute: () => '-1',
      focus: vi.fn(),
      querySelectorAll: () => [],
    };

    const dialogsList = [mockDialog1];
    const mockDoc = {
      activeElement: null as unknown,
      querySelectorAll: (sel: string) => (sel.includes('role="dialog"') ? dialogsList : []),
    };

    Object.defineProperty(globalThis, 'document', {
      value: mockDoc,
      configurable: true,
      writable: true,
    });

    const { target, listeners } = createMockTarget();

    // Dialog 1 opens
    const cleanup1 = registerModalEscapeListener(true, () => {
      dialog1Closed = true;
    }, target);

    // Dialog 2 opens on top
    dialogsList.push(mockDialog2);
    const cleanup2 = registerModalEscapeListener(true, () => {
      dialog2Closed = true;
    }, target);

    // Dispatch Escape event on mock target
    // In our event listener, only the latest open dialog's callback should execute!
    const keyEvent = { key: 'Escape', preventDefault: vi.fn() };
    for (const fn of [...(listeners.keydown || [])]) {
      fn(keyEvent);
    }

    expect(dialog2Closed, 'Latest dialog (dialog2) must close first').toBe(true);
    expect(dialog1Closed, 'First dialog (dialog1) must remain open').toBe(false);

    // Dialog 2 closes
    cleanup2();
    dialogsList.pop();

    // Next Escape closes dialog 1
    for (const fn of [...(listeners.keydown || [])]) {
      fn(keyEvent);
    }
    expect(dialog1Closed, 'Dialog 1 closes after dialog 2 was closed').toBe(true);

    cleanup1();
  });

  it('5. restore focus to the element that opened the dialog only when the dialog closes or unmounts', () => {
    let restoreCalls = 0;
    const triggerEl = {
      focus: () => {
        restoreCalls++;
      },
    };

    const mockDialog = {
      getAttribute: () => '-1',
      focus: vi.fn(),
      querySelectorAll: () => [],
    };

    const mockDoc = {
      activeElement: triggerEl as unknown,
      querySelectorAll: (sel: string) => (sel.includes('role="dialog"') ? [mockDialog] : []),
    };

    Object.defineProperty(globalThis, 'document', {
      value: mockDoc,
      configurable: true,
      writable: true,
    });

    const { target } = createMockTarget();
    const cleanup = registerModalEscapeListener(true, () => {}, target);

    // While dialog is open, restore focus must NOT be called
    expect(restoreCalls).toBe(0);

    // When dialog closes / unmounts
    cleanup();
    expect(restoreCalls).toBe(1);
  });
});
