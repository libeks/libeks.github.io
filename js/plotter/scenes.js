import { rootedTree } from '/js/catalan-structures.js'
import { BBox } from '/js/bbox.js'
import { genericTruchetGrid } from '/js/regular-truchet.js'
import { Point } from '/js/geometry.js'

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

const Tiling = new Scene('TruchetTiling')
  .withTemplate(
    genericTruchetGrid,
    (bbox, { size, pattern, notch1, notch2, notches, padding }) => {
      // let
      return {
        // bbox: bbox.withPadding(1000),
        bbox: padding ? bbox.withPadding(size * 3.3) : bbox,
        start: bbox.center(),
        size,
        pattern,
        notches: notches == 1 ? [notch1] : [notch1, notch2],
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
        min: 300,
        step: 20,
        max: 1000,
        default: 300,
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
      curves: template.grid.map((face) => face.ngon.face.straightStrokes).flat(),
      color: 'black',
      pen: pens.CrayolaSuperTips,
    },
    curve: {
      curves: template.continuousTruchetCurves,
      color: 'blue',
      pen: pens.CrayolaSuperTips,
    },
  }))

const scenes = {
  PlaneTree,
  Tiling,
  Empty, // used for debugging
}

export { scenes, PlaneTree, Tiling, Empty }
