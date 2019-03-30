function handler(e) {
  console.log(e)
}

export function update() {
  const gamepads = navigator.getGamepads()
  console.log(update)
}

export function start() {
  window.addEventListener('gamepadconnected', handler)
  window.addEventListener('gamepaddisconnected', handler)
}

export function stop() {
  window.removeEventListener('gamepadconnected', handler)
  window.removeEventListener('gamepaddisconnected', handler)
}

export default {
  start,
  update,
  stop
}
