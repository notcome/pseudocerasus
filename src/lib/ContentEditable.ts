import React, { Component } from 'react'

import { detectBrowser } from './utils'
import InlineRange from './InlineRange'
import EditObserver from './EditObserver'

interface InputEventData {
  readonly inputType: string
  readonly data?: string
  readonly isComposing?: boolean
  getTargetRanges: () => Array<StaticRange>
}

type InputEvent = Event & InputEventData

type Props = {
  tag: string,
  props: { [key: string]: string },

  onInsertText: (range: InlineRange, data: string) => void
  onDeleteContent: (range: InlineRange) => void
  onInsertParagraph?: (range: InlineRange) => void
}

function isComposing(event: InputEvent): boolean {
  if (event.isComposing !== undefined) {
    return event.isComposing
  }

  const inputType = new String(event.inputType).toLowerCase()
  return inputType.search('composition') !== -1
}

export default class ContentEditable extends Component<Props> {
  // There is no way to feature detect support of Input Events Level 1+.
  // 1. Firefox has a 'inputType' in a constructed InputEvent.
  // 2. Chrome does not provide 'onbeforeinput' in editable elements.
  private readonly browserSupported = detectBrowser() !== 'other'
  private readonly observer = new EditObserver()
  private hostRef = React.createRef<HTMLElement>()

  private pendingCallbacks = [] as Array<() => void>

  get host() {
    const host = this.hostRef.current
    if (!host) {
      throw new Error('Element ref is not initialized.')
    }
    return host
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

  onInsertionOrDeletion = (event: InputEvent, range: InlineRange) => {
    const action = event.inputType === 'insertText' ?
      () => this.props.onInsertText(range, event.data as string) :
      () => this.props.onDeleteContent(range)

    if (event.cancelable) {
      action()
    } else {
      this.observer.attach(this.host)
      this.pendingCallbacks.push(action)
    }
  }

  onBeforeInput = (event: InputEvent) => {
    if (isComposing(event)) {
      return
    }
    event.preventDefault()

    const staticRange = event.getTargetRanges()[0]
    const range = InlineRange.fromStaticRange(this.host, staticRange)

    switch (event.inputType) {
      case 'insertText':
      case 'deleteContent':
      case 'deleteContentBackward':
      case 'deleteContentForward':
        this.onInsertionOrDeletion(event, range)
        return

      default:
        break
    }

    const action = () => {
      switch (event.inputType) {
        case 'insertParagraph':
          if (this.props.onInsertParagraph) {
            return this.props.onInsertParagraph(range)
          }

        default:
          return
      }
    }
    if (event.cancelable) {
      action()
    } else {
      this.observer.attach(this.host)
      this.pendingCallbacks.push(action)
    }
  }

  onInput = (event: InputEvent) => {
    if (!this.observer.observing) {
      return
    }

    if (isComposing(event)) {
      return
    }

    this.observer.restore()
    for (const callback of this.pendingCallbacks) {
      callback()
    }
    this.pendingCallbacks = []
  }

  onCompositionStart = (event: CompositionEvent) => {
    this.observer.attach(this.host)
  }

  onCompositionEnd = (event: CompositionEvent) => {
    const range = this.observer.restore()
    this.props.onInsertText(range as InlineRange, event.data as string)
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
      ref: this.hostRef,
      ...this.props.props
    }, children)
  }
}
