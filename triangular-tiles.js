const tricurve12 = {
  template: `<path class="stroke" d="M -16.6 0 C -16.6 19.24, 16.6 19.24, 16.6 0" /> <!-- 12 -->`,
}

const tricurve13 = {
  template: `<path class="stroke" d="M -16.6 0 C -16.6 19.24, 16.6 19.24, 33.3 28.87" /> <!-- 13 -->`,
}

const tricurve14 = {
  template: `<path class="stroke" d="M -16.6 0 C -16.6 19.24, 0 48.1, 16.6 57.78" /> <!-- 14 -->`,
}

const tricurve15 = {
  template: `<path class="stroke" d="M -16.6 0 C -16.6 19.24, 0 48.1, -16.6 57.78" /> <!-- 15 -->`,
}

const tricurve16 = {
  template: `<path class="stroke" d="M -16.6 0 Q -16.6 19.24, -33.3 28.87" /> <!-- 16 -->`,
}

const tricurve23 = {
  template: `<path class="stroke" d="M 16.6 0 Q 16.6 19.24, 33.3 28.87" /> <!-- 23 -->`,
}

const tricurve24 = {
  template: `<path class="stroke" d="M 16.6 0 C 16.6 19.24, 0 48.1, 16.6 57.78" /> <!-- 24 -->`,
}

const tricurve25 = {
  template: `<path class="stroke" d="M 16.6 0 C 16.6 19.24, 0 48.1, -16.6 57.78" /> <!-- 25 -->`,
}

const tricurve26 = {
  template: `<path class="stroke" d="M 16.6 0 C 16.6 19.24, -16.6 19.24, -33.3 28.87" /> <!-- 26 -->`,
}

const tricurve34 = {
  template: `<path class="stroke" d="M 16.6 57.78 C 0 48.1, 16.6 19.24, 33.3 28.87" /> <!-- 34 -->`,
}

const tricurve35 = {
  template: `<path class="stroke" d="M 33.3 28.87 C 16.6 19.24, 0 48.1, -16.6 57.78" /> <!-- 35 -->`,
}

const tricurve36 = {
  template: `<path class="stroke" d="M 33.3 28.87 C 16.6 19.24, -16.6 19.24, -33.3 28.87" /> <!-- 36 -->`,
}

const tricurve45 = {
  template: `<path class="stroke" d="M 16.6 57.78 Q 0 48.1, -16.6 57.78" /> <!-- 45 -->`,
}

const tricurve46 = {
  template: `<path class="stroke" d="M 16.6 57.78  C 0 48.1, -16.6 19.24, -33.3 28.87" /> <!-- 46 -->`,
}

const tricurve56 = {
  template: `<path class="stroke" d="M -33.3 28.87 C -16.6 19.24, 0 48.1, -16.6 57.78" /> <!-- 56 -->`,
}

const tile123456 = {
  template: `<g class="tile">
    <polygon points="0,86.6 -50,0 50,0" />
    <tricurve12 />
    <tricurve34 />
    <tricurve56 />
  </g>`,
  components: {
    tricurve12,
    tricurve34,
    tricurve56,
  },
}

const tile123546 = {
  template: `<g class="tile">
    <polygon points="0,86.6 -50,0 50,0" />
    <tricurve12 />
    <tricurve35 />
    <tricurve46 />
  </g>`,
  components: {
    tricurve12,
    tricurve35,
    tricurve46,
  },
}

const tile123645 = {
  template: `<g class="tile">
    <polygon points="0,86.6 -50,0 50,0" />
    <tricurve12 />
    <tricurve36 />
    <tricurve45 />
  </g>`,
  components: {
    tricurve12,
    tricurve36,
    tricurve45,
  },
}

const tile132456 = {
  template: `<g class="tile">
    <polygon points="0,86.6 -50,0 50,0" />
    <tricurve13 />
    <tricurve24 />
    <tricurve56 />
  </g>`,
  components: {
    tricurve13,
    tricurve24,
    tricurve56,
  },
}

const tile132546 = {
  template: `<g class="tile">
    <polygon points="0,86.6 -50,0 50,0" />
    <tricurve13 />
    <tricurve25 />
    <tricurve46 />
  </g>`,
  components: {
    tricurve13,
    tricurve25,
    tricurve46,
  },
}

const tile132645 = {
  template: `<g class="tile">
    <polygon points="0,86.6 -50,0 50,0" />
    <tricurve13 />
    <tricurve26 />
    <tricurve45 />
  </g>`,
  components: {
    tricurve13,
    tricurve26,
    tricurve45,
  },
}

const tile142356 = {
  template: `<g class="tile">
    <polygon points="0,86.6 -50,0 50,0" />
    <tricurve14 />
    <tricurve23 />
    <tricurve56 />
  </g>`,
  components: {
    tricurve14,
    tricurve23,
    tricurve56,
  },
}

const tile142536 = {
  template: `<g class="tile">
    <polygon points="0,86.6 -50,0 50,0" />
    <tricurve14 />
    <tricurve25 />
    <tricurve36 />
  </g>`,
  components: {
    tricurve14,
    tricurve25,
    tricurve36,
  },
}

const tile142635 = {
  template: `<g class="tile">
    <polygon points="0,86.6 -50,0 50,0" />
    <tricurve14 />
    <tricurve26 />
    <tricurve35 />
  </g>`,
  components: {
    tricurve14,
    tricurve26,
    tricurve35,
  },
}

const tile152346 = {
  template: `<g class="tile">
    <polygon points="0,86.6 -50,0 50,0" />
    <tricurve15 />
    <tricurve23 />
    <tricurve46 />
  </g>`,
  components: {
    tricurve15,
    tricurve23,
    tricurve46,
  },
}

const tile152436 = {
  template: `<g class="tile">
    <polygon points="0,86.6 -50,0 50,0" />
    <tricurve15 />
    <tricurve23 />
    <tricurve46 />
  </g>`,
  components: {
    tricurve15,
    tricurve23,
    tricurve46,
  },
}

const tile152634 = {
  template: `<g class="tile">
    <polygon points="0,86.6 -50,0 50,0" />
    <tricurve15 />
    <tricurve26 />
    <tricurve34 />
  </g>`,
  components: {
    tricurve15,
    tricurve26,
    tricurve34,
  },
}

const tile162345 = {
  template: `<g class="tile">
    <polygon points="0,86.6 -50,0 50,0" />
    <tricurve16 />
    <tricurve23 />
    <tricurve45 />
  </g>`,
  components: {
    tricurve16,
    tricurve23,
    tricurve45,
  },
}

const tile162435 = {
  template: `<g class="tile">
    <polygon points="0,86.6 -50,0 50,0" />
    <tricurve16 />
    <tricurve24 />
    <tricurve35 />
  </g>`,
  components: {
    tricurve16,
    tricurve24,
    tricurve35,
  },
}

const tile162534 = {
  template: `<g class="tile">
    <polygon points="0,86.6 -50,0 50,0" />
    <tricurve16 />
    <tricurve25 />
    <tricurve34 />
  </g>`,
  components: {
    tricurve16,
    tricurve25,
    tricurve34,
  },
}

const tilesetTri15 = {
  tile123456,
  tile123546,
  tile123645,
  tile132456,
  tile132546,
  tile132645,
  tile142356,
  tile142536,
  tile142635,
  tile152346,
  tile152436,
  tile152634,
  tile162345,
  tile162435,
  tile162534,
}

const tilesetTri5 = {
  tile123456,
  tile123645,
  tile142356,
  tile162345,
  tile162534,
}

export {
  tile123456,
  tile123546,
  tile123645,
  tile132456,
  tile132546,
  tile132645,
  tile142356,
  tile142536,
  tile142635,
  tile152346,
  tile152436,
  tile152634,
  tile162345,
  tile162435,
  tile162534,
  tilesetTri5,
  tilesetTri15,
}
