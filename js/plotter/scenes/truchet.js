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

import { pens } from '/js/plotter/pens.js'
import { Scene } from '/js/plotter/scene.js'

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

let sizeOptions = [300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950, 1000].map(
  (value) => ({
    value,
    display: value.toString(),
  }),
)

let pipeParenthesesSets = {
  3: getParenthesisRotationSet('((()))'),
  4: getParenthesisRotationSet('(((())))'),
  6: getParenthesisRotationSet('(((((())))))'),
  8: getParenthesisRotationSet('(((((((())))))))'),
  12: getParenthesisRotationSet('(((((((((((())))))))))))'),
  16: getParenthesisRotationSet('(((((((((((((((())))))))))))))))'),
  24: getParenthesisRotationSet('(((((((((((((((((((((((())))))))))))))))))))))))'),
}

let pipeOnlyParenthesesSets = {
  3: getParenthesisRotationSet('((()))'),
  4: ['(((())))', '(())(())'],
  6: getParenthesisRotationSet('(((((())))))'),
  8: getParenthesisRotationSet('(((((((())))))))'),
  12: getParenthesisRotationSet('(((((((((((())))))))))))'),
  16: getParenthesisRotationSet('(((((((((((((((())))))))))))))))'),
  24: getParenthesisRotationSet('(((((((((((((((((((((((())))))))))))))))))))))))'),
}

let pipeThreeConnectorParenthesesSets = {
  3: ['(()())'],
  4: ['(((())))', '(())(())'],
  6: getParenthesisEvenRotationSet('(((((())))))'),
  8: getParenthesisEvenRotationSet('(((((((())))))))'),
  12: getParenthesisEvenRotationSet('(((((((((((())))))))))))'),
  16: getParenthesisEvenRotationSet('(((((((((((((((())))))))))))))))'),
  24: getParenthesisEvenRotationSet('(((((((((((((((((((((((())))))))))))))))))))))))'),
}

const Tiling = new Scene('TruchetTiling')
  .withOptions(
    (
      bbox,
      {
        size,
        small,
        pattern,
        notch1,
        notch2,
        notches,
        clip,
        filterShort,
        filterPerimeter,
        seed,
        cellChoice,
      },
    ) => {
      return {
        bbox: small ? bbox.withPadding(1000) : bbox,
        start: bbox.center(),
        size,
        pattern,
        notches: notches.value == 1 ? [notch1] : [notch1, notch2],
        onlyNgonsInsideBBox: clip,
        filterShort,
        filterPerimeter,
        seed,
        cellChoice,
      }
    },
    [
      {
        name: 'pattern',
        type: 'dropdown',
        options: [
          ...regularTilings,
          ...semiregularTilings,
          ...uniform2Tilings,
          ...uniform3Tilings,
          ...uniform4Tilings,
        ].map((tiling) => ({ display: tiling.string(), value: tiling })),
        default: '[4.4.4.4]',
      },
      {
        name: 'size',
        type: 'dropdown',
        options: sizeOptions,
        default: '550',
      },
      {
        name: 'small',
        display: 'Small Box',
        type: 'toggle',
        default: false,
      },
      {
        name: 'clip',
        display: 'Only ngons in bbox',
        type: 'toggle',
        default: false,
      },
      {
        name: 'filterShort',
        display: 'Remove short curves',
        type: 'toggle',
        default: false,
      },
      {
        name: 'filterPerimeter',
        display: 'Remove curves that touch the perimeter',
        type: 'toggle',
        default: false,
      },
      {
        name: 'notch1',
        type: 'slider',
        min: 0.01,
        step: 0.01,
        max: 0.99,
        default: 0.33,
      },
      {
        name: 'notch2',
        type: 'slider',
        min: 0.01,
        step: 0.01,
        max: 0.99,
        default: 0.66,
      },
      {
        name: 'notches',
        type: 'radioButton',
        choices: [
          { value: 1, display: '1' },
          { value: 2, display: '2' },
        ],
        default: '1',
      },
      {
        name: 'cellChoice',
        type: 'dropdown',
        options: [
          {
            display: 'random',
            value: (random) => (face) => ({
              n: random.int(1289904147324),
            }),
          },
          {
            display: 'tubes',
            value: (random) => (face) => {
              let n = face.tile.notchPoints.length / 2
              return {
                tile: parenthesesToHex(random.choose(pipeParenthesesSets[n])),
              }
            },
          },
          {
            display: 'tubes-four',
            value: (random) => (face) => {
              let n = face.tile.notchPoints.length / 2
              return {
                tile: parenthesesToHex(random.choose(pipeOnlyParenthesesSets[n])),
              }
            },
          },
          {
            display: 'tubes-four-three-connect',
            value: (random) => (face) => {
              let n = face.tile.notchPoints.length / 2
              return {
                tile: parenthesesToHex(random.choose(pipeThreeConnectorParenthesesSets[n])),
              }
            },
          },
        ],
        default: 'random',
      },
    ],
    (params) => {
      let {
        bbox,
        start,
        size,
        notches,
        angle,
        pattern,
        onlyNgonsInsideBBox,
        filterShort,
        filterPerimeter,
        cellChoice,
      } = params
      console.log('size', size)
      console.log('notches', notches)
      size = size.value
      pattern = pattern.value
      // notches = notches.value
      console.log('notches', notches)
      let grid = new VertexGrid({
        bbox,
        start,
        size,
        angle: 0,
        pattern,
        iterations: -1,
      }).generate()
      let faces = onlyNgonsInsideBBox ? grid.getFacesInBBox() : grid.getFaces()

      let initialRandom = new Random(params.seed)

      let seeds = [0].map((seed) => new Random(initialRandom.int(10000000))) // initialize three separate random seeders, one for each layer
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

const TricolorFillTiling = new Scene('TricolorFillTruchetTiling')
  .withOptions(
    (
      bbox,
      {
        size,
        small,
        pattern,
        notch1,
        notch2,
        notches,
        clip,
        filterShort,
        filterPerimeter,
        seed,
        cellChoice,
      },
    ) => {
      return {
        bbox: small ? bbox.withPadding(1000) : bbox,
        start: bbox.center(),
        size,
        pattern,
        notches: notches.value == 1 ? [notch1] : [notch1, notch2],
        onlyNgonsInsideBBox: clip,
        filterShort,
        filterPerimeter,
        seed,
        cellChoice,
      }
    },
    [
      {
        name: 'pattern',
        type: 'dropdown',
        options: [
          ...regularTilings,
          ...semiregularTilings,
          ...uniform2Tilings,
          ...uniform3Tilings,
          ...uniform4Tilings,
        ].map((tiling) => ({ display: tiling.string(), value: tiling })),
        // default: semiregularTilings[0],
        default: '[4.4.4.4]',
      },
      {
        name: 'size',
        type: 'dropdown',
        options: sizeOptions,
        default: '550',
      },
      {
        name: 'small',
        display: 'Small Box',
        type: 'toggle',
        default: false,
      },
      {
        name: 'clip',
        display: 'Only ngons in bbox',
        type: 'toggle',
        default: false,
      },
      {
        name: 'filterShort',
        display: 'Remove short curves',
        type: 'toggle',
        default: false,
      },
      {
        name: 'filterPerimeter',
        display: 'Remove curves that touch the perimeter',
        type: 'toggle',
        default: false,
      },
      {
        name: 'notch1',
        type: 'slider',
        min: 0.01,
        step: 0.01,
        max: 0.99,
        default: 0.33,
      },
      {
        name: 'notch2',
        type: 'slider',
        min: 0.01,
        step: 0.01,
        max: 0.99,
        default: 0.66,
      },
      {
        name: 'notches',
        type: 'radioButton',
        choices: [
          { value: 1, display: '1' },
          { value: 2, display: '2' },
        ],
        default: '1',
      },
      {
        name: 'cellChoice',
        type: 'dropdown',
        options: [
          {
            display: 'random',
            value: (random) => (face) => ({
              n: random.int(1289904147324),
            }),
          },
          {
            display: 'tubes',
            value: (random) => (face) => {
              let n = face.tile.notchPoints.length / 2
              return {
                tile: parenthesesToHex(random.choose(pipeParenthesesSets[n])),
              }
            },
          },
          {
            display: 'tubes-four',
            value: (random) => (face) => {
              let n = face.tile.notchPoints.length / 2
              return {
                tile: parenthesesToHex(random.choose(pipeOnlyParenthesesSets[n])),
              }
            },
          },
          {
            display: 'tubes-four-three-connect',
            value: (random) => (face) => {
              let n = face.tile.notchPoints.length / 2
              return {
                tile: parenthesesToHex(random.choose(pipeThreeConnectorParenthesesSets[n])),
              }
            },
          },
        ],
        default: 'random',
      },
    ],
    (params) => {
      let {
        bbox,
        start,
        size,
        notches,
        angle,
        pattern,
        onlyNgonsInsideBBox,
        filterShort,
        filterPerimeter,
        cellChoice,
      } = params
      size = size.value
      pattern = pattern.value
      // notches = notches.value
      console.log('notches', notches)
      let grid = new VertexGrid({
        bbox,
        start,
        size,
        angle: 0,
        pattern,
        iterations: -1,
      }).generate()
      let faces = onlyNgonsInsideBBox ? grid.getFacesInBBox() : grid.getFaces()

      let initialRandom = new Random(params.seed)

      let seeds = [0, 1, 2].map((seed) => new Random(initialRandom.int(10000000))) // initialize three separate random seeders, one for each layer
      let layers = [0, 1, 2]
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
        'fill-yellow': {
          curves: layers[0].closedCurves.map((curve) => curve.boundaryCurve()).flat(),
          fill: {
            curves: layers[0].closedCurves,
            direction: 35,
          },
          dontOptimize: true,
        },
        'fill-cyan': {
          curves: layers[1].closedCurves.map((curve) => curve.boundaryCurve()).flat(),
          fill: {
            curves: layers[1].closedCurves,
            direction: 95,
          },
          dontOptimize: true,
        },
        'fill-magenta': {
          curves: layers[2].closedCurves.map((curve) => curve.boundaryCurve()).flat(),
          fill: {
            curves: layers[2].closedCurves,
            direction: 155,
          },
          dontOptimize: true,
        },
      }
    },
  )
  .withPens({
    edges: { pen: pens.CrayolaSuperTips, color: 'black' },
    'fill-yellow': { pen: pens.Micron08, color: 'hsl(42, 100%, 40%)' },
    'fill-cyan': { pen: pens.Micron08, color: 'hsl(208, 80%, 32%)' },
    'fill-magenta': { pen: pens.Micron08, color: 'hsl(330, 80%, 60%)' },
  })

const TricolorThicknessFillTiling = new Scene('TricolorThicknessFillTruchetTiling')
  .withTemplate(
    genericTruchetGrid,
    (bbox, { size, small, pattern, notches, clip }) => {
      return {
        bbox: small ? bbox.withPadding(1000) : bbox,
        start: bbox.center(),
        size,
        pattern: pattern.value,
        notches: [0.33],
        onlyNgonsInsideBBox: clip,
      }
    },
    [
      {
        name: 'pattern',
        type: 'dropdown',
        options: [
          ...regularTilings,
          ...semiregularTilings,
          ...uniform2Tilings,
          ...uniform3Tilings,
          ...uniform4Tilings,
        ].map((tiling) => ({ display: tiling.string(), value: tiling })),
        default: '[3.12.12]',
      },
      {
        name: 'size',
        type: 'incremental',
        min: 100,
        step: 50,
        max: 1000,
        default: 550,
      },
      {
        name: 'small',
        display: 'Small Box',
        type: 'toggle',
        default: false,
      },
      {
        name: 'clip',
        display: 'Only ngons in bbox',
        type: 'toggle',
        default: false,
      },
      {
        name: 'filterShort',
        display: 'Remove short curves',
        type: 'toggle',
        default: true,
      },
      {
        name: 'notches',
        type: 'radioButton',
        choices: [
          { value: 1, display: '1' },
          { value: 2, display: '2' },
        ],
        default: 1,
      },
    ],
    (template) => {
      // let bbox = template.bbox.withPadding(1500)
      console.log('template', template)
      let bbox = template.bbox
      let notches = [0.8, 0.5, 0.2]
      let initialRandom = new Random(template.seed)
      let seeds = [0, 1, 2].map((seed) => new Random(initialRandom.int(10000000)))
      let layers = [0, 1, 2]
        .map((seed) =>
          generateTruchetGrid(template.tilingFaces, [notches[seed]], template.size, (face) => {
            return {
              n: seeds[seed].int(1289904147324),
            }
          }),
        )
        .map(({ continuousCurves, closedCurves, faces }) => {
          template.filterShort = false // for debug only
          template.filterPerimeter = false // for debug only
          if (template.filterShort) {
            closedCurves = closedCurves.filter((curve) => curve.curve.curve.curves.length > 10)
          }

          closedCurves = closedCurves.map((curve) => curve.clip(bbox)).flat()
          if (template.filterPerimeter) {
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
      console.log('scene layers', layers)
      for (let layer of layers) {
        if (layer.closedCurves.some((c) => !c.curve.curve.isContinousDebug())) {
          throw `TricolorFillTiling has noncontinuous fill curves`
        }
      }
      const spacing = 30
      return {
        edges: {
          curves: vertexListsToLines(template.grid.faces.map((face) => face.ngon.vertices)),
        },
        'fill-yellow': {
          curves: layers[0].closedCurves.map((curve) => curve.boundaryCurve()).flat(), //layers[0].continuousCurves,
          fill: {
            curves: layers[0].closedCurves,
            direction: 20,
            spacing,
          },
          dontOptimize: true,
        },
        'fill-cyan': {
          curves: layers[1].closedCurves.map((curve) => curve.boundaryCurve()).flat(), //curves: layers[1].continuousCurves,
          fill: {
            curves: layers[1].closedCurves,
            direction: 80,
            spacing,
          },
          dontOptimize: true,
        },
        'fill-magenta': {
          curves: layers[2].closedCurves.map((curve) => curve.boundaryCurve()).flat(), // curves: layers[2].continuousCurves,
          fill: {
            curves: layers[2].closedCurves,
            direction: 140,
            spacing,
          },
          dontOptimize: true,
        },
      }
    },
  )
  .withPens({
    edges: { pen: pens.CrayolaSuperTips, color: 'black' },
    'fill-yellow': { pen: pens.Micron08, color: 'hsl(42, 100%, 40%)' },
    'fill-cyan': { pen: pens.Micron08, color: 'hsl(208, 80%, 32%)' },
    'fill-magenta': { pen: pens.Micron08, color: 'hsl(330, 80%, 60%)' },
  })

const scenes = {
  Tiling,
  TricolorFillTiling,
  TricolorThicknessFillTiling,
}

export { Tiling, TricolorFillTiling, TricolorThicknessFillTiling }
