/** @module utils/parse */

/**
 * Cache used to accelerate line parsing.
 * @readonly
 * @type {Map}
 */
const regExpCache = new Map()

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
  decimal: (value) => parseFloat(value),
  boolean: (value) => /on|true|yes/.test(value)
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
  ANY: '([\\S]+)',
  /** Any (but greedy) */
  ANY_GREEDE: '(.*)',
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
  const lines = content
    .replace(/^#(.*?)\n/gm, '') // remove comments that begin with #
    .replace(/\/\*([\s\S]*?)\*\//g, '') // remove multiline comments
    .split('\n')

  let state = initialState
    , lineIndex = 0

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    // if the line is empty or it begins with a comment, then
    // we skip this line completely.
    if (!line.trim()
      || line.trim().substr(0, 1) === '#') {
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
 * Retorna la expresión regular.
 * @param {*} format
 * @returns {RegExp}
 */
export function getRegExp(format) {
  if (regExpCache.has(format)) {
    return regExpCache.get(format)
  }
  const transform = []
  const expression = format
    .replace(/^\s+/, '\\s*')
    .replace(/\s+/g, '\\s+')
    .replace(/$/, '\\s*(?:# .*)?')
    .replace(/\{(.*?)\}/g, (_, type) => {
      switch (type) {
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
      case 'b':
        transform.push(Transform.boolean)
        return Expression.BOOLEAN
      case 'a':
        transform.push(Transform.identity)
        return Expression.NAME
      case '**':
        transform.push(Transform.identity)
        return Expression.ANY_GREEDE
      case '*':
        transform.push(Transform.identity)
        return Expression.ANY
      default:
        transform.push(Transform.identity)
        return type
      }
    })
  // console.log(expression)
  const value = {
    re: new RegExp(expression, 'i'),
    transform
  }
  regExpCache.set(format, value)
  return value
}

/**
 * Returns if a line follows the current format
 * @param {*} format
 * @param {*} line
 */
export function isLine(format, line) {
  const { re } = getRegExp(format)
  return re.test(line)
}

/**
 * Parses a line
 * @param {string} format
 * @param {string} line
 * @returns {Array<string>}
 */
export function parseLine(format, line) {
  const { re, transform } = getRegExp(format)
  const matches = line.match(re)
  // console.log(matches, transform)
  if (matches) {
    const [, ...values] = matches
    return values.map((value, index) => {
      //console.log(index, transform[index], value)
      return transform[index](value)
    })
  }
  return []
}

export default {
  createParseEntry,
  parseContent,
  isLine,
  parseLine,
}
