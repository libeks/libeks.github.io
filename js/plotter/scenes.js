import { rootedTree } from '/js/catalan-structures.js'
import { BBox } from '/js/bbox.js'

import { Scene } from '/js/plotter/scene.js'

// a list of all the scenes available for plotting

const PlaneTree = new Scene()
  .withTemplate(rootedTree, {
    bbox: new BBox(3000, 3000, 7000, 7000),
    tile: '((()((()))()()))(())',
  })
  .withLayers((template) => {
    // console.log('edges', template.edges)
    return {
      edges: template.edges.map((edge) => edge.line),
    }
  })

const scenes = {
  planeTree: PlaneTree,
}

export { PlaneTree }
