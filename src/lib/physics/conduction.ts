import { Assembly, MaterialLayer } from './types';
import {
  R_SI_WALL, R_SE_WALL,
  R_SI_ROOF, R_SE_ROOF,
  R_SI_FLOOR, R_SE_FLOOR
} from './constants';

export function calculateLayerR(thickness_m: number, conductivity: number): number {
  return thickness_m / conductivity;
}

export function calculateAssemblyR(layers: MaterialLayer[], type: 'wall' | 'roof' | 'floor'): number {
  const rLayers = layers.reduce((acc, layer) => acc + calculateLayerR(layer.thickness, layer.conductivity), 0);
  let rSi = 0;
  let rSe = 0;

  switch (type) {
    case 'wall':
      rSi = R_SI_WALL;
      rSe = R_SE_WALL;
      break;
    case 'roof':
      rSi = R_SI_ROOF;
      rSe = R_SE_ROOF;
      break;
    case 'floor':
      rSi = R_SI_FLOOR;
      rSe = R_SE_FLOOR;
      break;
  }

  return rLayers + rSi + rSe;
}

export function calculateUValue(rTotal: number): number {
  if (rTotal <= 0) return 0;
  return 1 / rTotal;
}

export function calculateConductionLoss(uValue: number, area: number, tIn: number, tOut: number): number {
  // Positive means heat loss from inside to outside
  return uValue * area * (tIn - tOut);
}
