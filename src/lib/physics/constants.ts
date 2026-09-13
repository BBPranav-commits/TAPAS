export const STEFAN_BOLTZMANN = 5.670374419e-8;
export const AIR_DENSITY_SEA_LEVEL = 1.225;
export const AIR_SPECIFIC_HEAT = 1005;

// Surface resistances in (m²K)/W
export const R_SI_WALL = 0.13;
export const R_SE_WALL = 0.04;
export const R_SI_ROOF = 0.10;
export const R_SE_ROOF = 0.04;
export const R_SI_FLOOR = 0.17;
export const R_SE_FLOOR = 0.04;

export const OCCUPANT_HEAT_GAIN = 100; // W
export const GROUND_REFLECTANCE = 0.2;
export const SNOW_REFLECTANCE = 0.7;

export function airDensityAtAltitude(altitude_m: number): number {
  return AIR_DENSITY_SEA_LEVEL * Math.exp(-altitude_m / 8500);
}
