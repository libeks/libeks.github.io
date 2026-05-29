// import { compile } from '/js/vue.js'
import '/js/vue.js'

function applyTemplate(template, parameters) {
  let obj = { __cached__: {} }
  if (template.props) {
    for (let [prop, typeDefault] of Object.entries(template.props)) {
      if (!(prop in parameters)) {
        console.warn(`Using default value for prop ${prop}`)
        console.log('typeDefault', typeDefault)
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
  // console.log('template after application', template)
  return obj
}

class Scene {
  constructor() {
    this.layers = []
    this.template = null
  }

  withTemplate(template, parameterFn) {
    this.rawTemplate = template
    this.parameterFn = parameterFn
    return this
  }

  withLayers(layerFn) {
    this.layerFn = layerFn
    return this
  }

  place(bbox) {
    this.parameters = this.parameterFn(bbox)
    this.template = applyTemplate(this.rawTemplate, this.parameters)
    this.layers = this.layerFn(this.template)
    return this
  }
}

export { Scene }
