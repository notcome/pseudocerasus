export function toStaticRange(host: Element,
                              sel: Selection): StaticRange | null {
  const { anchorNode, anchorOffset, focusNode, focusOffset } = sel

  if (!anchorNode || !focusNode) {
    return null
  }

  if (!host.contains(anchorNode) || !host.contains(focusNode)) {
    return null
  }

  return {
    startContainer: anchorNode,
    startOffset: anchorOffset,
    endContainer: focusNode,
    endOffset: focusOffset,
    collapsed: anchorNode === focusNode && anchorOffset === focusOffset
  }
}

export function setDOMRange(staticRange: StaticRange) {
  const selection = document.getSelection()
  if (!selection) {
    return
  }

  if (selection.anchorNode === staticRange.startContainer &&
    selection.anchorOffset === staticRange.startOffset &&
    selection.focusNode === staticRange.endContainer &&
    selection.focusOffset === staticRange.endOffset) {
    return
  }
  if (selection.focusNode === staticRange.startContainer &&
    selection.focusOffset === staticRange.startOffset &&
    selection.anchorNode === staticRange.endContainer &&
    selection.anchorOffset === staticRange.endOffset) {
    return
  }

  selection.removeAllRanges()
  const range = new Range()
  range.setStart(staticRange.startContainer, staticRange.startOffset)
  range.setEnd(staticRange.endContainer, staticRange.endOffset)

  selection.addRange(range)
}
