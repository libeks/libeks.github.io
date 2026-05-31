import { Point, Vector, Ray, NGon } from '/js/geometry.js'
import { enumerate } from '/js/utils.js'
import { StraightStroke, CircleArc, CompositeCurve, Polygon } from '/js/lines.js'
import {
  numericalToHex,
  hexToNumerical,
  hexToPartition,
  getBinaryTree,
  getPlaneTree,
  getDanglingBinaryTree,
  getParenthesisPartitions,
  parenthesesToPartitions,
} from '/js/catalan.js'
import { radToDeg, degToRad } from '/js/math.js'

// Given a string, return an array of strings of two characters each, which add up to the input string
function getPairs(s) {
  const len = 2
  var chunks = []

  for (var i = 0, charsLength = s.length; i < charsLength; i += len) {
    chunks.push(s.substring(i, i + len))
  }
  return chunks
}

const circleChords = {
  template: `
  <g>
    <circle v-if="showCircle" v-bind="center.cxcyProps()" :r="radius" />
    <g v-if="showNotches" v-for="(nv, index) in notchVects"> <!-- notches -->
      <path class="notch" :d="new StraightStroke(center.addVect(nv.mult(0.95)), center.addVect(nv.mult(1.05))).d()" />
      <text :x="notchLabelPos[index].x" :y="notchLabelPos[index].y" class="notchText">{{numericalToHex(index+1)}}</text>
    </g>
    <g v-if="showChords && !showArcs" v-for="chord in chords"> <!-- chords -->
      <path class="stroke thick" :d="chord.d()" />
    </g>
    <g v-if="showChords && showArcs" v-for="chord in arcChords"> <!-- arcChords -->
      <path class="stroke thick" :d="chord.d()" />
    </g>
    <g v-if="showPartitions" v-for="(partition,i) in partitions"> <!-- partitions -->
      <path class="polygon" :d="partition.d()" :style="{fill: colors[i], stroke: colors[i]}" opacity="0.5"/>
    </g>
    <g v-if="showMidpoints" v-for="(notch, index) in oddNotches"> <!-- notches -->
      <circle v-bind="notch.point.cxcyProps()" r=5 :style="{fill: notch.partitionColor}" />
      <text v-if="showMidpointLabels" v-bind="notch.labelPosition.xyProps()" class="notchText red">{{numericalToHex(index+1)}}</text>
    </g>
  </g>`,
  props: {
    tile: String, // hex string representation
    n: Number,
    bbox: Object,
    rotateDegrees: {
      type: Number,
      default: 0.0,
    },
    showArcs: Boolean,
    showMidpoints: Boolean,
    showPartitions: Boolean,
    showChords: Boolean,
    showCircle: Boolean,
    showNotches: Boolean,
    showMidpointLabels: Boolean,
  },
  methods: {
    range: (n) => Array(n).keys(),
    StraightStroke,
    numericalToHex,
  },
  computed: {
    center() {
      if (this.bbox != null) {
        return this.bbox.center()
      }
      throw `circle-chords called without bbox`
    },
    radius() {
      return Math.min(this.bbox.width(), this.bbox.height()) / 3.2
    },
    colors() {
      return [
        '#cc00ca',
        '#00a900',
        '#9a5d46',
        '#f17200',
        'yellow',
        'green',
        'pink',
        'purple',
        'brown',
        'orange',
        'fuchsia',
        'olive',
        'teal',
        'aqua',
      ]
    },
    notchVects() {
      let ret = []
      const initialAngle = this.rotateDegrees + 180 - 180 / this.n // ensure that notch number 1 is the top left-most notch, right after the leftmost clockwise
      for (let i = 0; i < 2 * this.n; i++) {
        ret.push(new Vector(1, 0).rotateDeg(initialAngle - i * (180 / this.n)).mult(this.radius))
      }
      return ret
    },
    notchPts() {
      let ret = []
      for (let nv of this.notchVects) {
        ret.push(this.center.addVect(nv))
      }
      return ret
    },
    notchLabelPos() {
      let ret = []
      for (let [i, nv] of this.notchVects.entries()) {
        ret.push(this.notchPts[i].addVect(nv.unit().mult(30).add(new Vector(0, 10))))
      }
      return ret
    },
    arcChords() {
      let pairs = getPairs(this.tile)
      let ch = []
      const angleStep = (2 * Math.PI) / (2 * this.n)
      for (let p of pairs) {
        let a = hexToNumerical(p[0])
        let b = hexToNumerical(p[1])
        let distance = b - a
        if (distance > this.n) {
          // swap a and b
          ;[a, b] = [b, a]
          distance = 2 * this.n - distance // use the shorter distance the other way around the circle
        }
        const angle = (angleStep * distance) / 2
        if (radToDeg(angle) < 89) {
          // and render cirlce arc segment
          ch.push(
            new CircleArc(
              this.notchPts[a - 1],
              this.notchPts[b - 1],
              this.radius * Math.tan(angle),
              0,
              0,
            ),
          )
        } else {
          // this is a straight line, some browsers might fail to render the arc segment, so we go with a line segment instead
          ch.push(new StraightStroke(this.notchPts[a - 1], this.notchPts[b - 1]))
        }
      }
      return ch
    },
    chords() {
      let pairs = getPairs(this.tile)
      let ch = []
      for (let p of pairs) {
        const a = hexToNumerical(p[0])
        const b = hexToNumerical(p[1])
        ch.push(new StraightStroke(this.notchPts[a - 1], this.notchPts[b - 1]))
      }
      return ch
    },
    oddNotches() {
      let ret = []
      let partitions = hexToPartition(this.tile)
      let partitionMap = {}
      let colorCounter = 0
      for (let [i, partition] of enumerate(partitions)) {
        if (partition.length > 1) {
          for (let p of partition) {
            partitionMap[p - 1] = {
              i,
              color: this.colors[colorCounter],
              partitionSize: partition.length,
            }
          }
          colorCounter += 1
        }
      }
      const initialAngle = this.rotateDegrees + 180 - 180 / this.n // ensure that notch number 1 is the top left-most notch, right after the leftmost clockwise
      for (let i = 0; i < this.n; i++) {
        let nv = new Vector(1, 0).rotateDeg(initialAngle - (2 * i + 0.5) * (180 / this.n))
        ret.push({
          point: this.center.addVect(nv.mult(this.radius)),
          labelPosition: this.center
            .addVect(nv.mult(this.radius * 1.35))
            .addVect(new Vector(0, 10)),
          partition: partitionMap[i] ? partitionMap[i].i : null,
          partitionColor: partitionMap[i] ? partitionMap[i].color : null,
        })
      }
      return ret
    },
    partitions() {
      let ret = []
      let partitions = hexToPartition(this.tile)
      for (let part of partitions) {
        if (part.length > 1) {
          let points = []
          for (let pt of part) {
            points.push(this.oddNotches[pt - 1].point)
          }
          ret.push(new Polygon(...points))
        }
      }
      return ret
    },
  },
}

const latticePaths = {
  template: `
  <g>
    <g v-for="x in range(n)"> <!-- lattice -->
      <path class="dashed gray" :d="new StraightStroke(leftCorner.addVect(new Vector(size,0).mult(x)), leftCorner.addVect(new Vector(size,0).mult(x)).addVect(upRight.mult(n-x))).d()" />
      <path class="dashed gray" :d="new StraightStroke(rightCorner.addVect(new Vector(-size,0).mult(x)), rightCorner.addVect(new Vector(-size,0).mult(x)).addVect(upLeft.mult(n-x))).d()" />
    </g>
    <path class="red" :d="new StraightStroke(leftCorner, rightCorner).d()" />
    <g> <!-- path -->
      <path class="stroke medium" :d="path.d()" />
    </g>
  </g>`,
  props: {
    tile: String, // parenthesis representation
    n: Number,
    bbox: Object,
  },
  methods: {
    range: (n) => Array(n).keys(),
    StraightStroke,
    Point,
    Vector,
  },
  computed: {
    size() {
      return Math.min(
        this.bbox.width() / (this.n + 2), // add 2 for padding on each side
        this.bbox.height() / (this.n / 2 + 2),
      )
    },
    padding() {
      return Math.max(this.size, (this.bbox.width() - this.size * this.n) / 2)
    },
    upRight() {
      return new Vector(this.size / 2, -this.size / 2)
    },
    upLeft() {
      return new Vector(-this.size / 2, -this.size / 2)
    },
    leftCorner() {
      return new Point(this.padding, (this.n / 2) * this.size + this.size)
    },
    rightCorner() {
      return new Point(this.n * this.size + this.padding, (this.n / 2) * this.size + this.size)
    },
    path() {
      let curves = new CompositeCurve()
      let startPoint = this.leftCorner
      for (let ch of this.tile) {
        let endPoint
        if (ch == '(') {
          endPoint = startPoint.addVect(this.upRight)
        } else if (ch == ')') {
          endPoint = startPoint.addVect(this.upLeft.mult(-1))
        } else {
          throw 'Unknown character'
        }
        curves.add(new StraightStroke(startPoint, endPoint))
        startPoint = endPoint
      }
      return curves
    },
  },
}

const rootedTree = {
  template: `
    <g>
      <g v-for="node in nodes">
      <text v-if="showLabels" v-bind="node.pt.d(10,4).xyProps()" style="font-size:12;">{{node.id}}</text>
      <circle v-bind="node.pt.cxcyProps()" r=5 class="fillBlack" :data-id="node.id" />
      </g> 
      <g v-for="edge in edges">
        <path :d="edge.line.d()" />
      </g>
    </g>
    `,
  props: {
    tile: String, // parenthesis notation
    bbox: Object,
    showLabels: Boolean,
  },
  computed: {
    tree() {
      return getPlaneTree(this.tile)
    },
    positionedTree() {
      let rows = {}
      function traverse(node) {
        let widthI = 0
        for (let child of node.children) {
          traverse(child)
          widthI += child.widthI
        }
        node.widthI = widthI > 0 ? widthI : 1
        if (rows[node.depth]) {
          rows[node.depth].push(node)
        } else {
          rows[node.depth] = [node]
        }
        // console.log('traverse node', node)
      }
      traverse(this.tree.root)
      this.tree.rows = rows
      let rowWidths = Object.values(rows).map((row) => row.reduce((a, c) => a + c.widthI, 0))
      let maxWidthI = Math.max(...rowWidths)
      let widthIncrement = this.bbox.width() / (maxWidthI + 2) // add 2 as padding on both sides
      function setWidth(node) {
        node.width = node.widthI * widthIncrement
        for (let child of node.children) {
          setWidth(child)
        }
      }
      setWidth(this.tree.root)
      this.tree.offsetX = (this.bbox.width() - this.tree.root.width) / 2
      this.tree.offsetY = 50
      this.tree.verticalStep = this.bbox.height() / (this.tree.maxDepth + 1)
      const tree = this.tree // capture to be used in setPosition
      // console.log(
      //   'bbox',
      //   this.bbox,
      //   this.bbox.height(),
      //   this.tree.maxDepth + 1,
      //   this.bbox.height() / (this.tree.maxDepth + 1),
      // )
      // console.log('tree', tree)
      function setPosition(node) {
        node.y = (node.depth + 0.5) * tree.verticalStep
        let offset = node.x - node.width / 2
        node.pt = new Point(node.x, node.y)
        // console.log('node.pt', node.pt)
        for (let child of node.children) {
          child.x = offset + child.width / 2
          offset += child.width
          setPosition(child)
        }
      }
      tree.root.x = this.tree.offsetX + tree.root.width / 2
      setPosition(tree.root)
      return tree
    },
    nodes() {
      return Object.values(this.positionedTree.nodes)
    },
    edges() {
      let edges = []
      const truncatedLine = true // whether the line connecting nodes should "go quiet" close to the node
      function getEdges(node) {
        // console.log('node', node)
        for (let child of node.children) {
          // console.log('child', node, child)
          let ptA = node.pt
          let ptB = child.pt
          // console.log('pts', ptA, ptB)
          let line
          if (truncatedLine) {
            let vect = ptA.vectTo(ptB).unit()
            line = new StraightStroke(ptA.addVect(vect.mult(10)), ptB.addVect(vect.mult(-10)))
          } else {
            line = new StraightStroke(ptA, ptB)
          }
          edges.push({
            from: node.id,
            to: child.id,
            ptA,
            ptB,
            line,
          })
          getEdges(child)
        }
      }
      // console.log('this', this)
      // console.log('tree root', this.tree.root)
      getEdges(this.positionedTree.root)
      return edges
    },
  },
}

const binaryTree = {
  template: `
    <g>
      <g v-for="node in nodes">
        <text v-if="showLabels" v-bind="node.pt.d(10,4).xyProps()" style="font-size:12;">{{node.id}}</text>
        <circle v-bind="node.pt.cxcyProps()" r=5 class="fillBlack" :data-id="node.id" />
      </g> 
      <g v-for="edge in edges">
        <path :d="edge.line.d()" />
      </g>
    </g>
    `,
  props: {
    tile: String, // parenthesis notation
    bbox: Object,
    showLabels: Boolean,
  },
  computed: {
    tree() {
      return getBinaryTree(this.tile)
    },
    positionedTree() {
      let rows = {}
      let maxDepth = this.tree.maxDepth
      function traverse(node) {
        let widthI = 0
        for (let child of [node.left, node.right]) {
          if (child == null) {
            widthI += 1.4 ** (maxDepth - node.depth - 1) // ghost space for missing child, add one since we're taking the parent's depth
          } else {
            traverse(child)
            widthI += child.widthI
          }
        }
        let isLeaf = node.left == null && node.right == null
        if (isLeaf) {
          node.widthI = 1.4 ** (maxDepth - node.depth)
        } else {
          node.widthI = widthI > 0 ? widthI : 2
        }

        if (rows[node.depth]) {
          rows[node.depth].push(node)
        } else {
          rows[node.depth] = [node]
        }
      }
      traverse(this.tree.root)
      this.tree.rows = rows
      let rowWidths = Object.values(rows).map((row) => row.reduce((a, c) => a + c.widthI, 0))
      let maxWidthI = Math.max(...rowWidths)
      // leave a 5% margin on each side
      let widthIncrement = (this.bbox.width() * 0.9) / maxWidthI // add 5% padding on both sides
      function setWidth(node) {
        node.width = node.widthI * widthIncrement
        for (let child of [node.left, node.right].filter((n) => n != null)) {
          setWidth(child)
        }
      }
      setWidth(this.tree.root)
      this.tree.offsetX = (this.bbox.width() - this.tree.root.width) / 2
      this.tree.offsetY = 50
      this.tree.verticalStep = this.bbox.height() / (this.tree.maxDepth + 1)
      const tree = this.tree // capture to be used in setPosition
      function setPosition(node) {
        node.y = (node.depth + 0.5) * tree.verticalStep
        let offset = node.x - node.width / 2
        node.pt = new Point(node.x, node.y)
        for (let child of [node.left, node.right]) {
          if (child != null) {
            child.x = offset + child.width / 2
            offset += child.width
            setPosition(child)
          } else {
            offset += widthIncrement * 1.4 ** (maxDepth - node.depth - 1)
          }
        }
      }
      tree.root.x = this.tree.offsetX + tree.root.width / 2
      setPosition(tree.root)
      return tree
    },
    nodes() {
      return Object.values(this.positionedTree.nodes)
    },
    edges() {
      let edges = []
      const truncatedLine = true // whether the line connecting nodes should "go quiet" close to the node
      function getEdges(node) {
        for (let child of [node.left, node.right].filter((n) => n != null)) {
          let ptA = node.pt
          let ptB = child.pt
          let line
          if (truncatedLine) {
            let vect = ptA.vectTo(ptB).unit()
            line = new StraightStroke(ptA, ptB).stripPx(10)
          } else {
            line = new StraightStroke(ptA, ptB)
          }
          edges.push({
            from: node.id,
            to: child.id,
            ptA,
            ptB,
            line,
          })
          getEdges(child)
        }
      }
      getEdges(this.tree.root)
      return edges
    },
  },
}

const danglingBinaryTree = {
  template: `
    <g>
      <g v-for="node in nodes">
        <circle v-bind="node.pt.cxcyProps()" r=5 :style="{fill: node.type=='black' ? 'black' : 'white'}" :data-id="node.id" />
        <text v-if="showLabels && node.type=='black'" v-bind="node.pt.d(10,4).xyProps()" style="font-size:12;">{{node.id}}</text>
      </g> 
      <g v-for="edge in edges">
        <path :d="edge.line.d()" />
      </g>
    </g>
    `,
  props: {
    tile: String, // parenthesis notation
    bbox: Object,
    showLabels: Boolean,
  },
  computed: {
    tree() {
      return getDanglingBinaryTree(this.tile)
    },
    positionedTree() {
      let rows = {}
      let maxDepth = this.tree.maxDepth
      function traverse(node) {
        let widthI = 0
        for (let child of [node.left, node.right]) {
          if (child == null) {
            widthI += 1.4 ** (maxDepth - node.depth - 1) // ghost space for missing child, add one since we're taking the parent's depth
          } else {
            traverse(child)
            widthI += child.widthI
          }
        }
        let isLeaf = node.left == null && node.right == null
        if (isLeaf) {
          node.widthI = 1.4 ** (maxDepth - node.depth)
        } else {
          node.widthI = widthI > 0 ? widthI : 2
        }

        if (rows[node.depth]) {
          rows[node.depth].push(node)
        } else {
          rows[node.depth] = [node]
        }
      }
      traverse(this.tree.root)
      this.tree.rows = rows
      let rowWidths = Object.values(rows).map((row) => row.reduce((a, c) => a + c.widthI, 0))
      let maxWidthI = Math.max(...rowWidths)
      // leave a 5% margin on each side
      let widthIncrement = (this.bbox.width() * 0.9) / maxWidthI // add 5% padding on both sides
      function setWidth(node) {
        node.width = node.widthI * widthIncrement
        for (let child of [node.left, node.right].filter((n) => n != null)) {
          setWidth(child)
        }
      }
      setWidth(this.tree.root)
      this.tree.offsetX = (this.bbox.width() - this.tree.root.width) / 2
      this.tree.offsetY = 50
      this.tree.verticalStep = this.bbox.height() / (this.tree.maxDepth + 1)
      const tree = this.tree // capture to be used in setPosition
      function setPosition(node) {
        node.y = (node.depth + 0.5) * tree.verticalStep
        let offset = node.x - node.width / 2
        node.pt = new Point(node.x, node.y)
        for (let child of [node.left, node.right]) {
          if (child != null) {
            child.x = offset + child.width / 2
            offset += child.width
            setPosition(child)
          } else {
            offset += widthIncrement * 1.4 ** (maxDepth - node.depth - 1)
          }
        }
      }
      tree.root.x = this.tree.offsetX + tree.root.width / 2
      setPosition(tree.root)
      return tree
    },
    nodes() {
      // console.log('nodes', this.positionedTree.nodes)
      return Object.values(this.positionedTree.nodes)
    },
    edges() {
      let edges = []
      const truncatedLine = true // whether the line connecting nodes should "go quiet" close to the node
      function getEdges(node) {
        for (let child of [node.left, node.right].filter((n) => n != null)) {
          let ptA = node.pt
          let ptB = child.pt
          let line
          if (truncatedLine) {
            let vect = ptA.vectTo(ptB).unit()
            line = new StraightStroke(ptA, ptB).stripPx(10)
          } else {
            line = new StraightStroke(ptA, ptB)
          }
          edges.push({
            from: node.id,
            to: child.id,
            ptA,
            ptB,
            line,
          })
          getEdges(child)
        }
      }
      getEdges(this.tree.root)
      return edges
    },
  },
}

const polygonTriangulation = {
  template: `
    <g>
      <g v-for="edge in edges" class="edges">
        <path :d="edge.line.d()" :style="{stroke: (edge.internal ? 'red' : 'black')}" />
      </g>
      <g v-if="showVertices" v-for="(vertex,id) in vertices" class="vertices">
        <text v-if="showLabels" v-bind="vertex.d(10,4).xyProps()" style="font-size:12;">{{id}}</text>
        <circle v-bind="vertex.cxcyProps()" r=5 class="fillBlack" :data-vertex="id" />
      </g>
      <g v-if="showTriangles" v-for="tri in triangles" class="triangles">
        <path :d="tri.triangle.d()" :style="{fill:tri.depth%2==1 ? 'white' : 'black'}" />
      </g>
      <g v-if="showDualGraph" class="dualGraph">
        <g v-for="(node,id) in triangles" :data-triangle="id">
          <path v-for="line in node.childEdges" :d="line.line.stripPx(5).d()" :style="{'stroke-dasharray': (line.type=='direct' ? null : '4'), 'stroke': 'blue'}" />
          <circle v-bind="node.midpoint.cxcyProps()" r=3 class="fillBlack" />
          <circle v-for="edge in node.sideLines" v-bind="edge.midpoint().cxcyProps()" r=2 />
        </g>
        <path :d="tree.root.rootLine.d()" style="stroke:black; stroke-dasharray: 4;" />
      </g>
    </g>
    `,
  props: {
    tile: String, // parenthesis notation
    bbox: Object,
    showDualGraph: Boolean,
    showLabels: Boolean,
    showVertices: Boolean,
    showTriangles: Boolean,
    truncatedLine: Boolean,
  },
  computed: {
    tree() {
      let tree = getBinaryTree(this.tile)
      let n = this.n + 2
      let i = n
      function markDangling(node) {
        if (node.left != null) {
          markDangling(node.left)
          node.leftData = node.left.data
        } else {
          node.leftData = { left: i % n, right: (i - 1) % n }
          i--
        }
        if (node.right != null) {
          markDangling(node.right)
          node.rightData = node.right.data
        } else {
          node.rightData = { left: i % n, right: (i - 1) % n }
          i--
        }

        if (node.leftData != null && node.rightData != null) {
          node.data = { left: node.leftData.left, right: node.rightData.right }
        } else {
          throw `Unexpected left or right data missing for node ${node.id}`
        }
      }
      markDangling(tree.root)
      return tree
    },
    n() {
      if (this.tile.length % 2 != 0) {
        throw `unexpected odd-length parenthesis tile ${this.tile}`
      }
      return this.tile.length / 2
    },
    side() {
      let dimension = Math.max(this.bbox.width(), this.bbox.height()) * 0.8
      let alphaDeg = 360 / (2 * (this.n + 2))
      let alphaRad = degToRad(alphaDeg)
      let side = dimension * Math.sin(alphaRad)
      return side
    },
    vertices() {
      let ngon = new NGon({
        center: this.bbox.center(),
        side: this.side,
        tile: (this.n + 2).toString(),
        clockwise: true,
        firstEdgeAtTop: true,
      })
      return ngon.vertices
    },
    edgeIDs() {
      let edgePairs = []
      let vertices = this.vertices // capture in scope for function
      function gatherEdges(node) {
        if (node.left != null) {
          gatherEdges(node.left)
        } else {
          edgePairs.push(node.leftData)
        }
        edgePairs.push(node.data)
        if (node.right != null) {
          gatherEdges(node.right)
        } else {
          edgePairs.push(node.rightData)
        }
        node.verticeIDs = [node.leftData.left, node.leftData.right, node.rightData.right]
        node.vertices = node.verticeIDs.map((id) => vertices[id])
        node.triangle = new Polygon(...node.vertices)
        node.midpoint = node.triangle.midpoint()
        let childEdges = []
        let sideLines = []
        if (node.left != null) {
          childEdges.push({
            line: new StraightStroke(node.midpoint, node.left.midpoint),
            type: 'direct', // line from node to node
          })
        } else {
          let side = new StraightStroke(vertices[node.leftData.left], vertices[node.leftData.right])
          sideLines.push(side)
          childEdges.push({
            line: new StraightStroke(node.midpoint, side.midpoint()),
            type: 'ghost', // line from node to edge
          })
        }
        if (node.right != null) {
          childEdges.push({
            line: new StraightStroke(node.midpoint, node.right.midpoint),
            type: 'direct', // line from node to node
          })
        } else {
          let side = new StraightStroke(
            vertices[node.rightData.left],
            vertices[node.rightData.right],
          )
          sideLines.push(side)
          childEdges.push({
            line: new StraightStroke(node.midpoint, side.midpoint()),
            type: 'ghost', // line from node to edge
          })
        }
        node.childEdges = childEdges
        node.sideLines = sideLines
      }
      gatherEdges(this.tree.root)
      let edge01 = new StraightStroke(this.vertices[0], this.vertices[1])
      this.tree.root.rootLine = new StraightStroke(this.tree.root.midpoint, edge01.midpoint())
      return edgePairs
    },
    edges() {
      let edges = []
      for (let { left, right } of this.edgeIDs) {
        let ptA = this.vertices[left]
        let ptB = this.vertices[right]
        let line
        if (this.truncatedLine) {
          line = new StraightStroke(ptA, ptB).stripPx(10)
        } else {
          line = new StraightStroke(ptA, ptB)
        }
        edges.push({
          from: left,
          to: right,
          ptA,
          ptB,
          line,
          internal: Math.abs(left - right) != 1 && Math.abs(left - right) != this.n + 1,
        })
      }
      return edges
    },
    triangles() {
      let a = this.edgeIDs // necessary to ensure that the tree is fully computed
      return this.tree.nodes
    },
  },
}

const murasakiDiagram = {
  template: `
    <g>
      <path v-for="bar in bars" :d="bar.d()" class="fillBlack" />
      <path v-for="connector in connectors" :d="connector.d()" class="fillBlack" />
    </g>
  `,
  props: {
    tile: String, // parenthesis notation
    bbox: Object,
    widthRatio: {
      type: Number,
      default: 0.5,
    },
  },
  computed: {
    partition() {
      let partitions = parenthesesToPartitions(this.tile)
      if (this.tile.length % 2 == 1) {
        throw `murasaki-diagram got a tile of odd length ${this.tile}`
      }
      let n = this.tile.length / 2
      let depths = []
      for (let i = 0; i < n; i++) {
        depths.push(0)
      }

      // assume that partitions are ordered by their first element
      for (let part of partitions) {
        if (part.length > 1) {
          let partStart = part[0]
          let partEnd = part[part.length - 1]
          for (let i = partStart + 1; i < partEnd; i++) {
            if (!part.includes(i)) depths[i - 1] = depths[i - 1] + 1
          }
        }
      }
      let maxDepth = 0
      for (let el of Object.values(depths)) {
        if (maxDepth < el) {
          maxDepth = el
        }
      }
      return { n, partitions, depths, maxDepth }
    },
    dimensions() {
      let xIncrement = this.bbox.width() / (this.partition.n + 1) // add 2 for padding
      let width = xIncrement * this.widthRatio * 0.5
      return {
        top: this.bbox.height() * 0.1,
        bottom: this.bbox.height() * 0.9,
        yIncrement: width * 4,
        xIncrement,
        width,
      }
    },
    bars() {
      let bars = []
      for (let i = 0; i < this.partition.n; i++) {
        let { width, xIncrement, yIncrement, top, bottom } = this.dimensions
        let x = xIncrement * (i + 1)
        let depth = this.partition.depths[i]
        let topX = top + depth * yIncrement
        bars.push(
          new Polygon(
            new Point(x - width, topX - width),
            new Point(x + width, topX - width),
            new Point(x + width, bottom + width),
            new Point(x - width, bottom + width),
          ),
        )
      }
      return bars
    },
    connectors() {
      let connectors = []
      for (let part of this.partition.partitions) {
        if (part.length > 1) {
          let partStart = part[0]
          let partEnd = part[part.length - 1]
          let { xIncrement, yIncrement, top, width } = this.dimensions
          let topX = top + this.partition.depths[partStart - 1] * yIncrement
          let xStart = partStart * xIncrement
          let xEnd = partEnd * xIncrement
          connectors.push(
            new Polygon(
              new Point(xStart - width, topX - width),
              new Point(xStart - width, topX + width),
              new Point(xEnd + width, topX + width),
              new Point(xEnd + width, topX - width),
            ),
          )
        }
      }
      return connectors
    },
  },
}

export {
  circleChords,
  latticePaths,
  rootedTree,
  binaryTree,
  polygonTriangulation,
  danglingBinaryTree,
  murasakiDiagram,
}
