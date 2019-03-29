/** @module utils/parse */

/**
 * Transform functions used to transform parsed params.
 * @readonly
 * @enum {Function}
 */
export const Transform = {
  identity: (value) => value,
  upperCase: (value) => value.toUpperCase(),
  lowerCase: (value) => value.toLowerCase(),
  integer: (value) => parseInt(value, 10),
  decimal: (value) => parseFloat(value)
}

/**
 * Textual parsing common expressions
 * @readonly
 * @enum {string}
 */
const Expression = {
  /** Natural numbers from 0 to +Infinity */
  NATURAL: '([0-9]+)',
  /** Integer numbers from -Infinity to +Infinity */
  INTEGER: '([-+]?[0-9]+)',
  /** Decimal numbers from -Infinity to +Infinity */
  DECIMAL: '([-+]?[0-9]+(?:\\.[0-9]+)?)',
  /** Version */
  VERSION: '([0-9]+\\.[0-9]+)',
  /** Boolean */
  BOOLEAN: '(on|off|true|false|yes|no)',
  /** Name */
  NAME: '([^\\s]+)',
  /** Any value */
  ANY: '(.*?)',
}

/**
 * Creates a `parseEntry` function from a parse function.
 * @param {Function} parse
 * @returns {Function}
 */
export function createParseEntry(parse) {
  return function({ dataView, start, size }) {
    return parse(dataView, start, size)
  }
}

/**
 * Parses the content of a text file.
 * @param {string} content
 * @param {string} initialState
 * @param {Object} states
 */
export function parseContent(content, initialState, states) {
  const lines = content.split('\n')

  let state = initialState
    , lineIndex = 0

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    // if the line is empty or it begins with a comment, then
    // we skip this line completely.
    if (!line.trim() ||
      line.trim().substr(0, 1) === '#') {
      continue
    }

    const stateFunction = states[state]
    state = stateFunction(line, lineIndex)
    if (!state) {
      break
    }
    lineIndex++
  }
}

/**
 * Parses a line
 * @param {string} format
 * @param {string} line
 * @returns {Array<string>}
 */
export function parseLine(format, line) {
  const transform = []
  const expression = format
    .replace(/^\s+/, '\\s*')
    .replace(/\s+/g, '\\s+')
    .replace(/$/, '\\s*(?:# .*)?')
    .replace(/\{(v|n|i|d|a|\*)\}/g, (fullMatch, type) => {
      switch(type) {
      case 'v':
        transform.push(Transform.identity)
        return Expression.VERSION
      case 'n':
        transform.push(Transform.integer)
        return Expression.NATURAL
      case 'i':
        transform.push(Transform.integer)
        return Expression.INTEGER
      case 'd':
        transform.push(Transform.decimal)
        return Expression.DECIMAL
      case 'a':
        transform.push(Transform.identity)
        return Expression.NAME
      case '*':
        transform.push(Transform.identity)
        return Expression.ANY
      default:
        return fullMatch
      }
    })
  //console.log(expression)
  const re = new RegExp(expression, 'i')
  const matches = line.match(re)
  //console.log(matches)
  if (matches) {
    const [, ...values] = matches
    return values.map((value, index) => transform[index](value))
  }
}

export default {
  createParseEntry,
  parseContent,
  parseLine,
}
