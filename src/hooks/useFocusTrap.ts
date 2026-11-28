import { useEffect, useRef } from 'react';

export interface KeydownEventTargetLike {
  addEventListener: (
    type: 'keydown',
    listener: (ev: { key: string; shiftKey?: boolean; preventDefault?: () => void }) => void
  ) => void;
  removeEventListener: (
    type: 'keydown',
    listener: (ev: { key: string; shiftKey?: boolean; preventDefault?: () => void }) => void
  ) => void;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getActiveModalDialog(): HTMLElement | null {
  if (typeof document === 'undefined' || !document.querySelectorAll) return null;
  const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"]');
  return dialogs.length > 0 ? dialogs[dialogs.length - 1] : null;
}

interface ModalStackEntry {
  id: number;
  onClose: () => void;
}

let nextModalId = 1;
const modalStack: ModalStackEntry[] = [];

export function registerModalEscapeListener(
  isOpen: boolean,
  onClose: () => void,
  target?: KeydownEventTargetLike
): () => void {
  if (!isOpen) return () => undefined;
  const eventTarget =
    target ||
    (typeof window !== 'undefined' ? (window as unknown as KeydownEventTargetLike) : undefined);
  if (!eventTarget) return () => undefined;

  const previousActiveElement =
    typeof document !== 'undefined'
      ? (document.activeElement as { focus?: () => void } | null)
      : null;

  const entryId = nextModalId++;
  const entry: ModalStackEntry = { id: entryId, onClose };
  modalStack.push(entry);

  // Initial focus rule:
  // If document.activeElement is already inside the dialog, do not move focus.
  const initialDialog = getActiveModalDialog();
  if (initialDialog && typeof document !== 'undefined') {
    const currentActive = document.activeElement as HTMLElement | null;
    const isAlreadyInside =
      currentActive &&
      (currentActive === initialDialog ||
        (typeof initialDialog.contains === 'function' && initialDialog.contains(currentActive)));

    if (!isAlreadyInside) {
      // 1. Focus the dialog container (with tabIndex={-1} or any tabIndex)
      const hasTabIndex =
        (typeof initialDialog.getAttribute === 'function' &&
          initialDialog.getAttribute('tabindex') !== null &&
          initialDialog.getAttribute('tabindex') !== undefined) ||
        (initialDialog as { tabIndex?: number }).tabIndex !== undefined;

      if (hasTabIndex && typeof initialDialog.focus === 'function') {
        try {
          initialDialog.focus();
        } catch {
          // Fallback if focus failed
        }
      } else if (typeof initialDialog.querySelectorAll === 'function') {
        // 2. Fallback: focus first button or link (NEVER input, textarea or select)
        const safeFocusables = Array.from(
          initialDialog.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href], [role="button"]:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => {
          const tag = el.tagName?.toUpperCase?.() || '';
          return tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT';
        });

        if (safeFocusables.length > 0 && typeof safeFocusables[0].focus === 'function') {
          try {
            safeFocusables[0].focus();
          } catch {
            // Ignore if focus error
          }
        }
      }
    }
  }

  const handleKeyDown = (ev: { key: string; shiftKey?: boolean; preventDefault?: () => void }) => {
    if (ev.key === 'Escape') {
      // Only close if this entry is on top of the modal stack
      const isTop = modalStack.length === 0 || modalStack[modalStack.length - 1].id === entryId;
      if (isTop) {
        ev.preventDefault?.();
        onClose();
      }
      return;
    }

    if (ev.key === 'Tab' && typeof document !== 'undefined') {
      const activeDialog = getActiveModalDialog();
      if (!activeDialog || typeof activeDialog.querySelectorAll !== 'function') return;
      const focusable = Array.from(activeDialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement as HTMLElement | null;

      if (ev.shiftKey) {
        if (current === first || !focusable.includes(current as HTMLElement)) {
          ev.preventDefault?.();
          last.focus();
        }
      } else {
        if (current === last || !focusable.includes(current as HTMLElement)) {
          ev.preventDefault?.();
          first.focus();
        }
      }
    }
  };

  eventTarget.addEventListener('keydown', handleKeyDown);

  return () => {
    // Remove from stack
    const idx = modalStack.findIndex((m) => m.id === entryId);
    if (idx !== -1) {
      modalStack.splice(idx, 1);
    }

    eventTarget.removeEventListener('keydown', handleKeyDown);

    // Restore focus only when dialog closes or unmounts
    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      try {
        previousActiveElement.focus();
      } catch {
        // Ignore if trigger element was unmounted
      }
    }
  };
}

export function useFocusTrap(isOpen: boolean, onClose: () => void): void {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!isOpen) return;

    return registerModalEscapeListener(isOpen, () => {
      onCloseRef.current();
    });
  }, [isOpen]);
}
