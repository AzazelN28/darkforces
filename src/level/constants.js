export const SectorFlagName = new Map([
  [0x01, 'SKY'],
  [0x02, 'DOOR'],
  [0x04, 'FIRE_REFLECTIVE'],
  [0x08, 'UNKNOWN_1'],
  [0x10, 'SKATING'],
  [0x40, 'EXPLODING_DOOR'],
  [0x800, 'KILLING_GROUND_FAST'],
  [0x1000, 'KILLING_GROUND_SLOW'],
  [0x80000, 'SECRET']
])

/**
 * Sector flags
 * @enum {number}
 */
export const SectorFlag = {
  /* First sector flag value */
  SKY: 0x01,
  DOOR: 0x02,
  FIRE_REFLECTIVE: 0x04,
  UNKNOWN_1: 0x08,
  SKATING: 0x10,
  EXPLODING_DOOR: 0x40,
  KILLING_GROUND_SLOW: 0x800,
  KILLING_GROUND_FAST: 0x1000,
  SECRET: 0x80000
  /* Second sector flag value */
  /* Third sector flag value */
}

export const WallFirstFlagName = new Map([
  [0x01, 'FORCE_MID'],
  [0x02, 'ILLUMINATED_SIGN'],
  [0x800, 'SHOW_AS_NORMAL']
])

/**
 * Wall flags.
 * @enum {number}
 */
export const WallFirstFlag = {
  FORCE_MID: 0x01,
  ILLUMINATED_SIGN: 0x02,
  SHOW_AS_NORMAL: 0x800,
}

export const WallSecondFlag = {
  CANNOT_WALK_THROUGH: 0x02,
  CANNOT_FIRE_THROUGH: 0x08
}

export default {
  SectorFlagName,
  SectorFlag,
  WallFirstFlagName,
  WallFirstFlag,
  WallSecondFlag,
}
