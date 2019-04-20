import React from 'react'
import './App.css'
import ContentEditable from './lib'

function insertText(full, offset, input, setCaret) {
  const first = full.slice(0, offset)
  const second = full.slice(offset)
  const text = first + input + second
  setCaret({ path: text.length > 0 ? [0] : [], offset: offset + input.length })
  return text
}

function deleteContent(full, start, end, setCaret) {
  const first = full.slice(0, start)
  const second = full.slice(end)
  const text = first + second
  setCaret({ path: text.length > 0 ? [0] : [], offset: start })
  return text
}

function App() {
  const [text, setText] = React.useState('Here is some text अनुच्छेद.')

  const onInsertText = React.useCallback(
    (caret, input, setCaret) => {
      const text_ = insertText(text, caret.offset, input, setCaret)
      setText(text_)
    }, [text])

  const onDeleteContent = React.useCallback(
    (start, end, setCaret) => {
      const text_ = deleteContent(text, start.offset, end.offset, setCaret)
      setText(text_)
    }, [text])

  return (
    <div id={'app'}>
      <ContentEditable tag={'p'}
        onInsertText={onInsertText}
        onDeleteContent={onDeleteContent}>
        {text}
      </ContentEditable>
    </div>
  ) //
}

export default App;
