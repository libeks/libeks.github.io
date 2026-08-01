import { BBox } from '/js/bbox.js'
import { Point } from '/js/geometry.js'
import { pairs, circularPairs } from '/js/utils.js'
import { StraightStroke } from '/js/lines.js'
import { Random } from '/js/random.js'

import { rootedTree } from '/js/catalan-structures.js'

import {
  Tiling,
  TricolorFillTiling,
  TricolorThicknessFillTiling,
} from '/js/plotter/scenes/truchet.js'
import { TextTest } from '/js/plotter/scenes/text.js'

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

const scenes = {
  PlaneTree,
  Tiling,
  TricolorFillTiling,
  TricolorThicknessFillTiling,
  TextTest,
  Empty, // used for debugging
}

export {
  scenes,
  PlaneTree,
  Tiling,
  TricolorFillTiling,
  TricolorThicknessFillTiling,
  TextTest,
  Empty, // used for debugging
}
