class Layer {
  constructor(name) {
    this.name = name
    this.curves = []
    this.drawGuides = false
    this.color = 'black'
  }

  withGuides() {
    this.drawGuides = true
    return this // allow chaining
  }

  withCurves(...curves) {
    // check that each curve can be rendered, i.e. it has a '.d()' method
    for (let curve of curves) {
      if (!('d' in curve)) {
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
}

export { Layer }
