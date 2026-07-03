const THRESHOLD = 0.01
const THRESHOLD_FINE = 1e-8 // used for quadratic formula a parameter

function reverseInterpolate(a, b, threshold) {
  if (a == b) {
    return 0.5
  }
  // make sure a<=b
  if (a > b) {
    return 1 - reverseInterpolate(b, a, threshold)
  }
  const interval = b - a
  return (threshold - a) / interval
}

function degToRad(deg) {
  return (deg * Math.PI) / 180
}

function radToDeg(rad) {
  return (rad * 180) / Math.PI
}

function closeEnough(a, b) {
  return Math.abs(a - b) < THRESHOLD
}

// ensures that the radian angle is between 0 and 2*pi
function normalizeRadians(radians) {
  if (radians < 0) {
    return radians + 2 * Math.PI
  }
  let retval = radians % (2 * Math.PI)
  return retval
}

// output a canonical string key for a radian value, such that angles that are close enough map to the same key
// this implemetation uses a conversion to degrees with 0.1 degree accuracy
function normalizeRadianString(radians) {
  radians = normalizeRadians(radians)
  let degrees = radToDeg(radians)
  let rounded = Math.round(degrees)
  if (rounded == 360) {
    return 0
  }
  return rounded
  // let str = degrees.toFixed(3)
  // if (str == '360.000') {
  //   return '0.000'
  // }
  // return str
}

// given wrap-around numbers from 0 to n-1, return the distance between a and b
function distance(n, a, b) {
  if (a > b) {
    ;[a, b] = [b, a] // swap
  }
  return Math.min((b - a) % n, Math.abs((b - a - n) % n))
}

function average(...values) {
  if (values.length == 0) {
    console.trace()
    throw `average got 0 parameters`
  }
  return (
    values.reduce((accumulator, current) => {
      return accumulator + current
    }, 0) / values.length
  )
}

function randomInt(n) {
  return Math.floor(Math.random() * n)
}

// solve the linear equation ax + b = 0, returning a list of 0 or 1 answers
// this is trivial, but used for the case of quadratic and cubic
function linear(a, b) {
  if (Math.abs(a) < THRESHOLD_FINE) {
    return []
  }
  return [-b / a]
}

// solve the quadratic equation ax^2 + bx + c = 0, returning a list of 0 to 2 distinct roots
function quadratic(a, b, c) {
  if (Math.abs(a) < THRESHOLD_FINE) {
    // return linear solution of bx + c = 0
    return linear(b, c)
  }
  let det = b * b - 4 * a * c
  if (det < 0) {
    return []
  }
  if (det == 0) {
    return [-b / (2 * a)]
  }
  let sqrt = Math.sqrt(det)
  return [(-b - sqrt) / (2 * a), (-b + sqrt) / (2 * a)]
}

function cuberoot(x) {
  var y = Math.pow(Math.abs(x), 1 / 3)
  return x < 0 ? -y : y
}

// adapted from https://stackoverflow.com/a/27176424
// solve the cubic equation ax^3 + bx^2 + cx + d = 0, returning 0 to 3 roots (0 roots in the degenerate case)
function cubic(a, b, c, d) {
  if (Math.abs(a) < THRESHOLD_FINE) {
    // Quadratic case, ax^2+bx+c=0
    a = b
    b = c
    c = d
    if (Math.abs(a) < THRESHOLD_FINE) {
      // Linear case, ax+b=0
      a = b
      b = c
      if (Math.abs(a) < THRESHOLD_FINE)
        // Degenerate case
        return []
      return [-b / a]
    }

    var D = b * b - 4 * a * c
    if (Math.abs(D) < THRESHOLD_FINE) return [-b / (2 * a)]
    else if (D > 0) return [(-b + Math.sqrt(D)) / (2 * a), (-b - Math.sqrt(D)) / (2 * a)]
    return []
  }

  // Convert to depressed cubic t^3+pt+q = 0 (subst x = t - b/3a)
  var p = (3 * a * c - b * b) / (3 * a * a)
  var q = (2 * b * b * b - 9 * a * b * c + 27 * a * a * d) / (27 * a * a * a)
  console.log('cubic p, q', p, q)
  var roots

  if (Math.abs(p) < THRESHOLD_FINE) {
    // p = 0 -> t^3 = -q -> t = -q^1/3
    roots = [cuberoot(-q)]
  } else if (Math.abs(q) < THRESHOLD_FINE) {
    // q = 0 -> t^3 + pt = 0 -> t(t^2+p)=0
    roots = [0].concat(p < 0 ? [Math.sqrt(-p), -Math.sqrt(-p)] : [])
  } else {
    var D = (q * q) / 4 + (p * p * p) / 27
    // console.log('cubic D', D)
    if (Math.abs(D) < THRESHOLD_FINE) {
      // D = 0 -> two roots
      roots = [(-1.5 * q) / p, (3 * q) / p]
    } else if (D > 0) {
      // Only one real root
      var u = cuberoot(-q / 2 - Math.sqrt(D))
      roots = [u - p / (3 * u)]
    } else {
      // D < 0, three roots, but needs to use complex numbers/trigonometric solution
      var u = 2 * Math.sqrt(-p / 3)
      var t = Math.acos((3 * q) / p / u) / 3 // D < 0 implies p < 0 and acos argument in [-1..1]
      var k = (2 * Math.PI) / 3
      roots = [u * Math.cos(t), u * Math.cos(t - k), u * Math.cos(t - 2 * k)]
    }
  }

  // Convert back from depressed cubic
  for (var i = 0; i < roots.length; i++) roots[i] -= b / (3 * a)

  return roots
}

export {
  reverseInterpolate,
  degToRad,
  radToDeg,
  closeEnough,
  normalizeRadians,
  normalizeRadianString,
  distance,
  randomInt,
  average,
  linear,
  quadratic,
  cubic,
}
