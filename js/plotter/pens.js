class Pen {
  constructor(name, spacing, xOffset, yOffset, colors) {
    this.name = name
    this.spacing = spacing
    this.xOffset = xOffset
    this.yOffset = yOffset
    this.type = 'Pen'
    this.colors = colors
  }

  // the transform property of the <g> element, to position the pen correctly relative to the comb
  transform() {
    return `translate(${-this.xOffset} ${-this.yOffset})`
  }
}

const pens = {
  // all units here fit 10000 = 8in
  // pen parameters are (name, spacing, xOffset, yOffset)
  Micron005: new Pen('Micron 005', 6, 0, 0, ['black']), // baseline, everything is relateive to this position. The frame and combs are drawn with this pen
  Micron01: new Pen('Micron 01', 6, 3, -4, ['black']),
  Micron05: new Pen('Micron 05', 15, 0, 0, ['black']),
  Micron08: new Pen('Micron 08', 20, 0, 0, [
    'black',
    'hsl(42, 100%, 40%)', // yellow
    'hsl(208, 80%, 32%)', // cyan
    'hsl(330, 80%, 60%)', // magenta
  ]), // TODO: offsets might be inaccurate, haven't yet done a test plot
  Micron10: new Pen('Micron 10', 20, -5, 15, ['black']),

  PilotG207: new Pen('Pilot G-2 07', 10, 10, -50, ['black']),

  TonborABTProThin: new Pen('Tonbor ABT Pro Thin', 45, -20, -150, ['black']),
  TonborABTProThick: new Pen('Tonbor ABT Pro Thick', 45, 15, 10, ['black']),

  SharpieHighliter: new Pen('Sharpie Highliter', 20, 0, -50, ['black']),
  SharpieCreativeMarker: new Pen('Sharpie Creative Marker', 25, 20, -75, ['black']), // displacement can change depending on positioning
  UniballEcoJapanPen: new Pen("Uni-ball eco 'Japan' pen", 10, -5, 20, ['black']),
  WexfordGelInkPen: new Pen('Wexford Gel Ink Pen', 10, 10, -30, ['black']),
  BicBU3Grip: new Pen('Bic BU3 Grip', 7, 25, -110, ['black']),
  SharpiePen: new Pen('Sharpie Pen', 10, 5, -25, ['black']),

  BicIntensityFineTip: new Pen('Bic Intensity Fine Tip', 15, -5, 25, ['black']), // displacement can vary
  BicIntensityBrushTip: new Pen('Bic Intensity Brush Tip', 30, 0, -45, ['black']), // displacement can vary

  ZebraSarasaPen: new Pen('Zebra SARASA', 13, 30, -5, ['black']),

  CrayolaSuperTips: new Pen('Crayola SuperTips', 25, -15, -5, ['black']),
}

export { Pen, pens }
