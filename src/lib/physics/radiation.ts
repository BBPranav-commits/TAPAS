import { STEFAN_BOLTZMANN } from './constants';

/**
 * Compute effective sky temperature using clear-sky emissivity models.
 * @param ambientTemp_C Ambient air temperature [°C]
 * @param cloudCover_fraction Cloud cover fraction [0-1] (NOT percentage)
 * @param dewPoint_C Dew point temperature [°C] (optional)
 * @returns Effective sky temperature [°C]
 */
export function skyTemperature(ambientTemp_C: number, cloudCover_fraction: number, dewPoint_C?: number): number {
  const tAmb_K = ambientTemp_C + 273.15;
  
  let emissivityClear = 0;
  if (dewPoint_C !== undefined) {
    // Berdahl-Martin (1984): uses dew point in CELSIUS
    emissivityClear = 0.711 + 0.56 * (dewPoint_C / 100) + 0.73 * Math.pow(dewPoint_C / 100, 2);
  } else {
    // Swinbank (1963)
    emissivityClear = 9.365e-6 * Math.pow(tAmb_K, 2);
  }
  
  emissivityClear = Math.max(0, Math.min(1, emissivityClear));
  const emissivitySky = emissivityClear + (1 - emissivityClear) * cloudCover_fraction;
  
  const tSky_K = tAmb_K * Math.pow(emissivitySky, 0.25);
  return tSky_K - 273.15;
}

/**
 * Net longwave radiation exchange with sky and ground.
 * Uses Stefan-Boltzmann law with geometric view factors.
 * @param emissivity Surface emissivity [-]
 * @param area Surface area [m²]
 * @param surfaceTemp_C Surface temperature [°C]
 * @param skyTemp_C Effective sky temperature [°C]
 * @param ambientTemp_C Ambient/ground temperature [°C]
 * @param surfaceTilt_deg Surface tilt from horizontal [degrees]
 * @returns Net longwave radiation loss [W]
 */
export function longWaveRadiationLoss(
  emissivity: number, area: number, surfaceTemp_C: number, 
  skyTemp_C: number, ambientTemp_C: number, surfaceTilt_deg: number
): number {
  const tSurf_K = surfaceTemp_C + 273.15;
  const tSky_K = skyTemp_C + 273.15;
  const tGround_K = ambientTemp_C + 273.15;
  
  const tilt_rad = surfaceTilt_deg * Math.PI / 180;
  const viewFactorSky = (1 + Math.cos(tilt_rad)) / 2;
  const viewFactorGround = (1 - Math.cos(tilt_rad)) / 2;
  
  const qSky = emissivity * STEFAN_BOLTZMANN * area * viewFactorSky * (Math.pow(tSurf_K, 4) - Math.pow(tSky_K, 4));
  const qGround = emissivity * STEFAN_BOLTZMANN * area * viewFactorGround * (Math.pow(tSurf_K, 4) - Math.pow(tGround_K, 4));
  
  return qSky + qGround;
}
