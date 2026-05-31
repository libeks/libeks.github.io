import { pens } from '/js/plotter/pens.js'

class Layer {
  constructor(name) {
    this.name = name
    this.curves = []
    this.drawGuides = false
    this.color = 'black'
    this.pen = pens.Micron005
  }

  withGuides() {
    this.drawGuides = true
    return this // allow chaining
  }

  withCurves(curves) {
    // check that each curve can be rendered, i.e. it has a '.d()' method
    // console.log('withCurves', curves.length)
    for (let curve of curves) {
      if (!('d' in curve)) {
        console.error('Layer.withCurves passed object without a .d method', curve)
        throw `Curve in layer cannot be rendered`
      }
    }
    this.curves.push(...curves)
    return this // allow chaining
  }

  withColor(color) {
    this.color = color
    return this // allow chaining
  }

  withPen(pen) {
    if (pen.type != 'Pen') {
      throw `Layer.withPen got unexpected argument ${pen.type}`
    }
    this.pen = pen
    return this // allow chaining
  }

  // the transform property of the <g> element, to position the pen correctly relative to the comb
  transform() {
    return `translate(${this.pen.xOffset} ${this.pen.yOffset})`
  }
}

export { Layer }
