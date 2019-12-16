const MESSAGE_SIZE = 1024

const messages = new Array(MESSAGE_SIZE)
let messageIndex = 0

/**
 * Writes into the log.
 * @param {...} args
 */
function write(...args) {
  // console.log(...args)
  messages[messageIndex] = args.map(arg => `${arg}`).join(' ')
  messageIndex = (messageIndex + 1) % messages.length
}

/**
 * Renderiza el log en la pantalla.
 * @param {CanvasRenderingContext2D} cx
 */
function render(cx) {
  let y = 0
  let index = messageIndex - 1
  cx.font = '16px monospace'
  cx.textAlign = 'right'
  cx.textBaseline = 'top'
  cx.fillStyle = '#fff'
  do {
    if (index < 0) {
      index = messages.length - 1
    }
    cx.fillText(messages[index], cx.canvas.width, y)
    index--
    y += 16
  } while (index !== messageIndex)
}

export default {
  write,
  render
}
