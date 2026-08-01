import { ClosedCurve, ClosedCurveWithMinus, nestClosedCurves } from '/js/lines.js'

class Font {
  constructor(name, shapeMap, hints) {
    this.name = name
    this.shapeMap = shapeMap
    this.hints = hints
    this.type = 'Font'
  }

  renderText(text, size) {}
}

// given a shape map in input format (rune: [][]PointOnLine), return a native rune: ClosedCurveWithMinus representation
function convertShapeMap(shapeMap) {
  let newMap = {}
  for (let key of Object.keys(shapeMap)) {
    let contours = shapeMap[key]
    let convertedContours = []
    for (let contour of contours) {
      let convertedContour = new ClosedCurve(
        contour.map(([x, y, onCurve]) => {
          point: (new Point(x, y), onCurve)
        }),
      )
      convertedContours.push(convertedContour)
    }
    let character = nestClosedCurves(convertedContours)
    newMap[key] = character
  }
  return newMap
}

// render the given text in the given font at the given size.
// Returns an array of ClosedCurveWithMinus (each character mapping to an element),
// the bbox of which starts at the origin
function renderText(font, text, size) {
  if (font.type != 'Font') {
    throw `renderText got unexpected font argument ${font.type}`
  }
}
