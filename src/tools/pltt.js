const fs = require('fs')

const content = fs.readFileSync(process.argv[2])
const firstColor = content.readUInt8(0)
const secondColor = content.readUInt8(1)

const numColors = secondColor - firstColor

const colors = []
for (let index = 0; index < numColors; index++) {
  const r = content.readUInt8(2 + (index * 3) + 0)
  const g = content.readUInt8(2 + (index * 3) + 1)
  const b = content.readUInt8(2 + (index * 3) + 2)
  colors.push([r, g, b])
}


