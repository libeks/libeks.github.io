class StraightStroke {
  constructor(from, to) {
    this.from = from
    this.to = to
  }

  reverse() {
    // return the stroke in reverse order
    return new StraightStroke(this.to, this.from)
  }

  dContinued() {
    // when rendering a sequence of strokes, skip the MOVE operation
    // console.log("dContinued", this.from, this.to)
    return `L ${this.to.string()}`
  }

  d() {
    return `M ${this.from.string()} ${this.dContinued()}`
  }

  move(v) {
    // move the stroke by a vector v
    return new StraightStroke(this.from.addVect(v), this.to.addVect(v))
  }
}

class QuadraticBezier {
  constructor(from, c1, to) {
    this.from = from
    this.c1 = c1
    this.to = to
  }

  reverse() {
    return new QuadraticBezier(this.to, this.c1, this.from)
  }

  dContinued() {
    // when rendering a sequence of strokes, skip the MOVE operation
    return `Q ${this.c1.string()} ${this.to.string()}`
  }

  d() {
    return `M ${this.from.string()} ${this.dContinued()}`
  }

  move(v) {
    // move the stroke by a vector v
    return new QuadraticBezier(this.from.addVect(v), this.c1.addVect(v), this.to.addVect(v))
  }
}

class CubicBezier {
  constructor(from, c1, c2, to) {
    this.from = from
    this.c1 = c1
    this.c2 = c2
    this.to = to
  }

  reverse() {
    return new CubicBezier(this.to, this.c2, this.c1, this.from)
  }

  dContinued() {
    // when rendering a sequence of strokes, skip the MOVE operation
    return `C ${this.c1.string()} ${this.c2.string()} ${this.to.string()}`
  }

  d() {
    return `M ${this.from.string()} ${this.dContinued()}`
  }

  move(v) {
    // move the stroke by a vector v
    return new CubicBezier(
      this.from.addVect(v),
      this.c1.addVect(v),
      this.c2.addVect(v),
      this.to.addVect(v),
    )
  }
}

// class Stroke {
//   constructor(d) {
//     this.d = d;
//   }

//   d() {
//     return this.d;
//   }
// }

export { StraightStroke, QuadraticBezier, CubicBezier }
