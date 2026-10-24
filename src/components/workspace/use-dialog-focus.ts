'use client';

import { useLayoutEffect, useRef } from 'react';

function focusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button, input, select, textarea, summary, [tabindex], [contenteditable]'))
    .filter(element => {
      if (element.matches(':disabled, input[type="hidden"]') || element.closest('[hidden], [inert]')) return false;
      if (element.tabIndex < 0 && !(element.hasAttribute('contenteditable') && element.getAttribute('contenteditable') !== 'false' && !element.hasAttribute('tabindex'))) return false;
      for (let ancestor: HTMLElement | null = element; ancestor && ancestor !== dialog; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        if (ancestor instanceof HTMLDetailsElement && !ancestor.open && !ancestor.querySelector('summary')?.contains(element)) return false;
      }
      return true;
    });
}

/** Focus and background isolation for a mounted modal; returns its root ref. */
export function useDialogFocus(isOpen: boolean) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const background = new Map<Element, string | null>();
    for (let branch: Element = dialog; branch.parentElement; branch = branch.parentElement) {
      for (const sibling of Array.from(branch.parentElement.children)) {
        if (sibling !== branch) {
          background.set(sibling, sibling.getAttribute('inert'));
          sibling.setAttribute('inert', '');
        }
      }
      if (branch.parentElement === document.body) break;
    }
    const overflow = document.body.style.getPropertyValue('overflow');
    const overflowPriority = document.body.style.getPropertyPriority('overflow');
    document.body.style.setProperty('overflow', 'hidden');

    const containFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog.contains(event.target)) dialog.focus({ preventScroll: true });
    };
    const trapTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      const elements = focusableElements(dialog);
      const index = elements.findIndex(element => element === document.activeElement);
      const next = event.shiftKey
        ? (index <= 0 ? elements.length - 1 : index - 1)
        : (index + 1) % elements.length;
      (elements[next] ?? dialog).focus({ preventScroll: true });
    };
    document.addEventListener('focusin', containFocus);
    document.addEventListener('keydown', trapTab, true);
    dialog.focus({ preventScroll: true });

    return () => {
      document.removeEventListener('focusin', containFocus);
      document.removeEventListener('keydown', trapTab, true);
      background.forEach((inert, element) => {
        if (inert === null) element.removeAttribute('inert');
        else element.setAttribute('inert', inert);
      });
      if (overflow) document.body.style.setProperty('overflow', overflow, overflowPriority);
      else document.body.style.removeProperty('overflow');
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [isOpen]);

  // Navigation or dismissing a hint can remove the focused descendant.
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && dialog && !dialog.contains(document.activeElement)) dialog.focus({ preventScroll: true });
  });

  return dialogRef;
}
