function memoize(func) {
  // adapted from https://dev.to/jeremydmarx813/create-a-memoized-function-in-javascript-43pi
  const cache = {}
  return (...args) => {
    let strKey = args.join(',')
    if (!cache[strKey]) {
      cache[strKey] = func.apply(this, args)
    }
    return cache[strKey]
  }
}

export { memoize }
