class SquareGrid {
  constructor({ nX, nY, filter }) {
    this.nX = nX
    this.nY = nY
    this.squares = []
    for (let x = 0; x <= nX; x++) {
      for (let y = 0; y <= nY; y++) {
        if (filter && filter(x, y)) {
          // Remove triangles that should be filtered out, to get the right output shape
          continue
        }
        this.squares.push(new Square(x, y))
      }
    }
  }

  getSquares() {
    return this.squares
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
    for (let sq of this.grid.squares) {
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
