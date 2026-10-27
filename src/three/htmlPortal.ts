/**
 * One fixed element that every drei <Html> renders into. Without it, Html re-parents once R3F's
 * event target connects, and the root it unmounts mid-render leaves dead labels behind.
 */
export const htmlPortal: { current: HTMLElement } = { current: null as unknown as HTMLElement };

export function setHtmlPortal(el: HTMLDivElement | null) {
  if (el) htmlPortal.current = el;
}
