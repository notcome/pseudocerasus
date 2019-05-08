import React, { Component } from 'react'

import { detectBrowser } from './utils'
import EditObserver from './EditObserver'

function computeNodePath(root, child) {
  let path = []
  let parent = child.parentNode

  while (parent) {
    const index = Array.from(parent.childNodes).indexOf(child)
    path.push(index)

    if (parent === root) {
      return path.reverse()
    }

    child = parent
    parent = child.parentNode
  }
  return null
}

function getNodeFromPath(root, path) {
  let node = root
  for (const index of path) {
    node = root.childNodes[index]
  }
  return node
}

function readStaticRange(host, range) {
  const start = {
    node: range.startContainer,
    path: computeNodePath(host, range.startContainer),
    offset: range.startOffset
  }
  const end = {
    node: range.endContainer,
    path: computeNodePath(host, range.endContainer),
    offset: range.endOffset
  }

  return [start, end]
}

function readSelection(host, sel) {
  const start = {
    node: sel.anchorNode,
    path: computeNodePath(host, sel.anchorNode),
    offset: sel.anchorOffset
  }
  const end = {
    node: sel.focusNode,
    path: computeNodePath(host, sel.focusNode),
    offset: sel.focusOffset
  }

  // For Safari at least, anchor and focus are not sorted.
  return sortPoints(start, end)
}

function sortPoints(lhs, rhs) {
  let i = 0;
  while (i < lhs.path.length && i < rhs.path.length) {
    if (lhs.path[i] < rhs.path[i]) {
      return [lhs, rhs]
    } else if (lhs.path[i] > rhs.path[i]) {
      return [rhs, lhs]
    }

    i++
  }

  console.assert(lhs.path.length === rhs.path.length)

  if (lhs.offset <= rhs.offset) {
    return [lhs, rhs]
  }
  return [rhs, lhs]
}

class ContentEditable extends Component {
  constructor(props) {
    super(props)

    // There is no way to feature detect support of Input Events Level 1+.
    // 1. Firefox has a 'inputType' in a constructed InputEvent.
    // 2. Chrome does not provide 'onbeforeinput' in editable elements.
    this.browserSupported = detectBrowser() !== 'other'

    this.hostRef = React.createRef()
    this.observer = new EditObserver()
  }

  componentDidMount() {
    const host = this.hostRef.current
    if (!host) {
      return
    }

    host.addEventListener('compositionstart', this.onCompositionStart)
    host.addEventListener('compositionend', this.onCompositionEnd)
    host.addEventListener('beforeinput', this.onBeforeInput)
    host.addEventListener('input', this.onInput)
  }

  get currentSelection() {
    const host = this.hostRef.current
    if (document.activeElement !== host) {
      return null
    }

    const selection = document.getSelection()
    return readSelection(host, selection)
  }

  fixCaret() {
    const caret = this.fixingCaret

    if (!caret) {
      return
    } else {
      this.fixingCaret = null
    }

    const node = caret.node || getNodeFromPath(this.hostRef.current, caret.path)
    const { offset } = caret

    const selection = document.getSelection()
    selection.removeAllRanges()
    const range = new Range()
    range.setStart(node, offset)
    range.setEnd(node, offset)
    selection.addRange(range)
  }

  componentDidUpdate() {
    this.fixCaret()
  }

  prepareFixingCaret = (caret) => { this.fixingCaret = caret }

  call = (name, args) => {
    if (this.props.hasOwnProperty(name)) {
      this.props[name].apply(null, args)
    }
  }

  callPendingCallback() {
    if (!this.pendingCallback) {
      return
    }
    this.call(this.pendingCallback.name, this.pendingCallback.args)
    this.pendingCallback = null
  }

  onBeforeInput = (event) => {
    event.preventDefault()

    switch (event.inputType) {
      case 'insertText': {
        const [start, end] = readStaticRange(this.hostRef.current,
                                             event.getTargetRanges()[0])

        if (event.cancelable) {
          this.call('onInsertText',
            [start, end, event.data, this.prepareFixingCaret])
        } else {
          this.observer.attach(this.hostRef.current)
          this.pendingCallback = {
            name: 'onInsertText',
            args: [start, end, event.data, this.prepareFixingCaret]
          }
        }
        return
      }

      case 'deleteContent':
      case 'deleteContentBackward':
      case 'deleteContentForward': {
        const [start, end] = readStaticRange(this.hostRef.current,
                                             event.getTargetRanges()[0])
        if (event.cancelable) {
          this.call('onDeleteContent', [start, end, this.prepareFixingCaret])
        } else {
          this.observer.attach(this.hostRef.current)
          this.pendingCallback = {
            name: 'onDeleteContent',
            args: [start, end, this.prepareFixingCaret]
          }
        }
        return
      }

      case 'insertFromComposition': {
        this.observer.detach()
        console.log(event)

        const [start, end] = this.savedSelection
        this.call('onInsertText',
          [start, end, event.data, this.prepareFixingCaret])
        this.savedSelection = null
        return
      }

      default: {
        return
      }
    }
  }

  onInput = (event) => {
    switch (event.inputType) {
      case 'insertText':
      case 'deleteContent':
      case 'deleteContentBackward':
      case 'deleteContentForward': {
        this.observer.restore()
        this.callPendingCallback()
        return
      }

      default: {
        return
      }
    }
  }

  onCompositionStart = (event) => {
    this.savedSelection = this.currentSelection
    this.observer.attach(this.hostRef.current)
  }

  onCompositionEnd = (event) => {
    if (!this.observing) {
      return
    }

    this.observer.restore()
    const [start, end] = this.savedSelection
    this.call('onInsertText', [start, end, event.data, this.prepareFixingCaret])
    this.savedSelection = null
  }

  render() {
    if (!this.browserSupported) {
      return React.createElement('p', null,
        'Support for Input Event level 1 or higher is required.')
    }

    const { tag, children } = this.props
    return React.createElement(tag || 'p', {
      contentEditable: true,
      suppressContentEditableWarning: true,
      ref: this.hostRef
    }, children)
  }
}

export default ContentEditable
