// import { compile } from '/js/vue.js'
import '/js/vue.js'

function applyTemplate(template, parameters) {
  let obj = { __cached__: {} }
  if (template.props) {
    // console.log('template.props', template.props)
    for (let [prop, typeDefault] of Object.entries(template.props)) {
      // console.log('prop', prop, typeDefault, typeDefault())
      if (!(prop in parameters)) {
        obj[prop] = typeDefault()
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

  withTemplate(template, parameters) {
    this.template = applyTemplate(template, parameters)
    return this
  }

  withLayers(layerFn) {
    this.layers = layerFn(this.template)
    return this
  }
}

export { Scene }
