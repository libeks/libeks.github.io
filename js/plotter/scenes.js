import { rootedTree } from '/js/catalan-structures.js'
import { BBox } from '/js/bbox.js'
import { genericTruchetGrid } from '/js/regular-truchet.js'
import { Point } from '/js/geometry.js'

import { uniform4Tilings } from '/js/grid.js'

import { Scene } from '/js/plotter/scene.js'

// a list of all the scenes available for plotting

const PlaneTree = new Scene()
  .withTemplate(rootedTree, (bbox) => ({
    bbox: bbox,
    tile: '((()((()))()()))(())',
  }))
  .withLayers((template) => {
    return {
      edges: template.edges.map((edge) => edge.line),
    }
  })

const Tiling = new Scene()
  .withTemplate(genericTruchetGrid, (bbox) => ({
    bbox,
    start: bbox.center(),
    size: 300,
    pattern: uniform4Tilings[7],
    notches: [0.33],
  }))
  .withLayers((template) => ({
    edges: template.grid.map((face) => face.ngon.face),
    curve: template.grid.map((face) => face.tile.getCatalanTile({ n: face.n })).flat(),
  }))

const scenes = {
  PlaneTree,
  Tiling,
}

export { scenes, PlaneTree, Tiling }
