export default class EditObserver {
  readonly observer: MutationObserver
  
  pendingRecords: Array<MutationRecord>
  observing: boolean

  constructor() {
    this.pendingRecords = []
    this.observing = false

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
  }
}
