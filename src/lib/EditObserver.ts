import InlineRange from './InlineRange'

export default class EditObserver {
  private readonly observer: MutationObserver
  private pendingRecords: Array<MutationRecord> = []
  private savedRange: InlineRange | null = null
  observing: boolean = false

  constructor() {
    this.observer = new MutationObserver(records => {
      this.pendingRecords = this.pendingRecords.concat(records)
    })
  }

  attach(el: Element) {
    this.observer.observe(el, {
      subtree: true,
      childList: true,
      characterData: true,
      characterDataOldValue: true
    })

    const selection = document.getSelection()
    if (!selection) {
      throw new Error('Method getSelection() returns null.')
    }
    this.savedRange = InlineRange.fromSelection(el, selection)
    this.observing = true
  }

  detach() {
    this.observer.disconnect()
    this.pendingRecords = []
    this.observing = false
  }

  restore() {
    const records = this.pendingRecords.concat(this.observer.takeRecords())
    records.reverse()

    this.detach()

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

    const range = this.savedRange as InlineRange
    this.savedRange = null
    range.selectRange()
    return range
  }
}
