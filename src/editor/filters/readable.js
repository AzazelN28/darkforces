const numberFormat = new Intl.NumberFormat('en')

export default function readable(value) {
  return numberFormat.format(value)
}
