class TriangleGrid {
  constructor({ nX, nY, nB, filter }) {
    this.triangles = []
    if (nX !== undefined && nY !== undefined) {
      for (let x = 0; x <= nX; x++) {
        for (let y = 0; y <= nY; y++) {
          for (const R of [0, 1]) {
            if (filter && filter(x, y, R)) {
              // Remove triangles that should be filtered out, to get the right output shape
              continue
            }
            this.triangles.push(new Triangle({ x, y, R }))
          }
        }
      }
    } else if (nY !== undefined && nB !== undefined) {
      for (let b = 0; b <= nB; b++) {
        for (let y = 0; y <= nY; y++) {
          this.triangles.push(new Triangle({ b, y }))
        }
      }
    } else {
      throw 'Unknown parameters to TriangleGrid'
    }
  }

  widthByY(y) {
    let n = 0
    for (const tri of this.triangles) {
      if (tri.y == y) {
        n++
      }
    }
    return n
  }

  upTriangles() {
    return this.triangles.filter((tri) => tri.R == 0)
  }

  downTriangles() {
    return this.triangles.filter((tri) => tri.R == 1)
  }
}

class Triangle {
  constructor({ x, y, z, R, b }) {
    if (x !== undefined && y !== undefined && R !== undefined) {
      // raw coordinates, these are used to identify a triangle
      this.x = x
      this.y = y
      this.R = R

      // derived coordinates

      // x-y-z coordinates
      this.z = this.x - this.y + this.R // uses the same x, y coords as above
      // y-b coordinates
      this.b = this.x + this.z // corresponds to the "column" of the triangle
    } else if (x !== undefined && y !== undefined && z !== undefined) {
      this.x = x
      this.y = y
      this.z = z

      // derived coords
      this.R = this.z - this.x + this.y
      this.b = this.x + this.z
    } else if (y !== undefined && b != undefined) {
      this.y = y
      this.b = b

      // derived coords
      this.x = Math.floor((b + y) / 2)
      this.R = (b + y) % 2
      this.z = this.x - this.y + this.R
    } else {
      throw 'Unknown triangle type with parameters'
    }
  }

  string() {
    return `${this.x},${this.y},${this.R}`
  }
}

class TrianglePositioner {
  constructor(padding, grid, size) {
    // if (grid !== undefined && gridParams !== undefined) {
    // 	console.log(grid);
    // 	console.log(gridParams);
    // 	console.warn("TrianglePositioner recevied both grid and gridParams, will ignore the latter");
    // }
    // if (gridParams !== undefined) {
    // 	this.grid = new TriangleGrid(gridParams);
    // } else {
    this.grid = grid
    // }
    this.padding = padding
    this.size = size
    this.data = null
  }

  mapTriangle(tri) {
    console.log(tri)
    return {
      x:
        this.padding.x +
        (-this.size / 2) * (tri.y % 2) +
        (tri.x - Math.floor(tri.y / 2)) * this.size +
        (this.size / 2) * tri.R,
      y: this.padding.y + tri.y * 86.6,
    }
  }

  randomize(options) {
    console.log(this.grid)
    for (let sq of this.grid.triangles) {
      const r = Math.floor(Math.random() * options.length)
      sq.data = options[r]
    }
    console.log(this.grid)
    return this
  }

  mapYCoord(coord) {
    if (!coord) {
      return { x: 0, y: 0 }
    }
    return {
      x: this.padding.x + (this.size * this.grid.widthByY(coord.y)) / 2 + 40,
      y: coord.y * 86.6 + 50 + this.padding.y,
    }
  }

  mapXCoord(coord) {
    // TODO: lower label when possible
    if (!coord) {
      return { x: 0, y: 0 }
    }
    return {
      x: this.padding.x + 50 + coord.x * this.size,
      y: this.padding.y - 25,
      rotate: -60,
    }
  }

  mapZCoord(coord) {
    // TODO: lower label when possible
    if (!coord) {
      return { x: 0, y: 0 }
    }
    return {
      x: this.padding.x + coord.z * this.size - this.size,
      y: this.padding.y - 50,
      rotate: 60,
    }
  }

  mapBCoord(coord) {
    if (!coord) {
      return { x: 0, y: 0 }
    }
    return {
      x: this.padding.x + (coord.b * this.size) / 2,
      y: this.padding.y - 25,
      rotate: -90,
    }
  }
}

function setActiveTriangle(triString) {
  for (const tri of this.grid.grid.triangles) {
    if (tri.string() == triString) {
      this.selected = tri
      return
    }
  }
}

function triClassName(tri, selected) {
  if (this.selected === null) {
    return {
      uptriangle: tri.R == 0,
      downtriangle: tri.R == 1,
      triangle: true,
    }
  }
  const highlight = tri.string() == this.selected.string()
  return {
    highlight,
    ...((this.coordinates == 'xyz' || this.coordinates == 'xyr') && {
      sameX: tri.x == this.selected.x && !highlight,
    }),
    sameY: tri.y == this.selected.y && !highlight, // y coordinate is used in call coordinate systems
    ...(this.coordinates == 'xyr' && { sameR: tri.R == this.selected.R && !highlight }),
    ...(this.coordinates == 'xyz' && { sameZ: tri.z == this.selected.z && !highlight }),
    ...(this.coordinates == 'yb' && { sameB: tri.b == this.selected.b && !highlight }),
    uptriangle: tri.R == 0,
    downtriangle: tri.R == 1,
    triangle: true,
  }
}

function triSimpleClassName(tri, selected) {
  if (this.selected === null) {
    return {
      uptriangle: tri.R == 0,
      downtriangle: tri.R == 1,
      triangle: true,
    }
  }
  const highlight = tri.string() == this.selected.string()
  return {
    highlight,
    uptriangle: tri.R == 0,
    downtriangle: tri.R == 1,
    triangle: true,
  }
}

// Components to display triangle coordinates, in the three coordinate systems
const xyz = {
  template: `<tspan class="x-y-z-coord"><tspan class="x-coord">{{tri.x}}</tspan>, <tspan class="y-coord">{{tri.y}}</tspan>, <tspan class="z-coord">{{tri.z}}</tspan></tspan>`,
  props: ['tri'],
}
const xyr = {
  template: `<tspan class="x-y-r-coord"><tspan class="x-coord">{{tri.x}}</tspan>, <tspan class="y-coord">{{tri.y}}</tspan>, <tspan class="r-coord">{{tri.R}}</tspan></tspan>`,
  props: ['tri'],
}
const yb = {
  template: `<tspan class="y-b-coord"><tspan class="y-coord">{{tri.y}}</tspan>, <tspan class="b-coord">{{tri.b}}</tspan></tspan>`,
  props: ['tri'],
}

export {
  TriangleGrid,
  TrianglePositioner,
  setActiveTriangle,
  triClassName,
  triSimpleClassName,
  xyz,
  xyr,
  yb,
}
