/** True when the reader has reached the end of a scroll container. */
export function isScrolledToEnd(
  el: Pick<HTMLElement, "scrollHeight" | "scrollTop" | "clientHeight">,
  thresholdPx = 48,
): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= thresholdPx;
}

type RectBox = { top: number; bottom: number };

/**
 * True when the last page is in view far enough that the reader has finished
 * the document. Uses scroll position first, then last-page geometry so a tall
 * final page still counts once its bottom is near the fold.
 */
export function hasReachedLastPage(
  root: Pick<HTMLElement, "scrollHeight" | "scrollTop" | "clientHeight"> & {
    getBoundingClientRect: () => RectBox;
  },
  last: { getBoundingClientRect: () => RectBox },
  thresholdPx = 80,
): boolean {
  if (isScrolledToEnd(root, thresholdPx)) {
    return true;
  }
  const rootRect = root.getBoundingClientRect();
  const lastRect = last.getBoundingClientRect();
  return lastRect.bottom <= rootRect.bottom + thresholdPx;
}
