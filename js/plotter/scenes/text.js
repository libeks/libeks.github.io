import { BBox } from '/js/bbox.js'
import { Point } from '/js/geometry.js'
import { pairs, circularPairs, zip } from '/js/utils.js'
import { StraightStroke } from '/js/lines.js'
import { Random } from '/js/random.js'

import { Scene } from '/js/plotter/scene.js'
import { pens } from '/js/plotter/pens.js'

import { renderTextLine } from '/js/text/text.js'
import { fonts } from '/js/text/allFonts.js'

let textSizeOptions = [200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000].map((value) => ({
  value,
  display: value.toString(),
}))

const TextTest = new Scene('TextTest')
  .withOptions(
    (bbox, { size, text }) => {
      return {
        bbox: bbox,
        start: bbox.center(),
        size,
        text,
      }
    },
    [
      {
        name: 'size',
        type: 'dropdown',
        options: textSizeOptions,
        default: 800,
      },
      {
        name: 'text',
        type: 'dropdown-2',
        options: [
          {
            value:
              'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!"#$%&\'()*+,-./:;<=>?@[\\]^_{|}~ `',
            display: 'ASCII',
          },
          {
            value: 'This is it, then.',
            display: 'This is it',
          },
          {
            value: 'zA () "#',
            display: 'test',
          },
          {
            value: '_fontname_',
            display: 'fontname',
          },
        ],
        default: 'ASCII',
        // default: 'fontname',
      },
    ],
    (params) => {
      let { bbox, start, size, text } = params
      text = text.value

      // let displayFonts = fonts
      // let displayFonts = { newYorkFont: fonts['newYorkFont'] }
      // let displayFonts = { arialBlackFont: fonts['arialBlackFont'] }
      let displayFonts = {}
      let offset = 180
      // console.log('keys', Object.keys(fonts).slice(0, 10))
      for (let fontName of Object.keys(fonts).slice(offset, offset + 10)) {
        displayFonts[fontName] = fonts[fontName]
      }
      // displayFonts = { NewYorkRegularFont: fonts['NewYorkRegularFont']() }
      let bboxes = bbox.partition(Object.keys(displayFonts).length, 1)
      console.log('bboxes', bboxes)
      console.log('fonts', displayFonts)

      let texts = []
      for (let [bbox, font] of zip(bboxes, Object.values(displayFonts))) {
        font = font() // make sure to execute the font function
        let fontText = text
        if (fontText == '_fontname_') {
          fontText = font.name
        }
        console.log('fontText', fontText)
        bbox = bbox.bbox
        console.log('bbox', bbox, bbox.center(), 'font', font)

        let renderedText = renderTextLine(font, fontText, size)

        let displacementVector = renderedText.bbox.center().vectTo(bbox.center())
        console.log('displacementVector', displacementVector)
        renderedText = renderedText.move(displacementVector)
        texts.push(renderedText)
      }
      console.log('texts', texts)
      let ret = {
        fill: {
          curves: texts
            .map((curve) => curve.closedCurves)
            .flat()
            .map((curve) => curve.allComponents().map((curve) => curve.curve))
            .flat(),
          fill: {
            curves: texts.map((curve) => curve.closedCurves).flat(),
            direction: 35,
          },
          dontOptimize: true,
        },
      }
      console.log('ret', ret)
      return ret
    },
  )
  .withPens({
    fill: { pen: pens.Micron08, color: 'black' },
  })

export { TextTest }
