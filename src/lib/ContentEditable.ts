import React, { Component } from 'react'

import { detectBrowser } from './utils'
import InlineRange from './InlineRange'
import EditObserver from './EditObserver'

interface InputEventData {
  readonly inputType: string
  readonly data?: string
  getTargetRanges: () => Array<StaticRange>
}

type InputEvent = Event & InputEventData

type FixingRangeCallback = (thunk: () => InlineRange) => void

type Props = {
  tag: string,

  onInsertText: (range: InlineRange, data: string
    , callback: FixingRangeCallback) => void
  onDeleteContent: (range: InlineRange
    , callback: FixingRangeCallback) => void
}

export default class ContentEditable extends Component<Props> {
  // There is no way to feature detect support of Input Events Level 1+.
  // 1. Firefox has a 'inputType' in a constructed InputEvent.
  // 2. Chrome does not provide 'onbeforeinput' in editable elements.
  private readonly browserSupported = detectBrowser() !== 'other'
  private readonly observer = new EditObserver()
  private hostRef = React.createRef<HTMLElement>()

  private pendingCallbacks = [] as Array<() => void>

  private getFixingRange = null as (() => InlineRange) | null
  private savedRange = null as InlineRange | null

  get host() {
    const host = this.hostRef.current
    if (!host) {
      throw new Error('Element ref is not initialized.')
    }
    return host
  }

  setGetFixingRange = (thunk: () => InlineRange) => {
    this.getFixingRange = thunk
  }

  componentDidMount() {
    const host = this.host
    host.addEventListener('compositionstart',
      this.onCompositionStart as EventListener)
    host.addEventListener('compositionend',
      this.onCompositionEnd as EventListener)
    host.addEventListener('beforeinput',
      this.onBeforeInput as EventListener)
    host.addEventListener('input',
      this.onInput as EventListener)
  }

  componentDidUpdate() {
    if (this.getFixingRange) {
      const range = this.getFixingRange()
      range.selectRange()
      this.getFixingRange = null
    }
  }

  onInsertionOrDeletion = (event: InputEvent) => {
    const staticRange = event.getTargetRanges()[0]
    const inlineRange = InlineRange.fromStaticRange(this.host, staticRange)

    const action = event.inputType === 'insertText' ?
      () => this.props.onInsertText(inlineRange,
          event.data as string, this.setGetFixingRange):
      () => this.props.onDeleteContent(inlineRange,
          this.setGetFixingRange)

    if (event.cancelable) {
      action()
    } else {
      this.observer.attach(this.host)
      this.pendingCallbacks.push(action)
    }
  }

  onBeforeInput = (event: InputEvent) => {
    event.preventDefault()

    switch (event.inputType) {
      case 'insertText':
      case 'deleteContent':
      case 'deleteContentBackward':
      case 'deleteContentForward':
        this.onInsertionOrDeletion(event)
        return

      case 'insertFromComposition':
        this.onInsertFromComposition(event)
        return

      case 'insertCompositionText':
        return

      default:
        if (!event.cancelable && !this.observer.observing) {
          this.observer.attach(this.host)
        }
        return
    }
  }

  onInput = (event: InputEvent) => {
    if (!this.observer.observing) {
      return
    }

    switch (event.inputType) {
      case 'insertText':
      case 'insertParagraph':
      case 'deleteContent':
      case 'deleteContentBackward':
      case 'deleteContentForward': {
        this.observer.restore()
        for (const callback of this.pendingCallbacks) {
          callback()
        }
        this.pendingCallbacks = []
        return
      }

      default: {
        return
      }
    }
  }

  onCompositionStart = (event: CompositionEvent) => {
    const host = this.host

    const selection = document.getSelection()
    if (!selection) {
      throw new Error('Method getSelection() returns null.')
    }
    this.savedRange = InlineRange.fromSelection(this.host, selection)
    this.observer.attach(host)
  }

  onInsertFromComposition = (event: InputEvent) => {
    this.observer.detach()
    const range = this.savedRange
    this.savedRange = null
    this.props.onInsertText(range as InlineRange,
      event.data as string, this.setGetFixingRange)
  }

  onCompositionEnd = (event: CompositionEvent) => {
    if (!this.observer.observing) {
      return
    }

    this.observer.restore()
    const range = this.savedRange
    this.savedRange = null
    this.props.onInsertText(range as InlineRange,
      event.data as string, this.setGetFixingRange)
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
