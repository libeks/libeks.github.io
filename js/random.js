// function xoshiro128ss(a, b, c, d) {
//   return function () {
//     let t = b << 9,
//       r = b * 5
//     r = ((r << 7) | (r >>> 25)) * 9
//     c ^= a
//     d ^= b
//     b ^= c
//     a ^= d
//     c ^= t
//     d = (d << 11) | (d >>> 21)
//     // console.log('r', r, (r >>> 0) / 4294967296)
//     let v = (r >>> 0) / 4294967296
//     // console.log('returning', v)
//     return v
//   }
// }

function splitmix32(a) {
  return function () {
    a |= 0
    a = (a + 0x9e3779b9) | 0
    let t = a ^ (a >>> 16)
    t = Math.imul(t, 0x21f0aaad)
    t = t ^ (t >>> 15)
    t = Math.imul(t, 0x735a2d97)
    return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296
  }
}

function randomInt(n) {
  return Math.floor(Math.random() * n)
}

class Random {
  // implements a seeded random number generator based on the splitmix32 approach
  // see https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
  constructor(seed) {
    this.seed = seed ^ 0xdeadbeef
    // this.getRand = xoshiro128ss(0x9e3779b9, 0x243f6a88, 0xb7e15162, seed)
    this.getRand = splitmix32(this.seed)
  }

  float() {
    let val = this.getRand()
    // console.log('float()', val)
    return val
  }

  int(n) {
    return Math.floor(this.float() * n)
  }
}

export { randomInt, Random }
