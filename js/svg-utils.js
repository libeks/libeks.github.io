import { Point, Vector } from '/js/geometry.js'
import { CompositeCurve, CubicBezier, QuadraticBezier, StraightStroke } from '/js/lines.js'

// toTransform takes an object of x,y, and optional rotate values, and returns the string to pass into :style
function toTransform(offsetVect) {
  if (offsetVect.rotate) {
    return {
      transform: `translate(${offsetVect.x}px,${offsetVect.y}px) rotate(${offsetVect.rotate}deg)`,
    }
  }
  return {
    transform: `translate(${offsetVect.x}px,${offsetVect.y}px)`,
  }
}

// given a path d string, return an equivalent sequence of CompositeCurve notation
// M 378.1384757729337 168.03847577293362 C 378.13847577293376 156.4337353622221 397.9384757729337 156.43373536222214 397.93847577293366 168.03847577293362
// CubicBezier(new Point(378.1384757729337, 168.03847577293362), new Point(378.13847577293376, 156.4337353622221), new Point(397.9384757729337, 156.43373536222214), new Point(397.93847577293366 168.03847577293362) )
function dToLines(pathStr) {
  let chunks = pathStr.split(' ')
  let tokens = []
  for (let i = 0; i < chunks.length; i++) {
    let chunk = chunks[i]
    if (['M', 'C', 'Q'].includes(chunk)) {
      tokens.push(chunk)
    } else {
      // get two chunks
      let numerical = [chunks[i], chunks[i + 1]]
      i += 1
      let floats = numerical.map((chunk) => parseFloat(chunk))
      let point = new Point(floats[0], floats[1])
      tokens.push(point)
    }
  }
  let endpoint
  let components = []
  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i]
    if (token == 'M') {
      endpoint = tokens[i + 1]
      i += 1
    } else if (token == 'L') {
      components.push(new StraightStroke(endpoint, tokens[i + 1]))
      endpoint = tokens[i + 1]
      i += 1
    } else if (token == 'Q') {
      components.push(new QuadraticBezier(endpoint, tokens[i + 1], tokens[i + 2]))
      endpoint = tokens[i + 2]
      i += 2
    } else if (token == 'C') {
      components.push(new CubicBezier(endpoint, tokens[i + 1], tokens[i + 2], tokens[i + 3]))
      endpoint = tokens[i + 3]
      i += 3
    } else {
      throw `dToLines got unexpected token ${token}`
    }
  }
  return new CompositeCurve(...components)
}

export { toTransform, dToLines }
