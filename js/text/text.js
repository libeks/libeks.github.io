import { enumerate } from '/js/utils.js'
import { Vector } from '/js/geometry.js'
import { ClosedCurve, ClosedCurveWithMinus, nestClosedCurves } from '/js/lines.js'
import { RenderedText } from '/js/text/font.js'

// render text is a helper method to render text with a given font and size, rendered to the origin point
// it may need to be moved later
function renderTextLine(font, text, size) {
  if (font.type != 'Font') {
    console.warn('font', font)
    throw `renderText got unexpected font argument ${font.type}`
  }
  return font.renderTextLine(text, size)
}

function renderTextToBBox(font, text, size, bbox, halign, valign) {
  if (font.type != 'Font') {
    console.warn('font', font)
    throw `renderText got unexpected font argument ${font.type}`
  }
  let lines = text.split('\n').map((textLine) => renderTextLine(font, textLine, size))
  let newLines = []
  let height = size * lines.length
  for (let [i, line] of enumerate(lines)) {
    let x, y

    if (halign == 'left') {
      x = 0
    } else if (halign == 'right') {
      x = bbox.width() - line.bbox.width()
    } else if (halign == 'center') {
      x = (bbox.width() - line.bbox.width()) / 2
    } else {
      throw `Invalid halign ${halign}`
    }
    // the y-position has to include the height of the line itself, since the origin is at the bottom left of the line
    if (valign == 'top') {
      y = (i + 1) * size
    } else if (valign == 'bottom') {
      y = (i + 1) * size + bbox.height() - height
    } else if (valign == 'center') {
      y = (i + 1) * size + (bbox.height() - height) / 2
    } else {
      throw `Invalid valign ${valign}`
    }
    newLines.push(line.move(new Vector(x, y)))
  }
  return new RenderedText(newLines, size)
}

const svgText = {
  template: `
  <g>
    <path 
      v-for="curve in curves" 
      :d="curve.d()" 
      :stroke="filled? 'none' : 'black'" 
      :fill="filled ? 'black' : 'none'"
      :stroke-width="width" 
      stroke-opacity="0.6" 
    > </path>
  </g>`,
  props: {
    font: Object,
    text: String,
    size: Number,
    bbox: Object,
    width: {
      type: Number,
      default: 1,
    },
    halign: {
      type: String,
      default: 'center',
    },
    valign: {
      type: String,
      default: 'center',
    },
    filled: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    curves() {
      let curves = renderTextToBBox(
        this.font,
        this.text,
        this.size,
        this.bbox,
        this.halign,
        this.valign,
      )
      if (this.filled) {
        return curves.closedCurves
      }
      return curves.outlines()
    },
  },
}

export { renderTextLine, renderTextToBBox, svgText }
