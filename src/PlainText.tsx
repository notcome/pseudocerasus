import React from 'react'

import ContentEditable, { InlineRange, SelectionHost } from './lib'

type EditResult = {
  text: string
  offset: number
}

function withTextInserted(full: string,
                          start: number,
                          end: number,
                          input: string): EditResult {
  const first = full.slice(0, start)
  const second = full.slice(end)
  const text = first + input + second
  const offset = start + input.length
  return { text, offset }
}

function withTextDeleted(full: string,
                         start: number,
                         end: number): EditResult {
  const first = full.slice(0, start)
  const second = full.slice(end)
  const text = first + second
  const offset = start
  return { text, offset }
}

function onInsertParagraph() {
  alert('Attempt to insert a paragraph, which is not supported.')
}

type Range = [number, number]

function inlineRangeFrom(ref: React.RefObject<ContentEditable>,
                         text: string,
                         range: Range | null) {
  if (!range) {
    return null
  }
  const [start, end] = range

  if (!ref.current) {
    return null
  }
  const { current: { host } } = ref

  if (text.length > 0) {
    return InlineRange.fromPaths(host, [0], start, [0], end)
  } else {
    return InlineRange.fromPaths(host, [], 0, [], 0)
  }
}

type Props = {
  initialValue: string
}

export default function PlainText(props: Props) {
  const [text, setText] = React.useState(props.initialValue)
  const [range, setRange] = React.useState<Range | null>(null)
  const elRef = React.useRef<ContentEditable>(null)

  const rangeThunk = React.useCallback(() => {
    return inlineRangeFrom(elRef, text, range)
  }, [text, range])

  const onSelectionChange = React.useCallback(
    (sel: Selection | null) => {
      if (!sel) {
        setRange(null)
        return
      }
      const start = Math.min(sel.anchorOffset, sel.focusOffset)
      const end = Math.max(sel.anchorOffset, sel.focusOffset)

      if (range && start === range[0] && end === range[1]) {
        return
      }
      setRange([start, end])
    }, [range])

  const onInsertText = React.useCallback(
    (range: InlineRange, input: string) => {
      const { text: text_, offset } = withTextInserted(text,
        range.start.offset, range.end.offset, input)
      setText(text_)
      setRange([offset, offset])
    }, [text])

  const onDeleteContent = React.useCallback(
    (range: InlineRange) => {
      const { text: text_, offset } = withTextDeleted(text,
        range.start.offset, range.end.offset)
      setText(text_)
      setRange([offset, offset])
    }, [text])

  const caretText = range ?
    (range[0] === range[1] ? `${range[0]}` : `${range[0]}:${range[1]}`)
    : 'null'

  return (
    <SelectionHost
      range={rangeThunk}
      onSelectionChange={onSelectionChange}>
      <p>{`Current selection: ${caretText}`}</p>
      <ContentEditable tag={'p'}
        ref={elRef}
        onInsertText={onInsertText}
        onDeleteContent={onDeleteContent}
        onInsertParagraph={onInsertParagraph}>
        {text}
      </ContentEditable>
    </SelectionHost>
  )
}
