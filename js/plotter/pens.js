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
  Micron005: new Pen('Micron 005', 6, 0, 0, [
    'hsl(48, 12%, 15%)', // black
  ]), // baseline, everything is relateive to this position. The frame and combs are drawn with this pen
  Micron01: new Pen('Micron 01', 10, 3, -4, [
    // 'black', // faulty pen
    'hsl(200, 80%, 35%)', // blue
    'hsl(330, 50%, 50%)', // magenta
  ]), // black pen is faulty
  Micron05: new Pen('Micron 05', 15, 5, 0, [
    // 'black',
    'hsl(200, 100%, 30%)', // blue
    'hsl(330, 55%, 45%)', // magenta
    'hsl(42, 100%, 40%)', // yellow
  ]),
  Micron08: new Pen('Micron 08', 25, 0, 0, [
    // 'black',
    'hsl(42, 100%, 40%)', // yellow
    'hsl(208, 80%, 32%)', // cyan
    'hsl(330, 80%, 60%)', // magenta
  ]), // TODO: offsets might be inaccurate, haven't yet done a test plot
  Micron10: new Pen('Micron 10', 25, 10, 0, [
    'hsl(160, 10%, 10%)', // black
    'hsl(50, 10%, 40%)', // gray
  ]),

  // PilotG207: new Pen('Pilot G-2 07', 10, 10, -50, ['black']),

  // TonborABTProThin: new Pen('Tonbor ABT Pro Thin', 45, -20, -150, ['black']),
  // TonborABTProThick: new Pen('Tonbor ABT Pro Thick', 45, 15, 10, ['black']),

  // SharpieHighliter: new Pen('Sharpie Highliter', 20, 0, -50, ['black']),
  // SharpieCreativeMarker: new Pen('Sharpie Creative Marker', 25, 20, -75, ['black']), // displacement can change depending on positioning
  // UniballEcoJapanPen: new Pen("Uni-ball eco 'Japan' pen", 10, -5, 20, ['black']),
  // WexfordGelInkPen: new Pen('Wexford Gel Ink Pen', 10, 10, -30, ['black']),
  // BicBU3Grip: new Pen('Bic BU3 Grip', 7, 25, -110, ['black']),
  // SharpiePen: new Pen('Sharpie Pen', 10, 5, -25, ['black']),

  BicIntensityFineTip: new Pen('Bic Intensity Fine Tip', 15, -5, 10, [
    'hsl(336, 10%, 20%)', // black
    'hsl(230, 70%, 30%)', // dark blue
    'hsl(1, 74%, 40%)', // red
    'hsl(341, 65%, 50%)', // pink
    'hsl(43, 80%, 50%)', // yellow
    'hsl(123, 55%, 30%)', // green
  ]), // displacement can vary
  BicIntensityBrushTip: new Pen('Bic Intensity Brush Tip', 30, 0, -45, [
    'hsl(336, 10%, 20%)', // black
    'hsl(230, 70%, 30%)', // dark blue
    'hsl(1, 74%, 40%)', // red
    'hsl(341, 65%, 50%)', // pink
    'hsl(43, 80%, 50%)', // yellow
    'hsl(123, 55%, 30%)', // green
  ]), // displacement can vary

  PencoGlider08: new Pen('Penco Glider 0.8', 8, 0, 0, [
    'hsl(90, 2%, 35%)', // gray
    'black',
  ]),

  PentelPulaMan: new Pen('Pentel Pula Man', 10, 0, 10, [
    'hsl(0, 0%, 15%)', // black
  ]),

  ZebraSarasaPen: new Pen('Zebra SARASA', 13, -5, 30, [
    'hsl(357, 60%, 50%)', // red
    'hsl(25, 60%, 55%)', // orange
    'hsl(51, 70%, 54%)', // yellow
    'hsl(77, 70%, 40%)', // olive
    'hsl(167, 50%, 55%)', // baby green
    'hsl(206, 55%, 55%)', // light blue
    'hsl(220, 45%, 50%)', // dark blue
    'hsl(260, 30%, 45%)', // violet
    'hsl(325, 35%, 65%)', // pink
    'hsl(50, 5%, 35%)', // gray
  ]),

  CrayolaSuperTips: new Pen('Crayola SuperTips', 22, 5, -15, [
    'hsl(3, 65%, 40%)', // dark red
    'hsl(355, 75%, 45%)', // red
    'hsl(20, 95%, 40%)', // orange
    'hsl(37, 90%, 50%)', // carrot orange
    'hsl(50, 100%, 40%)', // yellow
    'hsl(70, 100%, 25%)', // light olive
    'hsl(73, 60%, 30%)', // dark olive
    'hsl(161, 70%, 40%)', // baby green
    'hsl(175, 95%, 25%)', // pine green
    'hsl(200, 85%, 40%)', // cornflower blue

    'hsl(215, 80%, 35%)', // blue
    'hsl(248, 50%, 50%)', // violet
    'hsl(240, 35%, 64%)', // ube
    'hsl(300, 50%, 50%)', // Purple plum
    'hsl(350, 40%, 60%)', // old rose
    'hsl(12, 40%, 70%)', // dark salmon
    'hsl(22, 65%, 50%)', // copper red
    'hsl(14, 65%, 40%)', // chestnut
    'hsl(25, 10%, 50%)', // gray
    'hsl(72, 5%, 30%)', // black
  ]),
}

export { Pen, pens }
