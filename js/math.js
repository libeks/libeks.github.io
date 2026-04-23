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

function randomInt(n) {
  return Math.floor(Math.random() * n)
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
}
