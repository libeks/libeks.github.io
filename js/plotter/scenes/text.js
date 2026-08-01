import { BBox } from '/js/bbox.js'
import { Point } from '/js/geometry.js'
import { pairs, circularPairs } from '/js/utils.js'
import { StraightStroke } from '/js/lines.js'
import { Random } from '/js/random.js'

import { Scene } from '/js/plotter/scene.js'
import { pens } from '/js/plotter/pens.js'

import { renderText } from '/js/text/text.js'
import { palatinoFont } from '/js/text/fonts/fonts.js'

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
      console.log('TextTest text', text)

      let renderedText = renderText(palatinoFont, text, size)

      console.log('renderedText', renderedText, renderedText.bbox)
      let displacementVector = renderedText.bbox.center().vectTo(bbox.center())
      renderedText = renderedText.move(displacementVector)
      let ret = {
        fill: {
          curves: renderedText.closedCurves
            .map((curve) => curve.allComponents().map((curve) => curve.curve))
            .flat(),
          fill: {
            curves: renderedText.closedCurves,
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
    fill: { pen: pens.Micron08, color: 'hsl(42, 100%, 40%)' },
  })

export { TextTest }
