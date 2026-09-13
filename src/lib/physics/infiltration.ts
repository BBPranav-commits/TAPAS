import { Opening } from './types';
import { airDensityAtAltitude, AIR_SPECIFIC_HEAT } from './constants';

/** ACH-based infiltration heat loss [W] */
export function infiltrationHeatLoss(ach: number, volume: number, tIn: number, tOut: number, altitude: number): number {
  const rho = airDensityAtAltitude(altitude);
  const volumeFlowRate = (ach * volume) / 3600; // m³/s
  return volumeFlowRate * rho * AIR_SPECIFIC_HEAT * (tIn - tOut);
}

/** Opening air leakage heat loss [W] */
export function openingLeakageLoss(openings: Opening[], tIn: number, tOut: number, altitude: number): number {
  let totalLeakage = 0;
  for (const opening of openings) {
    totalLeakage += opening.airLeakage;
  }
  const rho = airDensityAtAltitude(altitude);
  return totalLeakage * rho * AIR_SPECIFIC_HEAT * (tIn - tOut);
}
