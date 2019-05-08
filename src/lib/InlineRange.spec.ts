import InlineRange, { pathFromChild, childFromPath } from './InlineRange'

const sampleHTML = '<p id="host"><strong>Hello!</strong> This is ' +
  '<a href="http://llvm.org"><i>pseudocerasus</i></a>, ' +
  'your next adventure in <code>contenteditable<b></b></code>.</p>'

it('converts between path and child', () => {
  document.body.innerHTML = sampleHTML
  const host = document.getElementById('host') as HTMLElement

  let queue = [host as ChildNode]
  let count = 0

  while (queue.length > 0) {
    count += 1
    const node = queue.shift() as ChildNode
    queue.push(...Array.from(node.childNodes))

    const path = pathFromChild(host, node)
    expect(path).not.toBe(null)
    const node_ = childFromPath(host, path as Array<number>)
    expect(node_).not.toBe(null)
    const path_ = pathFromChild(host, node_ as Node)

    expect(path_).toEqual(path)
    expect(node_).toEqual(node)
  }

  expect(count).toBeGreaterThanOrEqual(10)
})

function sampleForInlineRange() {
  document.body.innerHTML = '<p>ab<b>c</b></p>'

  const host = document.body.children[0]
  const [node1, node2] = Array.from(host.childNodes)

  const point1 = {
    path: [0],
    node: node1,
    offset: 0
  }
  const point2 = {
    path: [0],
    node: node1,
    offset: 1
  }
  const point3 = {
    path: [1, 0],
    node: node2.childNodes[0],
    offset: 0
  }

  return { host, node1, node2, point1, point2, point3 }
}

it('sorts two points', () => {
  const { host, node1, node2, point1, point2, point3 } = sampleForInlineRange()

  const forEveryTwo = (x, y) => {
    const range = new InlineRange(host, x, y)
    expect(range).toEqual(new InlineRange(host, y, x))
    expect(range.start).toEqual(x)
  }

  forEveryTwo(point1, point2)
  forEveryTwo(point2, point3)
  forEveryTwo(point1, point3)
})

it('tests wrappers', () => {
  const { host, node1, node2, point1, point2, point3 } = sampleForInlineRange()

  const forEveryTwo = (x, y) => {
    const expected = new InlineRange(host, x, y)
    const actual1 = InlineRange.fromNodes(host,
      x.node, x.offset, y.node, y.offset)
    const actual2 = InlineRange.fromStaticRange(host, {
      startContainer: x.node, startOffset: x.offset,
      endContainer: y.node, endOffset: y.offset,
      collapsed: x.node === y.node && x.offset === y.offset
    })
    const actual3 = InlineRange.fromPaths(host,
      pathFromChild(host, x.node), x.offset,
      pathFromChild(host, y.node), y.offset)
    expect(actual1).toEqual(expected)
    expect(actual2).toEqual(expected)
    expect(actual3).toEqual(expected)
  }

  forEveryTwo(point1, point2)
  forEveryTwo(point2, point3)
  forEveryTwo(point1, point3)
})
