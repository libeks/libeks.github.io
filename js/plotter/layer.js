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
    this.curves.push(...curves)
    return this // allow chaining
  }

  withColor(color) {
    this.color = color
    return this
  }
}

export { Layer }
