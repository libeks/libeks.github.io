import { rootedTree } from '/js/catalan-structures.js'
import { BBox } from '/js/bbox.js'
import { genericTruchetGrid, generateTruchetGrid } from '/js/regular-truchet.js'
import { Point } from '/js/geometry.js'
import { pairs, circularPairs } from '/js/utils.js'
import { StraightStroke } from '/js/lines.js'
import { Random } from '/js/random.js'

import {
  regularTilings,
  semiregularTilings,
  uniform2Tilings,
  uniform3Tilings,
  uniform4Tilings,
} from '/js/grid.js'

import { Scene } from '/js/plotter/scene.js'
import { pens } from '/js/plotter/pens.js'

// a list of all the scenes available for plotting
const Empty = new Scene('Empty')

const PlaneTree = new Scene('PlaneTree')
  .withTemplate(
    rootedTree,
    (bbox) => ({
      bbox: bbox,
      tile: '((()((()))()()))(())',
    }),
    [],
  )
  .withLayers((template) => {
    return {
      edges: {
        curves: template.edges.map((edge) => edge.line),
        color: 'blue',
      },
    }
  })

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

const Tiling = new Scene('TruchetTiling')
  .withTemplate(
    genericTruchetGrid,
    (bbox, { size, pattern, notch1, notch2, notches, padding }) => {
      // let
      return {
        // bbox: bbox.withPadding(1000),
        // bbox: padding ? bbox.withPadding(size * 3.3) : bbox,
        bbox,
        start: bbox.center(),
        size,
        pattern,
        notches: notches == 1 ? [notch1] : [notch1, notch2],
        onlyNgonsInsideBBox: true,
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
        ].map((tiling) => ({ name: tiling.string(), value: tiling })),
        default: uniform4Tilings[5],
      },
      {
        name: 'size',
        type: 'incremental',
        min: 100,
        step: 50,
        max: 1000,
        default: 400,
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
        default: 1,
      },
      {
        name: 'padding',
        default: 1000,
      },
    ],
  )
  .withLayers((template) => ({
    edges: {
      curves: vertexListsToLines(template.grid.map((face) => face.ngon.vertices)),
      color: 'black',
      pen: pens.CrayolaSuperTips,
      // dontOptimize: true,
    },
    curve: {
      curves: template.continuousTruchetCurves,
      color: 'blue',
      pen: pens.CrayolaSuperTips,
      // dontOptimize: true,
    },
  }))

const TricolorFillTiling = new Scene('TricolorFillTruchetTiling')
  .withTemplate(
    genericTruchetGrid,
    (bbox, { size, small, pattern, notch1, notch2, notches, clip }) => {
      // let
      return {
        bbox: small ? bbox.withPadding(1000) : bbox,
        start: bbox.center(),
        size,
        pattern,
        notches: notches == 1 ? [notch1] : [notch1, notch2],
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
        ].map((tiling) => ({ name: tiling.string(), value: tiling })),
        default: semiregularTilings[0],
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
        default: 1,
      },
    ],
  )
  .withLayers((template) => {
    // let bbox = template.bbox.withPadding(1500)
    let bbox = template.bbox
    let layers = [0, 1, 2]
      .map((seed) =>
        generateTruchetGrid(
          template.tilingFaces,
          new Random(seed),
          template.notches,
          template.size,
        ),
      )
      .map(({ continuousCurves, closedCurves, faces }) => ({
        continuousCurves: continuousCurves.map((curve) => curve.clip(bbox)).flat(),
        closedCurves: closedCurves.map((curve) => curve.clip(bbox)).flat(),
        // faces can be ignored, they're not rendered
        // faces: faces, //.map((face) => face.clip(bbox)),
      }))
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
        color: 'black',
        pen: pens.CrayolaSuperTips,
      },
      'fill-yellow': {
        curves: layers[0].continuousCurves,
        fill: {
          curves: layers[0].closedCurves,
          direction: 20,
          spacing,
        },
        color: 'hsl(42, 100%, 40%)', // '#C0A870', 'yellow'
        pen: pens.CrayolaSuperTips,
        dontOptimize: true,
      },
      'fill-cyan': {
        curves: layers[1].continuousCurves,
        fill: {
          curves: layers[1].closedCurves,
          direction: 80,
          spacing,
        },
        color: 'hsl(208, 80%, 32%)', //'#976f83', 'cyan'
        pen: pens.CrayolaSuperTips,
        dontOptimize: true,
      },
      'fill-magenta': {
        curves: layers[2].continuousCurves,
        fill: {
          curves: layers[2].closedCurves,
          direction: 140,
          spacing,
        },
        color: 'hsl(330, 80%, 60%)', //'#386287', 'magenta'
        pen: pens.CrayolaSuperTips,
        dontOptimize: true,
      },
    }
  })

const scenes = {
  PlaneTree,
  Tiling,
  TricolorFillTiling,
  Empty, // used for debugging
}

export { scenes, PlaneTree, Tiling, TricolorFillTiling, Empty }
