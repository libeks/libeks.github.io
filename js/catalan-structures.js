import { Point, Vector } from '/js/geometry.js'
import { StraightStroke, CircleArc, CompositeCurve, Polygon } from '/js/lines.js'
import { numericalToHex, hexToNumerical, numericalToPartition } from '/js/catalan.js'
import { radToDeg } from '/js/math.js'

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
    <circle v-if="showCircle" :cx="centerx" :cy="centery" :r="radius" />
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
    <g v-if="showMidpoints" v-for="(nv, index) in oddNotches"> <!-- notches -->
      <circle :cx="center.addVect(nv).x" :cy="center.addVect(nv).y" r=5 class="fillBlack" />
      <text v-if="showMidpointLabels" :x="oddNotchLabelPos[index].x" :y="oddNotchLabelPos[index].y" class="notchText red">{{numericalToHex(index+1)}}</text>
    </g>
  </g>`,
  props: {
    tile: String, // numerical representation
    n: Number,
    radius: Number,
    centerx: Number,
    centery: Number,
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
      return new Point(this.centerx, this.centery)
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
      const initialAngle = this.rotateDegrees + 180 - 180 / this.n // ensure that notch number 1 is the top left-most notch, right after the leftmost clockwise
      for (let i = 0; i < this.n; i++) {
        ret.push(
          new Vector(1, 0)
            .rotateDeg(initialAngle - (2 * i + 0.5) * (180 / this.n))
            .mult(this.radius),
        )
      }
      return ret
    },
    oddNotchLabelPos() {
      let ret = []
      const initialAngle = this.rotateDegrees + 180 - 180 / this.n // ensure that notch number 1 is the top left-most notch, right after the leftmost clockwise
      for (let i = 0; i < this.n; i++) {
        let nv = new Vector(1, 0).rotateDeg(initialAngle - (2 * i + 0.5) * (180 / this.n))
        ret.push(this.center.addVect(nv.mult(this.radius * 1.35)).addVect(new Vector(0, 10)))
      }
      return ret
    },
    partitions() {
      let ret = []
      let partitions = numericalToPartition(this.tile)
      for (let part of partitions) {
        if (part.length > 1) {
          let points = []
          for (let pt of part) {
            points.push(this.center.addVect(this.oddNotches[pt - 1]))
          }
          ret.push(new Polygon(points))
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
    size: Number,
    padding: Number,
  },
  methods: {
    range: (n) => Array(n).keys(),
    StraightStroke,
    Point,
    Vector,
  },
  computed: {
    upRight() {
      return new Vector(this.size / 2, -this.size / 2)
    },
    upLeft() {
      return new Vector(-this.size / 2, -this.size / 2)
    },
    leftCorner() {
      return new Point(this.padding, (this.n / 2) * this.size + this.padding)
    },
    rightCorner() {
      return new Point(this.n * this.size + this.padding, (this.n / 2) * this.size + this.padding)
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
      <text v-if="showLabels" v-bind="node.pt.d(10,10).xyProps()">{{node.id}}</text>
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
    height: Number,
    minWidth: {
      type: Number,
      default: 50,
    },
    showLabels: Boolean,
  },
  computed: {
    tree() {
      let maxDepth = 0
      let depth = 0
      let nNodes = 0
      let nodes = {}
      let root = { id: 0, children: [], parent: null, depth: 0 }
      nodes[root.id] = root
      let current = root
      for (let char of this.tile) {
        if (char == '(') {
          nNodes++
          current = { id: nNodes, children: [], parent: current, depth: depth + 1 }
          current.parent.children.push(current)
          nodes[current.id] = current
          depth++
          if (depth > maxDepth) {
            maxDepth = depth
          }
          // maxDepth++
        } else {
          current = current.parent
          depth--
        }
      }
      return { root, maxDepth, nNodes, nodes }
    },
    positionedTree() {
      let rows = {}
      let minWidth = this.minWidth // capture value to be usable inside traverse()
      function traverse(node) {
        let width = 0
        for (let child of node.children) {
          traverse(child)
          width += child.width
        }
        node.width = width > 0 ? width : minWidth
        if (rows[node.depth]) {
          rows[node.depth].push(node)
        } else {
          rows[node.depth] = [node]
        }
      }
      traverse(this.tree.root)
      this.tree.rows = rows
      this.tree.offsetX = (this.bbox.width() - this.tree.root.width) / 2
      this.tree.offsetY = 50
      this.tree.verticalStep = (this.bbox.height() - 100) / this.tree.maxDepth
      const tree = this.tree // capture to be used in setPosition
      function setPosition(node) {
        node.y = node.depth * tree.verticalStep + tree.offsetY
        let offset = node.x - node.width / 2
        node.pt = new Point(node.x, node.y)
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
      console.log('tree', this.positionedTree)
      return Object.values(this.positionedTree.nodes)
    },
    edges() {
      let edges = []
      function getEdges(node) {
        for (let child of node.children) {
          console.log('line', node, child)
          edges.push({
            from: node.id,
            to: child.id,
            ptA: node.pt,
            ptB: child.pd,
            line: new StraightStroke(node.pt, child.pt),
          })
          getEdges(child)
        }
      }
      getEdges(this.tree.root)
      console.log('edges', edges)
      return edges
    },
  },
}

export { circleChords, latticePaths, rootedTree }
