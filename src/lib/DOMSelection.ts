export function toStaticRange(host: Element,
                              sel: Selection): StaticRange | null {
  const { anchorNode, anchorOffset, focusNode, focusOffset } = sel

  if (!(anchorNode && anchorOffset && focusNode && focusOffset)) {
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
  selection.removeAllRanges()
  const range = new Range()
  range.setStart(staticRange.startContainer, staticRange.startOffset)
  range.setEnd(staticRange.endContainer, staticRange.endOffset)
  selection.addRange(range)
}
