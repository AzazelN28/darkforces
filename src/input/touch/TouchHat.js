import { clamp } from '../../utils/range'
import events from '../../utils/events'

const isTouchSupported = (() => {
  try {
    document.createEvent('TouchEvent')
    return true
  } catch (error) {
    return false
  }
})()

export default class TouchHat {
  constructor(element) {
    if (typeof element === 'string' || element instanceof String) {
      this.element = document.querySelector(element)
    } else {
      this.element = element
    }

    this.isDown = false

    //
    this.identifier = null
    this.current = [0, 0]
    this.previous = [0, 0]
    this.movement = [0, 0]

    this.area = this.element.parentElement
    this.areaRect = null

    this.position = [0, 0]
    this.value = [0, 0]

    this.handler = this.handler.bind(this)

    this.updateHatAreaRect()
  }

  handler(e) {
    //e.preventDefault()
    if (e.type === 'touchstart' ||
      (e.type === 'mousedown' && e.button === 0)) {
      this.down(e)
    } else if (e.type === 'touchmove' ||
      e.type === 'mousemove') {
      this.update(e)
    } else if (e.type === 'touchend' ||
      e.type === 'touchcancel' ||
      e.type === 'mouseup' ||
      e.type === 'mouseleave') {
      this.up(e)
    } else if (e.type === 'resize') {
      this.updateHatAreaRect()
    }
  }

  down(e) {
    if (!this.isDown) {
      this.isDown = true
      this.movement[0] = 0
      this.movement[1] = 0
      if (e.changedTouches) {
        this.identifier = e.changedTouches[0].identifier
        this.current[0] = this.previous[0] = e.changedTouches[0].clientX
        this.current[1] = this.previous[1] = e.changedTouches[0].clientY
      }
      if (isTouchSupported) {
        events.addEventListeners(window, ['touchmove', 'touchcancel', 'touchend'], this.handler)
      } else {
        e.preventDefault()
        window.addEventListener('mousemove', this.handler)
        window.addEventListener('mouseup', this.handler)
        document.body.addEventListener('mouseleave', this.handler)
      }
    }
  }

  up(e) {
    if (this.isDown) {
      if (isTouchSupported) {
        events.removeEventListeners(window, ['touchmove', 'touchcancel', 'touchend'], this.handler)
      } else {
        window.removeEventListener('mousemove', this.handler)
        window.removeEventListener('mouseup', this.handler)
        document.body.removeEventListener('mouseleave', this.handler)
      }
      this.resetPosition()
      this.updateHat()
      this.isDown = false
      this.identifier = null
    }
  }

  update(e) {
    if (e.changedTouches) {
      this.updatePositionFromTouchEvent(e)
    } else {
      this.updatePositionFromMouseEvent(e)
    }
    this.limitPosition()
    this.updateHat()
  }

  start() {
    this.element.addEventListener('mousedown', this.handler)
    if (isTouchSupported) {
      this.element.addEventListener('touchstart', this.handler)
    }
    window.addEventListener('resize', this.handler)
  }

  stop() {
    this.element.removeEventListener('mousedown', this.handler)
    if (isTouchSupported) {
      this.element.removeEventListener('touchstart', this.handler)
    }
    window.removeEventListener('resize', this.handler)
  }

  updateHatAreaRect() {
    this.areaRect = this.area.getBoundingClientRect()
  }

  updatePositionFromTouchEvent(e) {
    for (const touch of e.changedTouches) {
      if (touch.identifier === this.identifier) {
        this.previous[0] = this.current[0]
        this.previous[1] = this.current[1]
        this.current[0] = touch.clientX
        this.current[1] = touch.clientY
        this.movement[0] = this.current[0] - this.previous[0]
        this.movement[1] = this.current[1] - this.previous[1]
      }
    }
    this.position[0] += this.movement[0]
    this.position[1] += this.movement[1]
    this.updateValueFromPosition()
  }

  updatePositionFromMouseEvent(e) {
    this.position[0] += e.movementX
    this.position[1] += e.movementY
    this.updateValueFromPosition()
  }

  resetPosition() {
    this.position[0] = 0
    this.position[1] = 0
    this.updateValueFromPosition()
  }

  limitPosition() {
    this.position[0] = clamp(
      this.position[0],
      this.areaRect.width * -0.5,
      this.areaRect.width * 0.5
    )
    this.position[1] = clamp(
      this.position[1],
      this.areaRect.width * -0.5,
      this.areaRect.width * 0.5
    )
  }

  updateValueFromPosition() {
    this.value[0] = clamp(this.position[0] / this.areaRect.width * 2, -1, 1)
    this.value[1] = clamp(this.position[1] / this.areaRect.height * 2, -1, 1)
    console.log(this.value)
  }

  updateHat() {
    this.updateValueFromPosition()
    this.element.style.transform = `translate(${this.position[0]}px, ${this.position[1]}px)`
  }
}
