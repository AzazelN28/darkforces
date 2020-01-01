export function createCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

export function createCanvasContext(width, height, contextId, contextAttributes) {
  const canvas = createCanvas(width, height)
  const context = canvas.getContext(contextId, contextAttributes)
  return context
}

export function createCanvasFromImageData(imageData) {
  const context = createCanvasContext(imageData.width, imageData.height, '2d')
  context.putImageData(imageData, 0, 0)
  return context.canvas
}

export default {
  createCanvas,
  createCanvasContext,
  createCanvasFromImageData
}
