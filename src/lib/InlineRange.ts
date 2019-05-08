import { toStaticRange, setDOMRange } from './DOMSelection'

export function pathFromChild(root: Element, child: Node): Array<number> {
  let path = [] as Array<number>
  let node = child

  for (let parent = node.parentNode;
    parent && root.contains(parent);
    parent = node.parentNode) {
    const index = Array.from(parent.childNodes).indexOf(node as ChildNode)
    console.assert(index !== -1, 'Impossible!')

    path.push(index)
    node = parent
  }

  if (node !== root) {
    throw new Error('Cannot find child inside the root.')
  }
  return path.reverse()
}

export function childFromPath(root: Element, path: Array<number>): Node {
  let node = root as Node
  for (const index of path) {
    const maybeNode = node.childNodes[index]
    if (!maybeNode) {
      throw new Error('Invalid path.')
    }
    node = maybeNode
  }
  return node
}

function pathLessThan(x: Point, y: Point): boolean {
  if (x.node === y.node) {
    return x.offset < y.offset
  }

  const lhs = x.path
  const rhs = y.path
  const maxLen = Math.max(lhs.length, rhs.length)
  for (const i of Array.from(Array(maxLen).keys())) {
    if (lhs[i] < rhs[i]) {
      return true
    }
    if (lhs[i] > rhs[i]) {
      return false
    }
  }
  return false
}

export type Host = Element

export type Point = {
  path: Array<number>
  node: Node
  offset: number
}

export default class InlineRange {
  public readonly host: Host
  public readonly start: Point
  public readonly end: Point

  constructor(host: Host, start: Point, end: Point) {
    if (start.node !== childFromPath(host, start.path)) {
      throw new Error('Invalid start point.')
    }
    if (end.node !== childFromPath(host, end.path)) {
      throw new Error('Invalid end point.')
    }

    this.host = host
    if (pathLessThan(start, end)) {
      [this.start, this.end] = [start, end]
    } else {
      [this.start, this.end] = [end, start]
    }
  }

  selectRange() {
    setDOMRange({
      startContainer: this.start.node,
      startOffset: this.start.offset,
      endContainer: this.end.node,
      endOffset: this.end.offset,
      collapsed: false // unimportant
    })
  }

  static fromPaths(host: Host,
                   path1: Array<number>, offset1: number,
                   path2: Array<number>, offset2: number) {
    const start = {
      path: path1,
      offset: offset1,
      node: childFromPath(host, path1)
    }
    const end = {
      path: path2,
      offset: offset2,
      node: childFromPath(host, path2)
    }
    return new InlineRange(host, start, end)
  }

  static fromNodes(host: Host,
                   node1: Node, offset1: number,
                   node2: Node, offset2: number) {
    const start = {
      node: node1,
      offset: offset1,
      path: pathFromChild(host, node1)
    }
    const end = {
      node: node2,
      offset: offset2,
      path: pathFromChild(host, node2)
    }
    return new InlineRange(host, start, end)
  }

  static fromStaticRange(host: Host, range: StaticRange): InlineRange {
    return InlineRange.fromNodes(host,
      range.startContainer, range.startOffset,
      range.endContainer, range.endOffset)
  }

  static fromSelection(host: Host, sel: Selection): InlineRange | null {
    const mock = toStaticRange(host, sel)
    if (!mock) {
      return null
    }
    return InlineRange.fromStaticRange(host, mock)
  }
}
