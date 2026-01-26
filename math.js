function reverseInterpolate(a, b, threshold) {
  if (a == b) {
    return 0.5
  }
  // make sure a<=b
  if (a > b) {
    let temp = b
    b = a
    a = temp
  }
  const interval = b - a
  return (threshold - a) / interval
}

export { reverseInterpolate }
