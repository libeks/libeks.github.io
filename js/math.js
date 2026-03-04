const THRESHOLD = 0.01

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
  // if (Number(retval.toFixed(3)) > 2 * Math.PI) {
  //   return 0
  // }
  return retval
}

function normalizeRadianString(radians) {
  radians = normalizeRadians(radians)
  let degrees = radToDeg(radians)
  let str = degrees.toFixed(3)
  if (str == '360.000') {
    return '0.000'
  }
  return str
}

export {
  reverseInterpolate,
  degToRad,
  radToDeg,
  closeEnough,
  normalizeRadians,
  normalizeRadianString,
}
