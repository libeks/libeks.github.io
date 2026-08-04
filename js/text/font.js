// import { dummyFont } from '/js/text/fonts/dummy.js'
import { pairs } from '/js/utils.js'
import { Point, Vector } from '/js/geometry.js'
import { BBox, composeBBoxes } from '/js/bbox.js'
import { ClosedCurve } from '/js/lines/closed-curve.js'
import { compositeQuadraticBezier, nestClosedCurves } from '/js/lines.js'

const useLigatures = true

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

  outlines() {
    return this.closedCurves
      .map((curve) => curve.allComponents().map((curve) => curve.curve))
      .flat()
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
    return ret
  }
}

class Font {
  constructor({ name, familyname, shapes, hints, advances, size, leftBearings, ligatures }) {
    this.name = name
    this.familyname = familyname
    try {
      this.shapes = convertShapeMap(shapes, size)
    } catch (err) {
      throw `Font ${name} is missing a character: ${err}`
    }
    this.kerning = hints
    this.advances = advances
    this.leftBearings = leftBearings
    this.size = size
    this.ligatures = Object.fromEntries(ligatures.map((lig) => [lig, true]))
    if (ligatures.length > 0) {
      console.log(`font ${this.name} as ligatures`, ligatures)
    }
    this.type = 'Font'
  }

  // renders the given text at Point(0,0) at the given size
  renderText(text, size) {
    let sizeRatio = size / this.size
    let characters = []
    let xPosition = 0
    if (useLigatures) {
      let textList = []
      let skip = false
      for (let [c1, c2] of pairs([...text, ''])) {
        if (skip) {
          // need to skip a character, it has already been added as part of a ligature
          skip = false
          continue
        }
        let candidate = c1 + c2
        if (candidate in this.ligatures) {
          textList.push(candidate)
          skip = true
        } else {
          textList.push(c1)
        }
      }
      text = textList
      // console.log('rendering text', text)
    }
    for (let [c1, c2] of pairs([...text, ''])) {
      // add right padding to make sure every character is rendered
      if (!(c1 in this.shapes)) {
        throw `Font ${this.name} doesn't have a character shape for '${c1}'`
      }
      let glyph = this.shapes[c1]
      let renderedCharacter = glyph.render(size)
      // let leftBearing = this.leftBearings[c1] ? this.leftBearings[c1] : 0
      let leftBearing = 0
      renderedCharacter = renderedCharacter.move(new Vector(xPosition - leftBearing, 0))
      characters.push(renderedCharacter)
      xPosition += this.advances[c1] * sizeRatio
      if (c1 + c2 in this.kerning) {
        xPosition += this.kerning[c1 + c2] * sizeRatio
      }
    }
    return new RenderedText(characters, text, size)
  }
}

function convertShapeMap(shapeMap, size) {
  let newMap = {}
  for (let key of Object.keys(shapeMap)) {
    let shape = shapeMap[key]
    if (shape.length == 0 && key != ' ') {
      throw `character '${key}' is empty!`
    }
    newMap[key] = new GlyphShape(key, shape, size)
  }
  return newMap
}

export { Font }
