const THRESHOLD = 0.01

function nextCoordinate(coord) {
  if (coord == 'x') {
    return 'y'
  }
  return 'x'
}

function getPointCoord(point, coord) {
  if (coord == 'x') {
    return point.x
  } else if (coord == 'y') {
    return point.y
  }
  throw `Unknown coord ${coord}`
}

function midpoint(a, b) {
  return a + (b - a) / 2
}

class Split {
  constructor(coordinate, value, less, more) {
    this.coordinate = coordinate
    this.value = value
    this.less = less
    this.more = more
    this._type = 'Split'
  }

  add(point, data) {
    let val = getPointCoord(point, this.coordinate)
    let child
    if (val < this.value) {
      child = this.less
    } else {
      child = this.more
    }
    let newNode
    if (child._type == 'Node') {
      let nextCoord = nextCoordinate(this.coordinate)
      let pointNextCoord = getPointCoord(point, nextCoord)
      let nodeNextCoord = getPointCoord(child.point, nextCoord)
      if (Math.abs(pointNextCoord - nodeNextCoord) < THRESHOLD / 2) {
        nextCoord = nextCoordinate(nextCoord)
        pointNextCoord = getPointCoord(point, nextCoord)
        nodeNextCoord = getPointCoord(child.point, nextCoord)
        if (Math.abs(pointNextCoord - nodeNextCoord) < THRESHOLD / 2) {
          throw `The two points (${point.string()}, ${child.point.string()}) are too close, there is no unambiguous way to add this point to the KDTree`
        }
      }
      let newNode
      let splitValue = midpoint(pointNextCoord, nodeNextCoord)
      if (pointNextCoord < splitValue) {
        newNode = new Split(nextCoord, splitValue, new Node(point, data), child)
      } else if (pointNextCoord > splitValue) {
        newNode = new Split(nextCoord, splitValue, child, new Node(point, data))
      } else {
        throw `Split doesn't work on ${pointNextCoord}, ${nodeNextCoord}`
      }
      if (val < this.value) {
        this.less = newNode
      } else {
        this.more = newNode
      }
    } else {
      child.add(point, data)
    }
  }

  find(point, debug) {
    let val = getPointCoord(point, this.coordinate)
    if (debug) {
      console.log(`Split.find() has coord ${this.coordinate} with threshold ${this.value}`)
    }
    if (val + THRESHOLD < this.value) {
      if (debug) {
        console.log(`Split.find() going down less path`)
      }
      return this.less.find(point, debug)
    } else if (val - THRESHOLD > this.value) {
      if (debug) {
        console.log(`Split.find() going down more path`)
      }
      return this.more.find(point, debug)
    }
    // the point is too close to the threshold, attempt to fetch on both sides
    if (debug) {
      console.log(`Split.find() executing on both less and more`)
    }
    let less = this.less.find(point, debug)
    if (less) {
      return less
    }
    let more = this.more.find(point, debug)
    if (more) {
      return more
    }
  }
}

class Node {
  constructor(point, data) {
    if (point.type != 'Point') {
      throw `Unexpected argument to Node: ${point.type}`
    }
    this.point = point
    this.data = data
    this._type = 'Node'
  }

  find(point, debug) {
    if (point.type != 'Point') {
      throw `Unexpected argument to Node.find: ${point.type}`
    }
    if (debug) {
      console.log(`Node.find() has distance ${this.point.manhattanDistance(point)}`)
    }
    if (this.point.manhattanDistance(point) < THRESHOLD) {
      return this.data
    }
    return null
  }

  add(point, data) {
    throw `Unexpected call to Node.add`
  }
}

class KDTree {
  constructor() {
    // wait until we have two elements to start the tree, otherwise use this.all as a list
    this.root = null
    this.all = []
    this._type = 'KDTree'
  }

  add(point, data) {
    if (this.find(point)) {
      throw `Point ${point} is already in the tree, won't be adding a new one`
    }
    this.all.push([point, data])
    if (this.root == null && this.all.length == 2) {
      let [a, b] = this.all
      if (a[0].x > b[0].x) {
        ;[a, b] = [b, a]
      }
      let mid = midpoint(a[0].x, b[0].x)
      this.root = new Split('x', mid, new Node(a[0], a[1]), new Node(b[0], b[1]))
    } else if (this.root) {
      this.root.add(point, data)
    }
  }

  find(point, debug) {
    if (!this.root) {
      if (debug) {
        console.log(`KDTree.find() in array`)
      }
      for (let [pt, val] of this.all) {
        if (point.manhattanDistance(pt) < THRESHOLD) {
          // console.log('from for loop', pt.string(), vertex.point.string(), vertex.point.distance(pt))
          return val
        }
      }
      if (debug) {
        console.log(`KDTree.find() in array, couldn't find`)
      }
      return null
    }
    if (debug) {
      console.log(`KDTree.find() in tree`)
    }
    return this.root.find(point, debug)
  }
}

export { KDTree }
