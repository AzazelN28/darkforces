const fs = require('fs')
const { promisify } = require('util')
const cui = require('./cui')

const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)

const Level = [
  'Secret Base',
  'Talay: Tak Base',
  'Anoat City',
  'Research Facility',
  'Gromas Mines',
  'Detention Center',
  'Ramsees Hed',
  'Robotics Facility',
  'Nar Shaddaa',
  'Jabba\'s Ship',
  'Imperial City',
  'Fuel Station',
  'The Executor',
  'The Arc Hammer'
]

const MAX_PILOTS = 14
const MAX_LEVELS = 15

/**
 *
 * @param {number} difficulty
 *
 */
function getLevelDifficulty(difficulty) {
  switch (difficulty) {
    default:
      throw new Error('Invalid difficulty level')
    case 0:
      return 'Easy'
    case 1:
      return 'Med'
    case 2:
      return 'Hard'
  }
}

function getName(buffer) {
  let name = ''
  for (let i = 0; i < buffer.byteLength; i++) {
    const value = buffer.readUInt8(i)
    if (value === 0) {
      return name
    }
    name += String.fromCharCode(value)
  }
  return name
}

function hasWeapon(weaponValue) {
  return weaponValue === 0xFF
}

function getWeapon(weaponValue) {
  return weaponValue ? 0xFF : 0x00
}

function readAgents(filePath) {
  return readFile('darkpilo.cfg').then((buffer) => {
    const signature = buffer.slice(0, 4).toString('ascii')
    if (signature !== 'PCF\u0012') {
      throw new Error('Invalid signature')
    }

    // Esto siempre es catorce
    const numPilots = buffer.readUInt8(4)
    const pilots = []
    for (let pilotIndex = 0; pilotIndex < numPilots; pilotIndex++) {
      const pilotOffset = 5 + (pilotIndex * 1067)
      const name = getName(buffer.slice(pilotOffset, pilotOffset + 18))
      if (!name)
        continue

      // Después del nombre hay 32 - 18 bytes que no valen para nada
      // y después hay dos enteros de 32 bits que indican el nivel en
      // el que te has quedado.
      const currentLevel = buffer.readUInt32LE(pilotOffset + 32)
      const maxLevel = buffer.readUInt32LE(pilotOffset + 36)

      // Obtenemos todos los niveles.
      const levels = []
      for (let levelIndex = 0; levelIndex < maxLevel; levelIndex++) {
        const difficulty = buffer.readUInt8(pilotOffset + 40 + levelIndex)

        const weaponStartOffset = 55
        const weaponOffset = levelIndex * 32
        const weapons = {
          bryarPistol: hasWeapon(buffer.readUInt8(pilotOffset + weaponStartOffset + weaponOffset)),
          blasterRifle: hasWeapon(buffer.readUInt8(pilotOffset + weaponStartOffset + weaponOffset + 1)),
          thermalDetonator: hasWeapon(buffer.readUInt8(pilotOffset + weaponStartOffset + weaponOffset + 2)),
          autoGun: hasWeapon(buffer.readUInt8(pilotOffset + weaponStartOffset + weaponOffset + 3)),
          mortarGun: hasWeapon(buffer.readUInt8(pilotOffset + weaponStartOffset + weaponOffset + 4)),
          fusionCutter: hasWeapon(buffer.readUInt8(pilotOffset + weaponStartOffset + weaponOffset + 5)),
          imMine: hasWeapon(buffer.readUInt8(pilotOffset + weaponStartOffset + weaponOffset + 6)),
          concussionRifle: hasWeapon(buffer.readUInt8(pilotOffset + weaponStartOffset + weaponOffset + 7)),
          assaultCannon: hasWeapon(buffer.readUInt8(pilotOffset + weaponStartOffset + weaponOffset + 8))
        }

        const lives = buffer.readUInt8(pilotOffset + weaponStartOffset + weaponOffset + 31)

        const ammoOffset = levelIndex * 40
        const ammoStartOffset = 55 + 448 + ammoOffset
        const ammunition = {
          energyUnit: buffer.readUInt32LE(pilotOffset + ammoStartOffset + ammoOffset),
          powerCell: buffer.readUInt32LE(pilotOffset + ammoStartOffset + ammoOffset + 4),
          plasmaCartridge: buffer.readUInt32LE(pilotOffset + ammoStartOffset + ammoOffset + 8),
          thermalDetonator: buffer.readUInt32LE(pilotOffset + ammoStartOffset + ammoOffset + 12), // max 50
          mortarShell: buffer.readUInt32LE(pilotOffset + ammoStartOffset + ammoOffset + 16), // max 50
          imMine: buffer.readUInt32LE(pilotOffset + ammoStartOffset + ammoOffset + 20),
          missile: buffer.readUInt32LE(pilotOffset + ammoStartOffset + ammoOffset + 24), // 8
        }

        const health = buffer.readUInt32LE(pilotOffset + ammoStartOffset + ammoOffset + 28)
        const shield = buffer.readUInt32LE(pilotOffset + ammoStartOffset + ammoOffset + 32)
        // 0x00 indica que el nivel todavía no se ha terminado
        // 0x02 indica que el nivel ya se ha terminado
        const state = buffer.readUInt16LE(pilotOffset + ammoStartOffset + ammoOffset + 38)

        levels.push({
          difficulty,
          health,
          shield,
          state,
          lives,
          weapons,
          ammunition,
        })
      }

      pilots.push({
        name,
        currentLevel,
        maxLevel,
        levels
      })
    }

    return pilots
  })
}

function writeAgents(filePath, pilots) {
  const buffer = Buffer.alloc(14943)
  buffer.write('PCF\u0012', 0)
  buffer.writeUInt8(0x0E, 4)
  for (let pilotIndex = 0; pilotIndex < MAX_PILOTS; pilotIndex++) {
    const pilotOffset = 5 + (pilotIndex * 1067)
    const pilot = pilots[pilotIndex]
    if (pilot) {
      buffer.write(pilot.name.substr(0, 18), pilotOffset)
      buffer.writeUInt32LE(pilot.currentLevel, pilotOffset + 32)
      buffer.writeUInt32LE(pilot.maxLevel, pilotOffset + 36)
      for (let levelIndex = 0; levelIndex < MAX_LEVELS; levelIndex++) {
        const level = pilot.levels[levelIndex]
        buffer.writeUInt8(level ? level.difficulty : 0x01, pilotOffset + 40 + levelIndex)
        if (level) {
          const weaponStartOffset = 55
          const weaponOffset = levelIndex * 32
          buffer.writeUInt8(level.lives, pilotOffset + weaponStartOffset + weaponOffset + 31)

          buffer.writeUInt8(getWeapon(level.weapons.bryarPistol), pilotOffset + weaponStartOffset + weaponOffset),
            buffer.writeUInt8(getWeapon(level.weapons.blasterRifle), pilotOffset + weaponStartOffset + weaponOffset + 1)
          buffer.writeUInt8(getWeapon(level.weapons.thermalDetonator), pilotOffset + weaponStartOffset + weaponOffset + 2)
          buffer.writeUInt8(getWeapon(level.weapons.autoGun), pilotOffset + weaponStartOffset + weaponOffset + 3)
          buffer.writeUInt8(getWeapon(level.weapons.mortarGun), pilotOffset + weaponStartOffset + weaponOffset + 4)
          buffer.writeUInt8(getWeapon(level.weapons.fusionCutter), pilotOffset + weaponStartOffset + weaponOffset + 5)
          buffer.writeUInt8(getWeapon(level.weapons.imMine), pilotOffset + weaponStartOffset + weaponOffset + 6)
          buffer.writeUInt8(getWeapon(level.weapons.concussionRifle), pilotOffset + weaponStartOffset + weaponOffset + 7)
          buffer.writeUInt8(getWeapon(level.weapons.assaultCannon), pilotOffset + weaponStartOffset + weaponOffset + 8)

          const ammoOffset = levelIndex * 40
          const ammoStartOffset = 55 + 448 + ammoOffset
          buffer.writeUInt32LE(level.ammunition.energyUnit, pilotOffset + ammoStartOffset + ammoOffset)
          buffer.writeUInt32LE(level.ammunition.powerCell, pilotOffset + ammoStartOffset + ammoOffset + 4)
          buffer.writeUInt32LE(level.ammunition.plasmaCartridge, pilotOffset + ammoStartOffset + ammoOffset + 8)
          buffer.writeUInt32LE(level.ammunition.thermalDetonator, pilotOffset + ammoStartOffset + ammoOffset + 12) // max 50
          buffer.writeUInt32LE(level.ammunition.mortarShell, pilotOffset + ammoStartOffset + ammoOffset + 16) // max 50
          buffer.writeUInt32LE(level.ammunition.imMine, pilotOffset + ammoStartOffset + ammoOffset + 20)
          buffer.writeUInt32LE(level.ammunition.missile, pilotOffset + ammoStartOffset + ammoOffset + 24) // 8

          buffer.writeUInt32LE(level.health, pilotOffset + ammoStartOffset + ammoOffset + 28)
          buffer.writeUInt32LE(level.shield, pilotOffset + ammoStartOffset + ammoOffset + 32)
          // 0x00 indica que el nivel todavía no se ha terminado
          // 0x02 indica que el nivel ya se ha terminado
          buffer.writeUInt16LE(level.state, pilotOffset + ammoStartOffset + ammoOffset + 38)
        }
      }
    }
  }
  return writeFile(filePath, buffer)
}

readAgents('darkpilo.cfg')
  .then((agents) => {
    //console.log(JSON.stringify(agents, null, 2))
    cui().then((ui) => {
      console.log(ui)
    })
    writeAgents('darkpilo.cft', agents)
  })
