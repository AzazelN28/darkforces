export default function size(value, decimals = 2) {
  const step = 1024
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const index = Math.floor(Math.log(value) / Math.log(step))
  return `${(value / Math.pow(step, index)).toFixed(decimals)} ${units[index]}`
}
