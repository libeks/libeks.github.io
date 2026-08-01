// import { dummyFont } from '/js/text/fonts/dummy.js'
import { pairs } from '/js/utils.js'
import { Point, Vector } from '/js/geometry.js'
import { BBox, composeBBoxes } from '/js/bbox.js'
import { ClosedCurve } from '/js/lines/closed-curve.js'
import { compositeQuadraticBezier, nestClosedCurves } from '/js/lines.js'
import { palatinoFontRaw } from '/js/text/fonts/palatino.js'

// a file that exports all of the available fonts

let rawFonts = {
  palatinoFontRaw,
}

class RenderedCharacter {
  constructor(contours, char, size, position) {
    this.contours = contours
    this.char = char
    this.size = size
    this.position = position // the point where the character is 'rendered'
    this.type = 'RenderedCharacter'
  }

  get closedCurves() {
    return this.contours
  }

  get bbox() {
    if (this.contours.length == 0) {
      return new BBox(0, 0, 0, 0) // the ' ' character can have no contours
    }
    if (this.contours.length == 1) {
      return this.contours[0].bbox()
    }
    return composeBBoxes(this.contours.map((contour) => contour.bbox()))
  }

  move(v) {
    if (v.type != 'Vector') {
      throw `RenderCharacter.move got unexpected argument ${v.type}`
    }
    return new RenderedCharacter(
      this.contours.map((contour) => contour.move(v)),
      this.char,
      this.size,
      this.position.addVect(v),
    )
  }
}

class RenderedText {
  constructor(characterShapes, text, size) {
    for (let shape of characterShapes) {
      if (shape.type != 'RenderedCharacter') {
        throw `RenderedText received a character of unexpected type ${shape.type}`
      }
    }
    this.characters = characterShapes
    this.text = text
    this.size = size
    this.type = 'RenderedText'
  }

  get closedCurves() {
    return this.characters.map((char) => char.closedCurves).flat()
  }

  get bboxes() {
    return this.characters.map((char) => char.bbox)
  }

  get bbox() {
    return composeBBoxes(this.bboxes)
  }

  move(v) {
    if (v.type != 'Vector') {
      throw `RenderText.move got unexpected argument ${v.type}`
    }
    return new RenderedText(
      this.characters.map((char) => char.move(v)),
      this.text,
      this.size,
    )
  }
}

class GlyphShape {
  constructor(char, contourPoints, size) {
    this.char = char
    this.contourPoints = contourPoints
    this.size = size
    this.type = 'GlyphShape'
  }

  // render this abstract glyph onto the page at a specific size, at the origin
  render(size) {
    let sizeRatio = size / this.size // how much to scale the coordinates by

    // let contours = shapeMap[key]
    let convertedContours = []
    for (let contour of this.contourPoints) {
      let annotatedPoints = contour.map(([x, y, onCurve]) => ({
        point: new Point(sizeRatio * x, sizeRatio * y), // scale by size ratio
        onCurve: onCurve == 1, // the input is an int 0/1, we translate to boolean
      }))
      if (annotatedPoints.length > 0) {
        // add first point in back as the last point, to close the curve
        annotatedPoints.push(annotatedPoints[0])
      }
      let convertedContour = new ClosedCurve(compositeQuadraticBezier(...annotatedPoints))
      convertedContours.push(convertedContour)
    }
    let ret = new RenderedCharacter(
      nestClosedCurves(convertedContours),
      this.char,
      size,
      new Point(0, 0),
    )
    console.log('Rendering GlyphShape', this, 'got', ret)
    return ret
  }
}

class Font {
  constructor({ name, shapes, hints, advances, size }) {
    this.name = name
    this.shapes = convertShapeMap(shapes, size)
    this.kerning = hints
    this.advances = advances
    this.size = size
    this.type = 'Font'
  }

  // renders the given text at Point(0,0) at the given size
  // FIXME: size is currently ignored
  renderText(text, size) {
    // console.log('text', text)
    let sizeRatio = size / this.size
    let characters = []
    let xPosition = 0
    for (let [c1, c2] of pairs([...text, ''])) {
      // add right padding to make sure every character is rendered
      if (!(c1 in this.shapes)) {
        throw `Font ${this.name} doesn't have a character shape for '${c1}'`
      }
      let glyph = this.shapes[c1]
      let renderedCharacter = glyph.render(size)
      // console.log('shape', charShapes)
      // charShapes = charShapes.map((shape) => shape.move(new Vector(xPosition, 0))) // move character to the right by xPosition
      renderedCharacter = renderedCharacter.move(new Vector(xPosition, 0))
      characters.push(renderedCharacter)
      xPosition += this.advances[c1] * sizeRatio
      if (c1 + c2 in this.kerning) {
        xPosition += this.kerning[c1 + c2] * sizeRatio
      }
    }
    return new RenderedText(characters, text, size)
  }
}

// // given a shape map in input format (rune: [][]PointOnLine), return a native rune: ClosedCurveWithMinus representation
// function convertShapeMap(shapeMap) {
//   let newMap = {}
//   for (let key of Object.keys(shapeMap)) {
//     console.log('Converting character', key)
//     let contours = shapeMap[key]
//     let convertedContours = []
//     for (let contour of contours) {
//       let annotatedPoints = contour.map(([x, y, onCurve]) => ({
//         point: new Point(x, y),
//         onCurve: onCurve == 1, // the input is an int 0/1, we translate to boolean
//       }))
//       if (annotatedPoints.length > 0) {
//         // add first point in back as the last point, to close the curve
//         annotatedPoints.push(annotatedPoints[0])
//       }
//       let convertedContour = new ClosedCurve(compositeQuadraticBezier(...annotatedPoints))
//       convertedContours.push(convertedContour)
//     }
//     let character = nestClosedCurves(convertedContours)
//     newMap[key] = character
//   }
//   return newMap
// }

function convertShapeMap(shapeMap, size) {
  let newMap = {}
  for (let key of Object.keys(shapeMap)) {
    let shape = shapeMap[key]
    newMap[key] = new GlyphShape(key, shape, size)
  }
  return newMap
}

const palatinoFont = new Font(palatinoFontRaw)

const fonts = {
  palatinoFont,
}

export { Font, fonts, palatinoFont }
