import { rootedTree } from '/js/catalan-structures.js'
import { BBox } from '/js/bbox.js'
import { genericTruchetGrid } from '/js/regular-truchet.js'
import { Point } from '/js/geometry.js'

import { uniform4Tilings } from '/js/grid.js'

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
  .withTemplate(genericTruchetGrid, (bbox) => ({
    bbox: bbox.withPadding(1000),
    // bbox,
    start: bbox.center(),
    size: 300,
    pattern: uniform4Tilings[5],
    notches: [0.33],
  }))
  .withLayers((template) => ({
    edges: {
      curves: template.grid.map((face) => face.ngon.face.straightStrokes).flat(),
      color: 'black',
      pen: pens.CrayolaSuperTips,
    },
    curve: {
      // curves: template.grid.map((face) => face.tile.getCatalanTile({ n: face.n })).flat(),
      curves: [template.continuousTruchetCurves[0]],
      // curves: template.continuousTruchetCurves,
      // curves:
      color: 'blue',
      pen: pens.CrayolaSuperTips,
    },
  }))

const scenes = {
  PlaneTree,
  Tiling,
}

export { scenes, PlaneTree, Tiling }
