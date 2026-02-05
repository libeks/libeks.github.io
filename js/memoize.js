function memoize(func) {
  // adapted from https://dev.to/jeremydmarx813/create-a-memoized-function-in-javascript-43pi
  const cache = {}
  return (...args) => {
    // console.log(cache)
    let strKey = args.join(',')
    if (!cache[strKey]) {
      // console.log('adding to cache!');
      cache[strKey] = func.apply(this, args)
    }
    // console.log('fetching from cache!');
    return cache[strKey]
  }
}

export {memoize}