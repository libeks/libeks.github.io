import { memoize } from '/js/memoize.js'
import { randomInt } from '/js/math.js'

function catNum(n) {
  if (n == 0 || n == 1) {
    return 1
  }
  let sum = 0
  for (let i = 0; i < n; i++) {
    sum += catalanNumber(i) * catalanNumber(n - i - 1)
  }
  return sum
}

const catalanNumber = memoize(catNum)

// this is on average 13x slower than generateIterativeCatalanParenthesisExpensive
const genIterCatalanNumericalExpensive = function (n, i) {
  if (n == 0) {
    return []
  }
  if (n == 1) {
    return [1, 2]
  }
  let cn = catalanNumber(n)
  if (i >= cn) {
    i = i % cn
  }
  let iter = 0
  for (let a1 = 0; a1 <= n - 1; a1++) {
    let ca1 = catalanNumber(a1)
    let a2 = n - a1 - 1
    let ca2 = catalanNumber(a2)
    for (let j = 0; j < ca1; j++) {
      if (i < ca2) {
        let left = generateIterativeCatalanNumeric(a1, j)
        let right = generateIterativeCatalanNumeric(a2, i)
        let result = [1, left.length + 2]
        for (let obj of left) {
          result.push(obj + 1)
        }
        for (let obj of right) {
          result.push(obj + left.length + 2)
        }
        return result
      }
      i -= ca2
    }
  }
  return 'unknown'
}

const generateIterativeCatalanNumeric = memoize(genIterCatalanNumericalExpensive)

function genIterNumber(n, i) {
  let res = generateIterativeCatalanNumeric(n, i)
  let result = res.map((char) => numericalToHex(char)).join('')
  return result
}

// Return a balanced-parenthesis representation of the Catalan Structure Cn with index i
const generateIterativeCatalanParenthesisExpensive = function (n, i) {
  let ii = i
  if (n == 0) {
    return ''
  }
  if (n == 1) {
    return '()'
  }
  if (i == 0) {
    return '()'.repeat(n)
  }

  let cn = catalanNumber(n)
  if (i >= cn) {
    i = i % cn
  }
  if (i == cn - 1) {
    return '('.repeat(n) + ')'.repeat(n)
  }

  let iter = 0
  for (let a1 = 0; a1 <= n - 1; a1++) {
    let ca1 = catalanNumber(a1)
    let a2 = n - a1 - 1
    let ca2 = catalanNumber(a2)

    if (i < ca1 * ca2) {
      let j = Math.floor(i / ca2)
      i = i - ca2 * j
      const result = `(${generateIterativeCatalanParentheses(a1, j)})${generateIterativeCatalanParentheses(a2, i)}`
      return result
    } else {
      i = i - ca1 * ca2
    }
  }
  return 'unknown'
}

const generateIterativeCatalanParentheses = memoize(generateIterativeCatalanParenthesisExpensive)

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
    for (let [i, l] of left.entries()) {
      for (let [j, r] of right.entries()) {
        retList.push(['(', ...l, ')', ...r])
      }
    }
  }
  return retList
}

function generateIterativeCatalanNumerical(n, i) {
  const paren = generateIterativeCatalanParentheses(n, i)
  const num = parenthesesToNumerical(paren)
  const arrst = arrayToNumStrings(num)
  return arrst
}

function offsetArrayVals(a, val) {
  return a.map((v) => v + val)
}

// given a notch character, give its numeric value
function hexToNumerical(a) {
  if (!isNaN(a)) {
    return Number(a) // ensure the result is always a number
  }
  let charCode = a.charCodeAt()
  if (charCode >= 65 && charCode <= 90) {
    // uppercase letters
    return charCode - 65 + 10
  }
  if (charCode >= 97 && charCode <= 122) {
    // lowercase letters
    return charCode - 97 + 36
  }
  throw `hexToNumerical: Unsupported hex ${a}`
}

function numericalToHex(char) {
  if (char < 10) {
    return char
  }
  // uppercase letters
  if (char < 36) {
    return String.fromCharCode(65 + (char - 10))
  }
  // lowercase letters
  if (char < 62) {
    return String.fromCharCode(97 + (char - 36))
  }
  throw `numericalToHex: Unsupported value ${char}`
}

function arrayOfArrayToArrayOfNumStrings(a) {
  return a.map((entry) => entry.map((char) => numericalToHex(char)).join(''))
}

function arrayToNumStrings(a) {
  return a.map((char) => numericalToHex(char)).join('')
}

// given a parenthetical representation of a Catalan structure, return the correspoding numerical string
function parenthesesToNumerical(st) {
  let ret = []
  let stack = []
  for (let i = st.length - 1; i >= 0; i--) {
    const char = st[i]
    if (char == ')') {
      stack.push(i + 1)
    } else if (char == '(') {
      const last = stack.pop()
      ret.push([i + 1, last])
    } else {
      throw 'Unknown character'
    }
  }
  return ret.reverse().flat(Infinity) // flatten nested list
}

function parenthesesToHex(st) {
  let numerical = parenthesesToNumerical(st)
  return numerical.map((a) => numericalToHex(a)).join('')
}

// '123456789A' => '()()()()()'
function hexToParentheses(st) {
  let dict = {}
  for (let i = 0; i < st.length; i++) {
    const val = hexToNumerical(st[i]) - 1
    if (i % 2 == 0) {
      dict[val] = '('
    } else {
      dict[val] = ')'
    }
  }
  let ret = []
  for (let i = 0; i < st.length; i++) {
    ret.push(dict[i])
  }
  return ret.join('')
}

function hexToPartition(st) {
  return parenthesesToPartitions(hexToParentheses(st))
}

//  (*( )*( (*( )*) )*)
// 0 1 2 1 2 3 4 3 2 1 0

//  (*) (*) (*) (*) (*)
// 0 1 0 1 0 1 0 1 0 1 0

// (())(()()()()()()())

// return the partition set representation of a catalan object
// ()((()))() => [[1,2,5],[3,4]]
function parenthesesToPartitions(st) {
  // compute in reverse to ensure correct order of first element of each partition
  let ret = []
  let dict = {}
  let val = 0
  for (let i = st.length - 1; i >= 0; i--) {
    if (!dict[val]) {
      dict[val] = []
    }
    const char = st[i]
    if (char == ')') {
      val += 1
      if (!dict[val]) {
        dict[val] = []
      }
    } else if (char == '(') {
      if (dict[val].length > 0) {
        ret.push(dict[val].reverse())
        dict[val] = []
      }
      val -= 1
    } else {
      throw 'Unknown character'
    }
    if (i % 2 == 1) {
      dict[val].push(i / 2 + 0.5)
    }
  }
  return ret.reverse()
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
    for (let [leftID, l] of left.entries()) {
      for (let [rightID, r] of right.entries()) {
        const val = [1, l.length + 2, ...offsetArrayVals(l, 1), ...offsetArrayVals(r, l.length + 2)]
        retList.push(val)
      }
    }
  }
  return retList
}

// rotate the parenthesis notation forward by one, using the rule x(y) => (x)y
function rotateParenthesis(element) {
  // find the matching parenthesis for the last closing parenthesis
  let numerical = parenthesesToNumerical(element)
  let breakpoint = 0
  for (let i = 0; i < numerical.length; i += 2) {
    if (hexToNumerical(numerical[i + 1]) == element.length) {
      breakpoint = hexToNumerical(numerical[i]) - 1
      break
    }
  }
  let x = element.substring(0, breakpoint)
  let y = ''
  if (breakpoint + 1 < element.length - 2) {
    y = element.substring(breakpoint + 1, element.length - 1)
  }
  let response = `(${x})${y}`
  if (response.length != element.length) {
    throw `Invalid length ${response} ${response.length}, ${element} ${element.length}`
  }
  return response
}

function generateRotations(element) {
  let el = element
  let set = [element]
  while (true || set.length > 200) {
    let before = el
    el = rotateParenthesis(el)
    if (el == element) {
      return set
    }
    set.push(el)
  }
}

function partitionCatalanParenthesisSet(set) {
  let partitions = {}
  let allElements = {}
  for (let element of set) {
    if (!(element in allElements)) {
      let rotations = generateRotations(element)
      partitions[element] = rotations
      for (let el of rotations) {
        allElements[el] = element
      }
    }
  }
  return partitions
}

function getParenthesisPartitions(n) {
  let set = generateCatalanParenthesisSet(n).map((el) => el.join(''))
  let partitions = partitionCatalanParenthesisSet(set)
  let newMap = {}
  for (let [k, v] of Object.entries(partitions)) {
    newMap[parenthesesToHex(k)] = v.map((a) => parenthesesToHex(a))
  }
  return newMap
}

// given a parenthesis notation, return the full set obtained by rotating the notation
function getParenthesisRotationSet(initial) {
  let retArray = [initial]
  let current = rotateParenthesis(initial)
  while (current != initial) {
    retArray.push(current)
    current = rotateParenthesis(current)
  }
  return retArray
}

function get2DWalkFromParentheses(parentheses) {
  let result = []
  for (let i = 1; i < parentheses.length - 1; i += 2) {
    let st = parentheses.substring(i, i + 2)
    if (st == '((') {
      result.push('↑')
    } else if (st == '))') {
      result.push('↓')
    } else if (st == '()') {
      result.push('←')
    } else if (st == ')(') {
      result.push('→')
    } else {
      throw `Unrecognized parenthesis pair subsequence ${st}`
    }
  }
  return result.join('')
}

function getBinaryTree(tileParentheses) {
  let maxDepth = 0
  let depth = -1
  let nNodes = 1
  let nodes = {}
  let current
  let root
  for (let char of tileParentheses) {
    if (char == '(') {
      current = {
        id: nNodes,
        left: null,
        right: null,
        parent: current,
        depth: depth + 1,
        progress: 0,
      }
      nNodes++

      if (root == null) {
        root = current
      } else {
        if (current.parent.progress == 0) {
          current.parent.left = current
        } else {
          current.parent.right = current
        }
      }
      nodes[current.id] = current
      depth++
      if (depth > maxDepth) {
        maxDepth = depth
      }
    } else {
      while (current != null) {
        if (current.progress == 0) {
          current.progress = 1
          break
        } else if (current.progress == 1) {
          current.progress = 2
          current = current.parent
          depth--
        }
      }
    }
  }
  return { root, maxDepth, nNodes, nodes, tile: tileParentheses }
}

// a binary tree where every original node has a parent and two children, with dangling nodes added to fulful this requirement
function getDanglingBinaryTree(tileParentheses) {
  let { root, maxDepth, nNodes, nodes, tile } = getBinaryTree(tileParentheses)
  function addDangling(node) {
    node.type = 'black' // proper nodes
    if (node.left == null) {
      node.left = {
        id: Object.keys(nodes).length + 1,
        left: null,
        right: null,
        parent: node,
        depth: node.depth + 1,
        progress: 0, // not needed
        type: 'dangling',
      }
      nodes[node.left.id] = node.left
    } else {
      addDangling(node.left)
    }
    if (node.right == null) {
      node.right = {
        id: Object.keys(nodes).length + 1,
        left: null,
        right: null,
        parent: node,
        depth: node.depth + 1,
        progress: 0, // not needed
        type: 'dangling',
      }
      nodes[node.right.id] = node.right
    } else {
      addDangling(node.right)
    }
  }
  addDangling(root)
  root = {
    id: Object.keys(nodes).length + 1,
    left: root,
    right: null,
    parent: null,
    depth: -1,
    progress: 0,
    type: 'root', // a special kind of dangling node, the root of the new tree
  }
  function increaseDepth(node) {
    node.depth += 1
    if (node.depth > maxDepth) {
      maxDepth = node.depth
    }
    if (node.left) {
      increaseDepth(node.left)
    }
    if (node.right) {
      increaseDepth(node.right)
    }
  }
  increaseDepth(root)
  root.left.parent = root
  nodes[root.id] = root
  return { root, maxDepth, nNodes: Object.keys(nodes).length, nodes, tile }
}

function getPlaneTree(tileParentheses) {
  let maxDepth = 0
  let depth = 0
  let nNodes = 0
  let nodes = {}
  let root = { id: 0, children: [], parent: null, depth: 0 }
  nodes[root.id] = root
  let current = root
  for (let char of tileParentheses) {
    if (char == '(') {
      nNodes++
      current = { id: nNodes, children: [], parent: current, depth: depth + 1 }
      current.parent.children.push(current)
      nodes[current.id] = current
      depth++
      if (depth > maxDepth) {
        maxDepth = depth
      }
    } else {
      current = current.parent
      depth--
    }
  }
  return { root, maxDepth, nNodes, nodes, tile: tileParentheses }
}

class CatalanStructure {
  constructor(n, i) {
    this.n = n
    this.i = i
  }

  next() {
    return new CatalanStructure(this.n, this.i + 1)
  }

  // return '((()()))'
  get parenthesis() {
    return generateIterativeCatalanParentheses(this.n, this.i)
  }

  // return [1,2,3,4,5,6,7,8,9,10]
  get numericalList() {
    return parenthesesToNumerical(this.parenthesis)
  }

  // return '123456789A'
  get hex() {
    return parenthesesToHex(this.parenthesis)
  }

  // return '→→←→↑→↓→→'
  get twoDWalk() {
    return get2DWalkFromParentheses(this.parenthesis)
  }

  // return '→→→←→←←←'
  get oneDWalk() {
    return this.parenthesis
      .split('')
      .map((ch) => (ch == '(' ? '→' : '←'))
      .join('')
  }

  // return '+++-+---'
  get oneDWalkPlusMinus() {
    return this.parenthesis
      .split('')
      .map((ch) => (ch == '(' ? '+' : '-'))
      .join('')
  }

  // return 'AAABABBB'
  get votingSequence() {
    return this.parenthesis
      .split('')
      .map((ch) => (ch == '(' ? 'A' : 'B'))
      .join('')
  }

  // return [[1],[2,5],[3],[4]]
  get partitions() {
    return hexToPartition(this.hex)
  }

  // return '[1],[2,5],[3],[4]'
  get partitionString() {
    let a = this.partitions.map((part) => `[${part.join(',')}]`).join(',')
    return a
  }

  get binaryTree() {
    return getBinaryTree(this.parenthesis)
  }

  get planeTree() {
    return getPlaneTree(this.parenthesis)
  }
}

class CatalanGenus {
  constructor(n) {
    this.n = n
  }

  count() {
    return catalanNumber(this.n)
  }

  getI(i) {
    return new CatalanStructure(this.n, i)
  }

  random() {
    return new CatalanStructure(this.n, randomInt(this.count()))
  }

  *all() {
    for (let i = 0; i < this.count(); i++) {
      yield this.getI(i)
    }
  }
}

export {
  // catalan number
  catalanNumber,

  // generators
  // exhaustive sets
  generateCatalanNumberSet,
  generateCatalanParenthesisSet,
  // iterative
  generateIterativeCatalanParentheses,
  generateIterativeCatalanNumerical,
  genIterCatalanNumericalExpensive,
  genIterNumber,

  // representation conversions
  parenthesesToNumerical,
  parenthesesToPartitions,
  parenthesesToHex,
  hexToPartition,
  hexToParentheses,

  // character conversion
  numericalToHex,
  hexToNumerical,

  // miscellaneous
  rotateParenthesis,

  // partitions
  getParenthesisPartitions,
  getParenthesisRotationSet,

  // 2D walk
  get2DWalkFromParentheses,

  // trees
  getBinaryTree,
  getPlaneTree,
  getDanglingBinaryTree,

  // classes
  CatalanGenus,
  CatalanStructure,
}
