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

const PlaneTree = new Scene()
  .withTemplate(rootedTree, (bbox) => ({
    bbox: bbox,
    tile: '((()((()))()()))(())',
  }))
  .withLayers((template) => {
    return {
      edges: {
        curves: template.edges.map((edge) => edge.line),
        color: 'blue',
      },
    }
  })

const Tiling = new Scene()
  .withTemplate(
    genericTruchetGrid,
    (bbox, { size, pattern }) => ({
      bbox: bbox.withPadding(1000),
      // bbox,
      start: bbox.center(),
      // size: 300,
      size,
      // pattern: uniform4Tilings[5],
      pattern,
      notches: [0.33],
    }),
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
}

export { scenes, PlaneTree, Tiling }
