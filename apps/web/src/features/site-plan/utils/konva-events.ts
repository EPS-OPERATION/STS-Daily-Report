export function beginVertexInteraction(event: { cancelBubble: boolean }, dragMoved: { current: boolean }): void {
  event.cancelBubble = true;
  dragMoved.current = false;
}

export function shouldSelectVertexFromClick(
  event: { cancelBubble: boolean },
  dragMoved: { current: boolean },
): boolean {
  event.cancelBubble = true;
  const shouldSelect = !dragMoved.current;
  dragMoved.current = false;
  return shouldSelect;
}
