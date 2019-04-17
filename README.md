# Pseudocerasus

One issue of using `contenteditable` with React is that React’s diff algorithm
does not work with DOM mutable by a third-party (in this case, the browser).
One solution is to capturing the user’s intent, preventing the browser from
making any changes, and handling the updates using React.

The other issue is caret position. If a focused text node is replaced by React,
then the caret position could jump, which is undesirable. React itself does not
provide much help for this scenario.

Moreover, the browser’s own `Selection` interface (`getSelection()` and
`activeElement`) is designed in an imperative way unorthodox to React’s
programming pattern. The situation is bearable for old React, but Hooks
makes the use of native event handlers a complete nightmare.

Last but not the least, it is painful to handle IME (input method engine) for
Asian users. While modern web standards have decent support for listening to
IME-related events, I could imagine that it must be hard to develop and test
for these use cases unless you are fluent in CJK languages.

Pseudocerasus aims to provide a set of React components for handling input
events of `contenteditable` elements.

The name “Pseudocerasus” comes from *prunus pseudocerasus*, known also as
Chinese cherry. It tastes sour. It only works for Safari and derivatives of
Chromium (such as Microsoft Edge), since it relies on
[Input Events](https://www.w3.org/TR/input-events-2/) which is not supported
by Firefox as of April 2019.

## Background

The Input Events specification comes with a very nice event called `beforeinput`
dispatched before any change is committed to the DOM tree. After the DOM tree
is upated, the more familiar `input` event will be fired. The idea is simple:
call `preventDefault()` during the `beforeinput` phase and use React to do
the actual update.

This approach comes with one issue: not all input types are cancelable on
Chromium. In fact, W3C splits the specification into two levels, with level 2
requiring all input types cancelable. As of April 2019, only Safari implements
it.

This is not to say that Safari is easy to work with. It has very messy event
firing order for keyboard, input, and composition events. Moreover, the
`InputEvent` class in WebKit does not come with a `isComposing` property.

## Solution

Using any library which you do not understand how it works would bite you 
at some point. Hence here is a complete specification of what our library does.

### Non-IME Typing and Deletion

When typing without an IME, the browser should emit an input event of type
`insertText`. As noted above Chromium does not us to cancel such event.
However, `keypress` is fired *before* `beforeinput`, and that event is
cancelable. Hence, we intercept that event, calling the React-side handler.

For deletion, we subscribe to `keydown` and handle them accordingly.

### IME Composition

The nice thing about IME composition is that no action is required during a
composition phase. Except for the potential creation of a text node inside an
empty tag, there is no DOM node creation and deletion. As far as an editor
implementation is concerned, one only need to know the string inserted after
a composition is finished.

For Safari, this is easily achieved. It emits input events when

* a composition text is updated,
* a composition text is deleted when a composition is finished,
* and a text is inserted as a result of the composition.

All we need to do is to let the first two kind of input events pass and
intercept the last one, `insertFromComposition`.

For Chromium, we have to let the browser insert the string. We then remove
the string, either by getting its position via current selection, or keeping
a snapshot when the composition starts.

### Selection

Selection itself is annoying to work with. It is a global object. The return
value of `getSelection()` is a reference. It seems to have support for multiple
ranges concurrently, which would be a nightmare if true, yet both Safari and
Chrome only support one active range. Furthermore, selection is not the same
as a caret or a range inside your `contenteditable`. One also needs to check
`document.activeElement`.

What makes things worse is that in our case, there are many `selectionchange`
that are not pertinent to us even if it happens inside the `contenteditable`.
One example is IME composition as described above. The other is the changed
caused by fixing caret.

We have three goals. First, an selection change event should happen only if it
happens inside a `contenteditable` component. Second, it should be fired only if
it is not a result of editing. Third, fixing the caret should not cause such
event.

The first is easily done. The second goal is largely bypassed if it is 
client code rather than the browser who does the DOM update. For the case
of composition, we would stop any `selectionchange` event flowing to the client
code.

As for fixing caret, we would provide a prop to specify the caret position.
It should be an index path from the component root to the actual text node,
accompanied by a offset (in either code unit or code point length).
Alternatively, if your data structure does not have the paragraph itself
carrying a caret position, you could also set the caret through the return
value of the event handler.

