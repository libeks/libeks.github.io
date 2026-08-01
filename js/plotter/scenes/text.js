import { BBox } from '/js/bbox.js'
import { Point } from '/js/geometry.js'
import { pairs, circularPairs, zip } from '/js/utils.js'
import { StraightStroke } from '/js/lines.js'
import { Random } from '/js/random.js'

import { Scene } from '/js/plotter/scene.js'
import { pens } from '/js/plotter/pens.js'

import { renderText } from '/js/text/text.js'
import { palatinoFont, fonts } from '/js/text/fonts/fonts.js'

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
        default: 200,
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
        ],
        default: 'ASCII',
      },
    ],
    (params) => {
      let { bbox, start, size, text } = params
      text = text.value

      let bboxes = bbox.partition(Object.keys(fonts).length, 1)
      console.log('bboxes', bboxes)
      console.log('fonts', fonts)
      let texts = []
      for (let [bbox, font] of zip(bboxes, Object.values(fonts))) {
        bbox = bbox.bbox
        console.log('bbox', bbox, bbox.center(), 'font', font)

        let renderedText = renderText(font, text, size)

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
