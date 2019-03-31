/** @module files/inf */
import dataViewUtils from 'utils/dataView'
import { createParseEntry } from 'utils/parse'
import { parseContent, parseLine, isLine } from '../utils/parse'

/**
 * Parses an INF file.
 * @param {DataView} dataView
 * @param {number} start
 * @param {NumberConstructor} size
 */
export function parse(dataView, start, size) {
  const content = dataViewUtils.toString(dataView, start, size)
  let levelName
    , itemCount
    , items = []
    , item
    , isItemSequence = false

  function createItem(type, name, num) {
    return {
      type,
      name,
      num,
      className: null,
      action: null,
      speed: null,
      master: null,
      eventMask: null,
      center: null,
      clients: [],
      pages: [],
      sounds: [],
      messages: [],
      stops: []
    }
  }

  parseContent(content, 'version', {
    'version': (line) => {
      const [version] = parseLine('INF {v}', line)
      if (version !== '1.0') {
        throw new Error('Invalid INF version')
      }
      return 'level-name'
    },
    'level-name': (line) => {
      const [name] = parseLine('LEVELNAME {a}', line)
      levelName = name
      return 'item-count'
    },
    'item-count': (line) => {
      const [count] = parseLine('ITEMS {n}', line)
      itemCount = count
      if (count === 0) {
        return
      }
      return 'item'
    },
    'item': (line) => { // eslint-disable-line
      if (isLine(' item: {*} name: {*} num: {n}', line) && !isItemSequence) {
        const [type, name, num] = parseLine(' item: {*} name: {*} num: {n}', line)
        item = createItem(type, name, num)
      } else if (isLine(' item: {*} name: {*}', line) && !isItemSequence) {
        const [type, name] = parseLine(' item: {*} name: {*}', line)
        item = createItem(type, name, null)
      } else if (isLine(' seq', line) && !isItemSequence) {
        isItemSequence = true
      } else if (isLine(' seqend', line) && isItemSequence) {
        isItemSequence = false
        items.push(item)
        item = null
        if (items.length === itemCount) {
          return
        }
      } else if (isLine('  class: {*} {*}', line) && isItemSequence) {
        const [className, action] = parseLine('  class: {*} {*}', line)
        item.className = className
        item.action = action
      } else if (isLine('  class: {*}', line) && isItemSequence) {
        const [className] = parseLine('  class: {*}', line)
        item.className = className
      } else if (isLine('  client: {*}', line) && isItemSequence) {
        const [client] = parseLine('  client: {*}', line)
        item.clients.push(client)
      } else if (isLine('  stop: {*} {*}', line) && isItemSequence) {
        const [a, b] = parseLine('  stop: {*} {*}', line)
        item.stops.push([a, b])
      } else if (isLine('  page: {*} {*}', line) && isItemSequence) {
        const [a, b] = parseLine('  page: {*} {*}', line)
        item.pages.push([a, b])
      } else if (isLine('  speed: {n}', line) && isItemSequence) {
        const [speed] = parseLine('  speed: {n}', line)
        item.speed = speed
      } else if (isLine('  center: {n} {n}', line) && isItemSequence) {
        const [x,y] = parseLine('  center: {n} {n}', line)
        item.center = [x,y]
      } else if (isLine('  event_mask: {*}', line) && isItemSequence) {
        const [eventMask] = parseLine('  event_mask: {*}', line)
        item.eventMask = eventMask
      } else if (isLine('  master: {*}', line) && isItemSequence) {
        const [master] = parseLine('  master: {*}', line)
        item.master = master
      } else if (isLine('  sound: {*} {*}', line) && isItemSequence) {
        const [a, b] = parseLine('  sound: {*} {*}', line)
        item.sounds.push([a, b])
      } else if (isLine('  message: {*} {*} {*}', line) && isItemSequence) {
        const [a, b, c] = parseLine('  message: {*} {*} {*}', line)
        item.messages.push([a, b, c])
      } else if (isLine('  message: {*} {*}', line) && isItemSequence) {
        const [a, b] = parseLine('  message: {*} {*}', line)
        item.messages.push([a, b])
      } else if (isLine('  message: {*}', line) && isItemSequence) {
        const [a] = parseLine('  message: {*}', line)
        item.messages.push([a])
      }
      return 'item'
    }
  })
  return {
    name: levelName,
    itemCount,
    items
  }
}

export const parseEntry = createParseEntry(parse)

export default {
  parse,
  parseEntry,
}
