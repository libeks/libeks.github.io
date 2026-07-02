// consts used as kill switches for debugging
const clipToBBox = true
const fill = true

function applyTemplate(template, parameters) {
  let obj = { __cached__: {} }
  if (template.props) {
    for (let [prop, typeDefault] of Object.entries(template.props)) {
      if (!(prop in parameters)) {
        console.warn(`Using default value for prop ${prop}`)
        if ('default' in typeDefault) {
          obj[prop] = typeDefault.default
        } else {
          obj[prop] = typeDefault()
        }
      } else {
        obj[prop] = parameters[prop]
      }
    }
  }
  if (template.computed) {
    for (let [name, value] of Object.entries(template.computed)) {
      Object.defineProperty(obj, name, {
        get() {
          if (name in obj['__cached__']) {
            return obj['__cached__'][name]
          }
          let val = template.computed[name].bind(obj)()
          obj['__cached__'][name] = val
          return obj['__cached__'][name]
        },
      })
    }
  }
  return obj
}

class Scene {
  constructor(name) {
    this.name = name
    this.layers = []
    this.rawTemplate = {}
    this.parameterFn = (bbox) => {}
    this.layerFn = (template) => []

    this.options = []
    this.configs = {}
  }

  withTemplate(template, parameterFn, options) {
    this.rawTemplate = template
    this.parameterFn = parameterFn
    this.options = options

    for (let option of options) {
      this.configs[option.name] = option.default
    }
    return this
  }

  withLayers(layerFn) {
    this.layerFn = layerFn
    return this
  }

  place(bbox, options) {
    this.parameters = this.parameterFn(bbox, options)
    this.template = applyTemplate(this.rawTemplate, this.parameters)
    let layers = this.layerFn(this.template)
    if (clipToBBox) {
      let newLayers = {}
      for (let [name, layer] of Object.entries(layers)) {
        if (!('curves' in layer)) {
          layer.curves = []
        }
        let curves = []
        let fill = []

        // if (layer.fill) {
        //   console.log(
        //     'fill curve continuous before',
        //     layer.fill.curves.map((curve) => curve.curve.curve.isContinousDebug()),
        //   )
        // }
        if (clipToBBox) {
          // console.log('bbox', bbox)
          for (let curve of layer.curves) {
            let clipped = curve.clip(bbox)
            // console.log('clipping of ', curve, 'got', clipped)
            if (
              layer.fill &&
              layer.fill.curves.some((curve) => !curve.curve.curve.isContinousDebug())
            ) {
              throw `fill curve became non-continuous`
            }
            curves.push(...clipped)
          }
          // console.log('setting layer', name, 'to have curves', curves)
          layer.curves = curves
          if (layer.fill) {
            // console.log(
            //   'fill curve continuous after',
            //   layer.fill.curves.map(
            //     (curve) =>
            //       curve.curve.curve.isContinousDebug() &&
            //       curve.minus.every((c) => c.curve.curve.isContinousDebug()),
            //   ),
            //   layer.fill.curves.map((curve) => curve.curve.curve.isContinousDebug()),
            // )
            let c = layer.fill.curves[3]
            // console.log('curves[3]', c.curve.curve.isContinousDebug(), c)
            for (let curve of layer.fill.curves) {
              // console.log('fill curve continuous', curve.curve.curve.isContinousDebug())
              if (!curve.curve.curve.isContinousDebug()) {
                // console.log('curve', curve)
                console.trace()
                throw `fill layer has a non-continuous curve`
              }
              let clipped = curve.clip(bbox)
              fill.push(...clipped)
            }
            layer.fill.curves = fill
          }
        }
      }
    }
    this.layers = layers
    if (fill) {
      this.fill()
    }
    return this
  }

  fill() {
    console.log('filling...')
    for (let layer of Object.values(this.layers)) {
      if (layer.fill && layer.fill.curves.length > 0) {
        let spacing = 20
        if (layer.fill.spacing) {
          spacing = layer.fill.spacing
        }
        let direction = 13
        if (layer.fill.direction) {
          direction = layer.fill.direction
        }
        // console.log('curves before fill', layer.curves)
        for (let curve of layer.fill.curves) {
          // console.log('filling curve', curve)

          layer.curves.push(...curve.fill(spacing, direction))
        }
      }
    }
    console.log('done filling')
  }
}

export { Scene }
