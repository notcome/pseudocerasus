import React, { Component } from 'react'

import InlineRange from './InlineRange'

type Props = {
  range: () => InlineRange | null,
  isRelevant?: (sel: Selection) => boolean,
  onPartialOverlap?: (sel: Selection) => void,
  onSelectionChange: (sel: Selection | null) => void
}

enum Status {
  Outside = 1,
  Overlapping,
  Inside
}

function equalRange(lhs: InlineRange, rhs: InlineRange) {
  return lhs.host === rhs.host
    && lhs.start.node === rhs.start.node
    && lhs.start.offset === rhs.start.offset
    && lhs.end.node === rhs.end.node
    && lhs.end.offset === rhs.end.offset
}

export default class SelectionHost extends Component<Props> {
  private hostRef = React.createRef<HTMLDivElement>()
  private composing = false

  get host() {
    const host = this.hostRef.current
    if (!host) {
      throw new Error('Element ref is not initialized.')
    }
    return host
  }

  render() {
    return React.createElement('div', {
      ref: this.hostRef,
    }, this.props.children)
  }

  componentDidMount() {
    const range = this.props.range()

    if (!range) {
      this.deselectHost()
    } else {
      range.selectRange()
    }

    document.addEventListener('selectionchange', _ => {
      if (this.composing) {
        return
      }

      const sel = window.getSelection()
      if (!sel) {
        throw new Error('Cannot get selection.')
      }
      this.handleSelectionChange(sel)
    })

    document.addEventListener('compositionstart', _ => {
      this.composing = true
    })
    document.addEventListener('compositionend', _ => {
      this.composing = false
    })
  }

  componentDidUpdate() {
    const range = this.props.range()

    if (!range) {
      this.deselectHost()
    } else {
      range.selectRange()
    }
  }

  rangeStatus = (sel: Selection) => {
    const { anchorNode, focusNode } = sel

    const { host, props } = this
    const { isRelevant, onPartialOverlap, onSelectionChange } = props

    if (!anchorNode || !focusNode) {
      return Status.Outside
    }

    const containsAnchor = host.contains(anchorNode)
    const containsFocus = host.contains(focusNode)

    if (!containsAnchor && !containsFocus) {
      return Status.Outside
    }

    if (containsAnchor !== containsFocus) {
      if (this.props.onPartialOverlap) {
        return Status.Overlapping
      } else {
        return Status.Outside
      }
    }

    if (isRelevant && !isRelevant(sel)) {
      return Status.Outside
    }

    return Status.Inside
  }

  handleSelectionChange = (sel: Selection) => {
    switch (this.rangeStatus(sel)) {
      case Status.Outside:
        this.props.onSelectionChange(null)
        return

      case Status.Overlapping:
        this.props.onPartialOverlap && this.props.onPartialOverlap(sel)
        return

      default:
        this.props.onSelectionChange(sel)
    }
  }

  deselectHost() {
    const sel = window.getSelection()
    if (!sel) {
      throw new Error('Cannot get selection.')
    }

    const status = this.rangeStatus(sel)
    if (status !== Status.Inside) {
      return
    }

    sel.removeAllRanges()
  }
}
