class Pen {
  constructor(name, spacing, xOffset, yOffset) {
    this.name = name
    this.spacing = spacing
    this.xOffset = xOffset
    this.yOffset = yOffset
    this.type = 'Pen'
  }
}

const pens = {
  Micron005: new Pen('Micron 005', 6, 0, 0), // baseline, everything is relateive to this position. The frame and combs are drawn with this pen
  Micron01: new Pen('Micron 01', 6, 3, -4),
  Micron05: new Pen('Micron 05', 15, 0, 0),
  Micron10: new Pen('Micron 10', 20, -5, 15),

  PilotG207: new Pen('Pilot G-2 07', 10, 10, -50),

  TonborABTProThin: new Pen('Tonbor ABT Pro Thin', 45, -20, -150),
  TonborABTProThick: new Pen('Tonbor ABT Pro Thick', 45, 15, 10),

  SharpieHighliter: new Pen('Sharpie Highliter', 20, 0, -50),
  SharpieCreativeMarker: new Pen('Sharpie Creative Marker', 25, 20, -75), // displacement can change depending on positioning
  UniballEcoJapanPen: new Pen("Uni-ball eco 'Japan' pen", 10, -5, 20),
  WexfordGelInkPen: new Pen('Wexford Gel Ink Pen', 10, 10, -30),
  BicBU3Grip: new Pen('Bic BU3 Grip', 7, 25, -110),
  SharpiePen: new Pen('Sharpie Pen', 10, 5, -25),

  BicIntensityFineTip: new Pen('Bic Intensity Fine Tip', 15, -5, 25), // displacement can vary
  BicIntensityBrushTip: new Pen('Bic Intensity Brush Tip', 30, 0, -45), // displacement can vary

  ZebraSarasaPen: new Pen('Zebra SARASA', 13, 30, -5),

  CrayolaSuperTips: new Pen('Crayola SuperTips', 25, -15, -5),
}

export { Pen, pens }
