class SquareGrid {
  constructor({ nX, nY, filter }) {
    this.nX = nX
    this.nY = nY
    this.squares = {}
    for (let x = 0; x <= nX; x++) {
      for (let y = 0; y <= nY; y++) {
        if (filter && filter(x, y)) {
          // Remove triangles that should be filtered out, to get the right output shape
          continue
        }
        // this.squares.push(new Square(x, y))
        this.squares[[x, y]] = new Square(x, y)
      }
    }
  }

  getSquares() {
    return Object.values(this.squares)
  }

  coordInDirection(x, y, edge) {
    if (edge == 0) {
      return [[x, y - 1], 2]
    } else if (edge == 1) {
      return [[x + 1, y], 3]
    } else if (edge == 2) {
      return [[x, y + 1], 0]
    } else if (edge == 3) {
      return [[x - 1, y], 1]
    } else {
      throw `Unknown direction for square: ${edge}`
    }
  }

  // when exiting the square x,y in the direction of edge, which square do we get?
  squareInDirection(x, y, edge) {
    ;[[x, y], edge] = this.coordInDirection(x, y, edge)
    if ([x, y] in this.squares) {
      return [this.squares[[x, y]], edge]
    }
    return [null, null]
  }

  // return a list of squares and the edges that are on the perimeter
  *getPerimeterSquaresAndEdges() {
    // walk North edge left to right
    for (let x = 0; x < this.nX; x++) {
      yield [this.squares[[x, 0]], 0]
    }
    // walk East edge top down
    for (let y = 0; y < this.nY; y++) {
      yield [this.squares[[this.nX - 1, y]], 1]
    }
    // walk South edge right to left
    for (let x = this.nX - 1; x >= 0; x--) {
      yield [this.squares[[x, this.nY - 1]], 2]
    }
    // walk West edge, bottom to top
    for (let y = this.nY - 1; y >= 0; y--) {
      yield [this.squares[[0, y]], 3]
    }
  }

  *getInternalSquares() {
    for (let y = 1; y < this.nY - 1; y++) {
      for (let x = 1; x < this.nX - 1; x++) {
        yield this.squares[[x, y]]
      }
    }
  }
}

class Square {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.data = null
  }

  string() {
    return `${this.x},${this.y}`
  }
}

class SquarePositioner {
  constructor(padding, grid, size) {
    this.padding = padding
    this.grid = grid
    this.size = size
  }

  mapSquare(sq) {
    return {
      x: this.padding.x + sq.x * this.size,
      y: this.padding.y + sq.y * this.size,
    }
  }

  randomize(options) {
    for (let sq of this.grid.getSquares()) {
      const r = Math.floor(Math.random() * options.length)
      sq.data = options[r]
    }
    return this
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

function setActiveSquare(sqString) {
  for (const sq of this.grid.grid.squares) {
    if (sq.string() == sqString) {
      this.selected = sq
      return
    }
  }
}

function sqClassName(sq, selected) {
  if (this.selected === null) {
    return {
      square: true,
      odd: (sq.x + sq.y) % 2 == 1,
      even: (sq.x + sq.y) % 2 == 0,
    }
  }
  const highlight = sq.string() == this.selected.string()
  return {
    highlight,
    sameX: sq.x == this.selected.x && !highlight,
    sameY: sq.y == this.selected.y && !highlight,
    square: true,
    odd: (sq.x + sq.y) % 2 == 1,
    even: (sq.x + sq.y) % 2 == 0,
  }
}

export { SquareGrid, SquarePositioner, setActiveSquare, sqClassName }
