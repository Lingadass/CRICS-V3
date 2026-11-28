import { useFocusTrap } from './useFocusTrap';

export function useModalEscape(isOpen: boolean, onClose: () => void): void {
  useFocusTrap(isOpen, onClose);
}
