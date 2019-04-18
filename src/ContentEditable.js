import React, { Component } from 'react';

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

function detectBrowser() {
  const ua = navigator.userAgent.toLowerCase()
  if (ua.indexOf('safari') === -1) {
    return 'other'
  }
  if (ua.indexOf('chrome') > -1) {
    return 'chrome'
  }
  return 'safari'
}

class ContentEditable extends Component {
  constructor(props) {
    super(props)

    // There is no way to feature detect support of Input Events Level 1+.
    // 1. Firefox has a 'inputType' in a constructed InputEvent.
    // 2. Chrome does not provide 'onbeforeinput' in editable elements.
    this.browserSupported = detectBrowser() !== 'other'

    this.hostRef = React.createRef()
    this.observer = new MutationObserver(records => {
      this.pendingRecords = this.pendingRecords.concat(records)
    })
    this.observeing = false
  }

  componentDidMount() {
    const host = this.hostRef.current
    if (!host) {
      return
    }

    host.addEventListener('keypress', this.onKeyPress)
    host.addEventListener('compositionstart', this.onCompositionStart)
    host.addEventListener('compositionend', this.onCompositionEnd)
    host.addEventListener('beforeinput', this.onBeforeInput)
    host.addEventListener('input', this.onInput)
  }

  get currentCaret() {
    const host = this.hostRef.current
    if (document.activeElement !== host) {
      return null
    }

    const selection = document.getSelection()
    console.assert(selection.isCollapsed)

    const node = selection.anchorNode;
    const path = computeNodePath(host, node)
    const offset = selection.anchorOffset
    return { node, path, offset }
  }

  set currentCaret(caret) {
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
    if (this.fixingCaret) {
      this.currentCaret = this.fixingCaret
      this.fixingCaret = null
    }
  }

  prepareFixingCaret = (caret) => { this.fixingCaret = caret }

  call = (name, args) => {
    if (this.props.hasOwnProperty(name)) {
      this.props[name].apply(null, args)
    }
  }

  onKeyPress = (event) => {
    if (event.key === 'Enter') {
      return
    }

    event.preventDefault()

    const caret = this.currentCaret
    this.call('onInsertText', [caret, event.key, this.prepareFixingCaret])
  }

  attachMutationObserver() {
    const host = this.hostRef.current
    this.pendingRecords = []
    this.observer.observe(host, {
      subtree: true,
      childList: true,
      characterData: true,
      characterDataOldValue: true
    })
    this.observeing = true
  }

  detachMutationObserver() {
    this.observer.disconnect()
    this.observeing = false
  }

  restoreDOM() {
    const records = this.pendingRecords.concat(this.observer.takeRecords())
    records.reverse()

    this.pendingRecords = null
    this.detachMutationObserver()

    for (const record of records) {
      if (record.type === 'characterData') {
        record.target.nodeValue = record.oldValue
      }

      if (record.type === 'childList') {
        const addedNodes = Array.from(record.addedNodes)
        for (const node of addedNodes) {
          record.target.removeChild(node)
        }
        const removedNodes = Array.from(record.removedNodes)
        for (const node of removedNodes) {
          record.target.insertBefore(node, record.nextSibling)
        }
      }
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
      case 'deleteContent':
      case 'deleteContentBackward':
      case 'deleteContentForward': {
        const range = event.getTargetRanges()[0]
        const start = {
          node: range.startContainer,
          path: computeNodePath(this.hostRef.current, range.startContainer),
          offset: range.startOffset
        }
        const end = {
          node: range.endContainer,
          path: computeNodePath(this.hostRef.current, range.endContainer),
          offset: range.endOffset
        }

        if (event.cancelable) {
          this.call('onDeleteContent', [start, end, this.prepareFixingCaret])
        } else {
          this.attachMutationObserver()
          this.pendingCallback = {
            name: 'onDeleteContent',
            args: [start, end, this.prepareFixingCaret]
          }
        }
        return
      }

      case 'insertFromComposition': {
        this.detachMutationObserver()

        const caret = this.savedCaret
        this.call('onInsertText', [caret, event.data, this.prepareFixingCaret])
        this.savedCaret = null
        return
      }

      default: {
        return
      }
    }
  }

  onInput = (event) => {
    switch (event.inputType) {
      case 'deleteContent':
      case 'deleteContentBackward':
      case 'deleteContentForward': {
        this.restoreDOM()
        this.callPendingCallback()
        return
      }

      default: {
        return
      }
    }
  }

  onCompositionStart = (event) => {
    this.savedCaret = this.currentCaret
    this.attachMutationObserver()
  }

  onCompositionEnd = (event) => {
    if (!this.observeing) {
      return
    }

    this.restoreDOM()
    const caret = this.savedCaret
    this.call('onInsertText', [caret, event.data, this.prepareFixingCaret])
    this.savedCaret = null
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
