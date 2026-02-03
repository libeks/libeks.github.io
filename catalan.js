function catalanNumber(n) {
  if (n == 0 || n == 1) {
    return 1
  }
  let sum = 0
  for (let i = 0; i < n; i++) {
    sum += catalanNumber(i) * catalanNumber(n - i - 1)
  }
  return sum
}

function generateCatalanParenthesisSet(n) {
  if (n == 0) {
    return [[]]
  }
  if (n == 1) {
    return [['(', ')']]
  }
  let retList = []
  for (let i = 0; i <= n - 1; i++) {
    let left = generateCatalanParenthesisSet(i)
    let right = generateCatalanParenthesisSet(n - i - 1)
    for (let l of left) {
      for (let r of right) {
        retList.push(['(', ...l, ')', ...r])
      }
    }
  }
  return retList
}

function offsetArrayVals(a, val) {
  return a.map((v) => v + val)
}

function generateCatalanNumberSet(n) {
  if (n == 0) {
    return [[]]
  }
  if (n == 1) {
    return [[1, 2]]
  }
  let retList = []
  for (let i = 0; i <= n - 1; i++) {
    let left = generateCatalanNumberSet(i)
    let right = generateCatalanNumberSet(n - i - 1)
    for (let l of left) {
      for (let r of right) {
        retList.push([
          1,
          l.length + 2,
          ...offsetArrayVals(l, 1),
          ...offsetArrayVals(r, l.length + 2),
        ])
      }
    }
  }
  return retList
}

export { catalanNumber, generateCatalanNumberSet }
