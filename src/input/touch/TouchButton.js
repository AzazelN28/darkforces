import touch from '../touch'
import { getElement } from '../../utils/dom'
import events from '../../utils/events'

const isTouchSupported = touch.isEnabled()

export default class TouchButton {
  constructor(element) {
    this.element = getElement(element)
    this.isDown = false
    this.value = 0

    this.handler = this.handler.bind(this)
  }

  handler(e) {
    if (e.type === 'touchstart'
     || e.type === 'mousedown') {
      this.down(e)
    } else if (e.type === 'touchend'
            || e.type === 'touchcancel'
            || e.type === 'mouseup'
            || e.type === 'mouseleave') {
      this.up(e)
    }
  }

  down() {
    this.isDown = true
    this.value = 1
    if (isTouchSupported) {
      events.addEventListeners(window, ['touchcancel', 'touchend'], this.handler)
    }
    window.addEventListener('mouseup', this.handler)
    document.body.addEventListener('mouseleave', this.handler)
  }

  up() {
    this.isDown = false
    this.value = 0
    if (isTouchSupported) {
      events.removeEventListeners(window, ['touchcancel', 'touchend'], this.handler)
    }
    window.removeEventListener('mouseup', this.handler)
    document.body.removeEventListener('mouseleave', this.handler)
  }

  start() {
    this.element.addEventListener('mousedown', this.handler)
    if (isTouchSupported) {
      this.element.addEventListener('touchstart', this.handler)
    }
  }

  stop() {
    this.element.removeEventListener('mousedown', this.handler)
    if (isTouchSupported) {
      this.element.removeEventListener('touchstart', this.handler)
    }
  }

}
