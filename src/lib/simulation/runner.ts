import { ShelterDesign, ClimateDataPoint, SimulationParams, SimulationResult, MaterialLayer, Assembly, Opening, PCMConfig } from '@/lib/physics/types';
import { runSimulation } from '@/lib/physics/thermal-solver';
import { calculateAssemblyR, calculateUValue } from '@/lib/physics/conduction';
import { ShelterShape, calculateGeometry } from '@/lib/geometry/calculator';

export interface SimulationInput {
  // Location
  latitude: number;
  longitude: number;
  altitude: number;
  utcOffset: number;
  
  // Climate
  climateData: ClimateDataPoint[];
  
  // Geometry
  shape: ShelterShape;
  length: number;
  width: number;
  height: number;
  azimuth: number;
  
  // Assemblies
  wallLayers: MaterialLayer[];
  roofLayers: MaterialLayer[];
  floorLayers: MaterialLayer[];
  
  // Openings
  openings: Opening[];
  
  // Occupancy
  occupancy: number;
  ventilationACH: number;
  
  // PCM (optional)
  pcmConfig?: PCMConfig;
  
  // Simulation
  timeStepSeconds: number;
  targetTempMin: number;
  targetTempMax: number;
  initialIndoorTemp: number;
}

export interface SimulationSummary {
  result: SimulationResult;
  design: ShelterDesign;
  // Derived metrics
  wallRValue: number;
  wallUValue: number;
  roofRValue: number;
  roofUValue: number;
  floorRValue: number;
  floorUValue: number;
  totalSimulationHours: number;
  comfortPercentage: number;
  avgHeatLoss: number;
  avgSolarGain: number;
  peakHeatLoss: number;
  peakHeatingPower: number;
}

export function buildShelterDesign(input: SimulationInput): ShelterDesign {
  const geometry = calculateGeometry(
    input.shape, input.length, input.width, input.height, input.azimuth
  );
  
  return {
    geometry,
    wallAssembly: { layers: input.wallLayers, type: 'wall' },
    roofAssembly: { layers: input.roofLayers, type: 'roof' },
    floorAssembly: { layers: input.floorLayers, type: 'floor' },
    openings: input.openings,
    occupancy: input.occupancy,
    ventilationACH: input.ventilationACH,
    pcmConfig: input.pcmConfig,
    altitude: input.altitude,
  };
}

export function executeSimulation(input: SimulationInput): SimulationSummary {
  const design = buildShelterDesign(input);
  
  const params: SimulationParams = {
    timeStepSeconds: input.timeStepSeconds,
    targetTempMin: input.targetTempMin,
    targetTempMax: input.targetTempMax,
    initialIndoorTemp: input.initialIndoorTemp,
  };
  
  const result = runSimulation(
    design, input.climateData, params,
    input.latitude, input.longitude, input.utcOffset
  );
  
  // Calculate R/U values
  const wallR = calculateAssemblyR(input.wallLayers, 'wall');
  const roofR = calculateAssemblyR(input.roofLayers, 'roof');
  const floorR = calculateAssemblyR(input.floorLayers, 'floor');
  
  const totalHours = result.timeHours.length > 0 
    ? result.timeHours[result.timeHours.length - 1] - result.timeHours[0] + input.timeStepSeconds / 3600
    : 0;
  
  return {
    result,
    design,
    wallRValue: wallR,
    wallUValue: calculateUValue(wallR),
    roofRValue: roofR,
    roofUValue: calculateUValue(roofR),
    floorRValue: floorR,
    floorUValue: calculateUValue(floorR),
    totalSimulationHours: totalHours,
    comfortPercentage: totalHours > 0 ? (result.comfortableHours / totalHours) * 100 : 0,
    avgHeatLoss: result.totalHeatLoss.length > 0 ? result.totalHeatLoss.reduce((a, b) => a + b, 0) / result.totalHeatLoss.length : 0,
    avgSolarGain: result.solarGainTotal.length > 0 ? result.solarGainTotal.reduce((a, b) => a + b, 0) / result.solarGainTotal.length : 0,
    peakHeatLoss: Math.max(...result.totalHeatLoss, 0),
    peakHeatingPower: Math.max(...result.heatingEnergyRequired, 0),
  };
}
