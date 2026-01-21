const points = {
  // points on the edge
  1: { x: -16.6, y: 0 },
  2: { x: 16.6, y: 0 },
  3: { x: 33.3, y: 28.87 },
  4: { x: 16.6, y: 57.78 },
  5: { x: -16.6, y: 57.78 },
  6: { x: -33.3, y: 28.87 },
  // derived points, perpendicular to edge points
  '1*': { x: -16.6, y: 19.24 },
  '2*': { x: 16.6, y: 19.24 },
  '3*': { x: 16.6, y: 19.24 },
  '4*': { x: 0, y: 48.1 },
  '5*': { x: 0, y: 48.1 },
  '6*': { x: -16.6, y: 19.24 },
}

function equalPoints(p1, p2) {
  return p1.x == p2.x && p1.y == p2.y
}

function printPt(pt) {
  return `${pt.x} ${pt.y}`
}

const twoCurveFactory = {
  template: `<path class="stroke" :d="getChunk(curve)" />`,
  props: ['curve'],
  methods: {
    getChunk: function (curve) {
      const c1 = curve[0]
      const c2 = curve[1]
      const p1 = points[c1]
      const p2 = points[c2]
      const p1prime = points[c1 + '*']
      const p2prime = points[c2 + '*']
      if (equalPoints(p1prime, p2prime)) {
        return `M ${printPt(p1)} Q ${printPt(p1prime)}, ${printPt(p2)}`
      }
      return `M ${printPt(p1)} C ${printPt(p1prime)}, ${printPt(p2prime)}, ${printPt(p2)}`
    },
  },
}

function generateTwoCurve(curve) {
  return {
    template: `<two-curve-factory curve="${curve}"/>`,
    components: { twoCurveFactory },
  }
}

function twoCurveIDs() {
  let retList = []
  for (let i = 1; i <= 6; i++) {
    for (let j = i + 1; j <= 6; j++) {
      retList.push(`${i}${j}`)
    }
  }
  return retList
}

let twoCurveSet = (function () {
  let retObj = {}
  for (let id of twoCurveIDs()) {
    retObj[`tricurve${id}`] = generateTwoCurve(id)
  }
  return retObj
})()

// Given a string, return an array of strings of two characters each, which add up to the input string
function getPairs(s) {
  const len = 2
  var chunks = []

  for (var i = 0, charsLength = s.length; i < charsLength; i += len) {
    chunks.push(s.substring(i, i + len))
  }
  return chunks
}

const twoTileFactory = {
  template: `<g class="tile">
    <polygon points="0,86.6 -50,0 50,0" />
    <component :is="computeCurve(curve,0)"></component>
    <component :is="computeCurve(curve,1)"></component>
    <component :is="computeCurve(curve,2)"></component>
  </g>`,
  props: ['curve'],
  methods: {
    computeCurve: function (curve, n) {
      let chunks = getPairs(curve)
      const chunk = chunks[n]
      return `tricurve${chunk}`
    },
  },
  components: twoCurveSet,
}

function generateTwoTile(tile) {
  return {
    template: `<two-tile-factory curve="${tile}"/>`,
    components: { twoTileFactory },
  }
}

const tilesetTri15 = {
  tile123456: generateTwoTile('123456'),
  tile123546: generateTwoTile('123546'),
  tile123645: generateTwoTile('123645'),
  tile132456: generateTwoTile('132456'),
  tile132546: generateTwoTile('132546'),
  tile132645: generateTwoTile('132645'),
  tile142356: generateTwoTile('142356'),
  tile142536: generateTwoTile('142536'),
  tile142635: generateTwoTile('142635'),
  tile152346: generateTwoTile('152346'),
  tile152436: generateTwoTile('152436'),
  tile152634: generateTwoTile('152634'),
  tile162345: generateTwoTile('162345'),
  tile162435: generateTwoTile('162435'),
  tile162534: generateTwoTile('162534'),
}

const tilesetTri5 = {
  tile123456: generateTwoTile('123456'),
  tile123645: generateTwoTile('123645'),
  tile142356: generateTwoTile('142356'),
  tile162345: generateTwoTile('162345'),
  tile162534: generateTwoTile('162534'),
}

export { tilesetTri5, tilesetTri15 }
