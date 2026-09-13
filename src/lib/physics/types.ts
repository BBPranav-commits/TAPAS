export interface MaterialLayer {
  name: string;
  thickness: number; // m
  conductivity: number; // W/mK
  density: number; // kg/m³
  specificHeat: number; // J/kgK
  emissivity: number;
  solarAbsorptivity: number;
}

export interface Assembly {
  layers: MaterialLayer[];
  type: 'wall' | 'roof' | 'floor';
}

export interface Opening {
  type: 'window' | 'door';
  area: number; // m²
  orientation: number; // deg
  uValue: number; // W/m²K
  shgc: number;
  airLeakage: number; // m³/s
}

export interface PCMConfig {
  material: string;
  mass: number; // kg
  meltingPoint: number; // °C
  transitionRange: number; // °C
  latentHeat: number; // J/kg
  cpSolid: number; // J/kgK
  cpLiquid: number; // J/kgK
  kSolid: number; // W/mK
  kLiquid: number; // W/mK
  density: number; // kg/m³
}

export interface PCMState {
  temperature: number; // °C
  meltFraction: number; // 0-1
  energyStored: number; // J
  phase: 'solid' | 'transition' | 'liquid';
  latentHeatContribution: number; // W
  remainingCapacity: number; // J
}

export interface ShelterGeometry {
  shape: string;
  length: number;
  width: number;
  height: number;
  azimuth: number;
  volume: number;
  wallArea: number;
  roofArea: number;
  floorArea: number;
  facesWithOrientations: { area: number; tilt: number; azimuth: number }[];
}

export interface ClimateDataPoint {
  time: Date;
  temperature: number; // °C
  ghi: number; // W/m²
  dni: number; // W/m²
  dhi: number; // W/m²
  windSpeed: number; // m/s
  humidity: number; // %
  cloudCover: number; // %
  dewPoint?: number; // °C
}

export interface SimulationParams {
  timeStepSeconds: number;
  targetTempMin: number; // °C
  targetTempMax: number; // °C
  initialIndoorTemp: number; // °C
}

export interface SimulationResult {
  timeHours: number[];
  indoorTemp: number[];
  ambientTemp: number[];
  solarIrradiance: number[];
  solarGainTotal: number[];
  totalHeatGain: number[];
  totalHeatLoss: number[];
  wallHeatLoss: number[];
  roofHeatLoss: number[];
  floorHeatLoss: number[];
  windowHeatLoss: number[];
  doorHeatLoss: number[];
  infiltrationLoss: number[];
  longwaveRadiationLoss: number[];
  internalGain: number[];
  pcmContribution: number[];
  pcmTemperature: number[];
  pcmMeltFraction: number[];
  pcmEnergyStored: number[];
  heatingEnergyRequired: number[];
  comfortableHours: number;
  totalHeatingEnergy_kWh: number;
  hoursRequiringHeating: number;
  maxIndoorTemp: number;
  minIndoorTemp: number;
  avgIndoorTemp: number;
}

export interface ShelterDesign {
  geometry: ShelterGeometry;
  wallAssembly: Assembly;
  roofAssembly: Assembly;
  floorAssembly: Assembly;
  openings: Opening[];
  occupancy: number;
  ventilationACH: number;
  pcmConfig?: PCMConfig;
  altitude: number;
}
