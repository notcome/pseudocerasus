import React from 'react'
import './App.css'

import PlainText from './PlainText'

export default function App() {
  return (
    <div id={'app'}>
      <h1>Plain Text Example</h1>
      <p>This paragraph should allow nothing but plain text. The creation of a new paragraph is also forbidden.</p>
      <p>You should be able to type using an IME.</p>
      <PlainText initialValue = {'Here is some text अनुच्छेद.'} />
    </div>
  )
}
