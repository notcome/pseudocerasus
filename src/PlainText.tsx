import React from 'react'

import ContentEditable, { InlineRange } from './lib'

type EditResult = {
  text: string
  offset?: number
}

function withTextInserted(full: string,
                          start: number,
                          end: number,
                          input: string): EditResult {
  const first = full.slice(0, start)
  const second = full.slice(end)
  const text = first + input + second
  const offset = start + input.length
  if (text.length > 0) {
    return { text, offset }
  } else {
    return { text }
  }
}

function withTextDeleted(full: string,
                         start: number,
                         end: number): EditResult {
  const first = full.slice(0, start)
  const second = full.slice(end)
  const text = first + second
  const offset = start
  if (text.length > 0) {
    return { text, offset }
  } else {
    return { text }
  }
}

type Props = {
  initialValue: string
}

function makeGetFixingRange(host: any, offset: number | undefined) {
  return () => {
    if (offset) {
      return InlineRange.fromPaths(host, [0], offset, [0], offset)
    } else {
      return InlineRange.fromPaths(host, [], 0, [], 0)
    }
  }
}

const noOp = () => { return }

export default function PlainText(props: Props) {
  const [text, setText] = React.useState(props.initialValue)

  const onInsertText = React.useCallback(
    (range: InlineRange, input: string, setRange) => {
      const { text: text_, offset } = withTextInserted(text,
        range.start.offset, range.end.offset, input)
      setRange(makeGetFixingRange(range.host, offset))
      setText(text_)
    }, [text])

  const onDeleteContent = React.useCallback(
    (range: InlineRange, setRange) => {
      const { text: text_, offset } = withTextDeleted(text,
        range.start.offset, range.end.offset)
      setRange(makeGetFixingRange(range.host, offset))
      setText(text_)
    }, [text])

  return (
    <div id={'app'}>
      <ContentEditable tag={'p'}
        onInsertText={onInsertText}
        onDeleteContent={onDeleteContent}
        onInsertParagraph={noOp}>
        {text}
      </ContentEditable>
    </div>
  )
}
