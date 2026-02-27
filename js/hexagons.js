class HexagonGrid {
  constructor({ nY, nB }) {
    this.hexagons = {}
    for (let y = 0; y <= nY; y++) {
      for (let b = 0; b <= nB; b++) {
        let hexagon = new Hexagon({ y, b })
        this.hexagons[hexagon.string()] = hexagon
      }
    }
  }

  // widthByY(y) {
  //   let n = 0
  //   for (const tri of Object.values(this.triangles)) {
  //     if (tri.y == y) {
  //       n++
  //     }
  //   }
  //   return n
  // }

  // upTriangles() {
  //   return Object.values(this.triangles).filter((tri) => tri.R == 0)
  // }

  // downTriangles() {
  //   return Object.values(this.triangles).filter((tri) => tri.R == 1)
  // }
}

class Hexagon {
  constructor({ y, b }) {
    this.y = y
    this.b = b

    // // derived coords
    // this.x = Math.floor((b + y) / 2)
    // this.R = (b + y) % 2
    // this.z = this.x - this.y + this.R
  }

  string() {
    return `${this.y},${this.b}`
  }
}

class HexagonPositioner {
  constructor({ padding, grid, size, data_range }) {
    this.padding = padding
    this.grid = grid
    this.size = size
    this.data_range = data_range
    console.log(this.grid)
  }

  mapHex(sq) {
    return {
      x: this.padding.x + sq.b * this.size * 1.5,
      y: this.padding.y + (sq.y + (sq.b % 2) / 2) * this.size * Math.sqrt(3),
    }
  }

  randomize(options) {
    if (!options) {
      for (let sq of Object.values(this.grid.squares)) {
        const r = Math.floor(Math.random() * this.data_range)
        sq.data = r
      }
      return this
    }
    for (let sq of Object.values(this.grid.squares)) {
      const r = Math.floor(Math.random() * options.length)
      sq.data = options[r]
    }
    return this
  }

  getSquare(data) {
    return this.grid.squares[data]
  }

  increaseSquareData(sq_data) {
    const sq = this.getSquare(sq_data)
    if (this.data_range === undefined) {
      sq.data += 1
    } else {
      sq.data = (sq.data + 1) % this.data_range
    }
  }

  mapXCoord(coord) {
    // TODO: lower label when possible
    if (!coord) {
      return { x: 0, y: 0 }
    }
    return {
      x: this.padding.x + 30 + coord.x * this.size,
      y: this.padding.y - 25,
      // rotate: -90,
    }
  }

  mapYCoord(coord) {
    if (!coord) {
      return { x: 0, y: 0 }
    }
    return {
      x: this.padding.x + 500 + 30,
      y: this.padding.y + coord.y * this.size + 60,
    }
  }
}

export { Hexagon, HexagonPositioner, HexagonGrid }
