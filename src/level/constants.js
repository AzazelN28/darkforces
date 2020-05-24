/**
 * Light values
 * @readonly
 * @enum {number}
 */
export const Light = {
  MIN: 0,
  MAX: 31
}

/**
 * Sector flags
 * @readonly
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

/**
 * Wall flags.
 * @readonly
 * @enum {number}
 */
export const WallFlag = {
  FORCE_MID: 0x01,
  ILLUMINATED_SIGN: 0x02,
  SHOW_AS_NORMAL: 0x800,

  CANNOT_WALK_THROUGH: 0x02,
  CANNOT_FIRE_THROUGH: 0x08
}

export default {
  SectorFlag,
  WallFlag
}
