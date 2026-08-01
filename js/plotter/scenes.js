import { rootedTree } from '/js/catalan-structures.js'
import { BBox } from '/js/bbox.js'
import { genericTruchetGrid, generateTruchetGrid } from '/js/regular-truchet.js'
import { Point } from '/js/geometry.js'
import { pairs, circularPairs } from '/js/utils.js'
import { StraightStroke } from '/js/lines.js'
import { Random } from '/js/random.js'
import {
  parenthesesToHex,
  rotateParenthesis,
  getParenthesisRotationSet,
  getParenthesisEvenRotationSet,
} from '/js/catalan.js'

import {
  regularTilings,
  semiregularTilings,
  uniform2Tilings,
  uniform3Tilings,
  uniform4Tilings,
  VertexGrid,
} from '/js/grid.js'

import {
  Tiling,
  TricolorFillTiling,
  TricolorThicknessFillTiling,
} from '/js/plotter/scenes/truchet.js'

import { Scene } from '/js/plotter/scene.js'
import { pens } from '/js/plotter/pens.js'

// a list of all the scenes available for plotting
const Empty = new Scene('Empty').withOptions(
  (bbox, {}) => ({ bbox }),
  [],
  ({}) => ({}),
)

const PlaneTree = new Scene('PlaneTree').withTemplate(
  rootedTree,
  (bbox) => ({
    bbox: bbox,
    tile: '((()((()))()()))(())',
  }),
  [],
  (template) => {
    return {
      edges: {
        curves: template.edges.map((edge) => edge.line),
        color: 'blue',
      },
    }
  },
)

function vertexListsToLines(vertexLists) {
  // given a list of list of vertices, each of which has an id and point,
  // return the list of StraightStrokes so that each edge is represented at most once (duplicates are removed)
  // this is used to deduplicate the edges between adjoining ngons
  let visited = {}
  let lines = []
  for (let vertices of vertexLists) {
    for (let [a, b] of circularPairs(vertices)) {
      if (a.id > b.id) {
        ;[a, b] = [b, a]
      }
      let key = `${a.id}-${b.id}`
      if (!(key in visited)) {
        lines.push(new StraightStroke(a.point, b.point))
        visited[key] = true
      }
    }
  }
  return lines
}

let textSizeOptions = [10, 15, 20, 25, 30, 35, 40, 45, 50].map((value) => ({
  value,
  display: value.toString(),
}))

const TextTest = new Scene('TextTest')
  .withOptions(
    (bbox, { size, text }) => {
      return {
        bbox: small ? bbox.withPadding(1000) : bbox,
        start: bbox.center(),
        size,
        text,
      }
    },
    [
      {
        name: 'size',
        type: 'dropdown',
        options: textSizeOptions,
        default: 20,
      },
      {
        name: 'text',
        type: 'dropdown',
        options: [
          {
            value:
              'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!"#$%&\'()*+,-./:;<=>?@[\\]^_{|}~ `',
            display: 'ASCII',
          },
          {
            value: 'This is it, then.',
            display: 'This is it',
          },
        ],
      },
    ],
    (params) => {
      let { bbox, start, size, text } = params

      let renderedText = renderText(palatinoFont, text, size)

      let layers = [0]
        .map((seed) =>
          generateTruchetGrid(faces, notches, size, (face) => {
            let random = seeds[seed]
            return cellChoice.value(random)(face)
          }),
        )
        .map(({ continuousCurves, closedCurves, faces }) => {
          if (filterShort) {
            closedCurves = closedCurves.filter((curve) => curve.curve.curve.curves.length > 10)
          }

          for (let curve of closedCurves) {
            curve.clip(bbox)
          }
          closedCurves = closedCurves.map((curve) => curve.clip(bbox)).flat()
          if (filterPerimeter) {
            closedCurves = closedCurves.filter(
              (curve) =>
                !curve.curve.curve.curves.some(
                  (c) => c.type == 'MetaFragment' && c.meta.isConnector,
                ),
            )
          }
          return {
            closedCurves,
          }
        })
      for (let layer of layers) {
        if (layer.closedCurves.some((c) => !c.curve.curve.isContinousDebug())) {
          throw `TricolorFillTiling has non-continuous fill curves`
        }
      }
      return {
        edges: {
          curves: vertexListsToLines(faces.map((face) => face.vertices)),
        },
        fill: {
          curves: layers[0].closedCurves.map((curve) => curve.boundaryCurve()).flat(),
          fill: {
            curves: layers[0].closedCurves,
            direction: 35,
          },
          dontOptimize: true,
        },
      }
    },
  )
  .withPens({
    edges: { pen: pens.CrayolaSuperTips, color: 'black' },
    fill: { pen: pens.Micron08, color: 'hsl(42, 100%, 40%)' },
  })

const scenes = {
  PlaneTree,
  Tiling,
  TricolorFillTiling,
  TricolorThicknessFillTiling,
  Empty, // used for debugging
}

export { scenes, PlaneTree, Tiling, TricolorFillTiling, TricolorThicknessFillTiling, Empty }
