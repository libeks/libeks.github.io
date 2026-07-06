// class MetaVal {
//   constructor(obj) {
//     this.obj = obj
//     // for (let key of Objects.keys(obj)) {
//     //   if ('reverse' in obj[key]) {
//     //     this.obj[key] = {}
//     //   }
//     // }
//   }

//   get(val) {}
// }

// CatalanFragment is a wrapper around a line, with extra information to help position it among other curves, and get directionality
class MetaFragment {
  constructor(curve) {
    if (
      !['StraightStroke', 'QuadraticBezier', 'CubicBezier', 'CompositeCurve'].includes(curve.type)
    ) {
      throw `MetaFragment got unexpected argument ${curve.type}`
    }
    this.curve = curve
    this.meta = {}
    this.reversers = {}
    this.type = 'MetaFragment'
  }

  // merge data into the meta object
  withMeta(...args) {
    let meta
    let reversers = {}
    if (args.length == 0) {
      // console.log('returning early')
      return this
    }
    meta = args[0]
    if (args.length > 1) {
      reversers = args[1]
    }
    for (let key of Object.keys(meta)) {
      this.meta[key] = meta[key]
    }
    for (let key of Object.keys(reversers)) {
      this.reversers[key] = reversers[key]
    }
    return this
  }

  d() {
    return this.curve.d()
  }

  repr() {
    if (Object.keys(this.meta) == 0) {
      return `new MetaFragment(${this.curve.repr()})`
    }
    let metaStr = Object.entires(this.meta)
      .map(([key, value]) => `'${key}': ${value}`)
      .join(', ')
    return `new MetaFragment(${this.curve.repr()}).withMeta({${metaStr}})`
  }

  // get meta() {
  //   throw `MetaFragment.meta should not be accessed directly, use getMeta(key) instead`
  // }

  // getMeta(key) {
  //   if (!(key in Object.keys(this.meta))) {
  //     return undefined
  //   }
  //   return this._meta[key].value
  // }

  contour() {
    return this.curve.contour()
  }

  startpoint() {
    return this.curve.startpoint()
  }

  endpoint() {
    return this.curve.endpoint()
  }

  dContinued() {
    return this.curve.dContinued()
  }

  bbox() {
    return this.curve.bbox()
  }

  intersectLineU(line) {
    return this.curve.intersectLineU(line)
  }

  at(t) {
    return this.curve.at(t)
  }

  length() {
    return this.curve.length()
  }

  tangentAt(t) {
    // console.log('this.curve', this.curve)
    return this.curve.tangentAt(t)
  }

  reverse() {
    let meta = new MetaFragment(this.curve.reverse())
    if (Object.keys(this.meta).length > 0) {
      let newMeta = {}
      for (let [key, value] of Object.entries(this.meta)) {
        if (key in this.reversers) {
          value = this.reversers[key](value)
        }
        newMeta[key] = value
      }
      // console.log('meta', Object.entries(this.meta), newMeta)
      meta = meta.withMeta(newMeta, this.reversers)
    }
    if (Object.keys(meta.meta).length != Object.keys(this.meta).length) {
      throw `MetaFragment.reverse fucked up meta parameters`
    }
    // console.log('returning reversed meta curve', meta)

    return meta
  }

  clip(bbox) {
    // inherit the meta parameters from the parent without modification
    // console.log('clipping MetaFragment')
    return this.curve
      .clip(bbox)
      .map((curve) => new MetaFragment(curve).withMeta(this.meta, this.reversers))
  }
}

// class Reversible {
//   constructor(value, reverseFn) {
//     this.value = value
//     this.reverseFn = reverseFn
//   }

//   get() {
//     return this.value
//   }

//   reverse() {
//     return new Reversible(this.reverseFn(this.value), this.reverseFn)
//   }
// }

export { MetaFragment }
