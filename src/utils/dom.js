export function getElement(element) {
  if (typeof element === 'string' || element instanceof String) {
    return document.querySelector(element)
  }
  return element
}

export default {
  getElement
}
