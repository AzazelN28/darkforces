/** @module files/inf */
import dataViewUtils from 'utils/dataView'
import { createParseEntry } from 'utils/parse'

export function parse(dataView, start, size) {

}

export const parseEntry = createParseEntry(parse)

export default {
  parse,
  parseEntry,
}
