import { ClosedCurve, ClosedCurveWithMinus, nestClosedCurves } from '/js/lines.js'

// render text is a helper method to render text with a given font and size, rendered to the origin point
// it may need to be moved later
function renderText(font, text, size) {
  console.log('renderFont', font, text, size)
  if (font.type != 'Font') {
    throw `renderText got unexpected font argument ${font.type}`
  }
  return font.renderText(text, size)
}

export { renderText }
