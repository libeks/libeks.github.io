import { ClosedCurve, ClosedCurveWithMinus, nestClosedCurves } from '/js/lines.js'

// render text is a helper method to render text with a given font and size, rendered to the origin point
// it may need to be moved later
function renderText(font, text, size) {
  if (font.type != 'Font') {
    console.warn('font', font)
    throw `renderText got unexpected font argument ${font.type}`
  }
  return font.renderText(text, size)
}

const svgText = {
  template: `
  <g>
    <path 
      v-for="curve in curves" 
      :d="curve.d()" 
      stroke="black" 
      fill="none"
      
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
    // align: String, // left, center, right
  },
  computed: {
    curves() {
      let curves = renderText(this.font, this.text, this.size)
      let bbox = curves.bbox
      let displacement
      // if (this.align == 'left') {
      //   displacement =
      // }
      displacement = bbox.center().vectTo(this.bbox.center())
      curves = curves.move(displacement)
      return curves.outlines()
    },
  },
}

export { renderText, svgText }
