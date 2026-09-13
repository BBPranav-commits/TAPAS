import { ShelterDesign, ClimateDataPoint, SimulationParams, SimulationResult, PCMState } from './types';
import { calculateAssemblyR, calculateUValue, calculateConductionLoss } from './conduction';
import { calculateAllSolarGains } from './solar';
import { skyTemperature, longWaveRadiationLoss } from './radiation';
import { infiltrationHeatLoss, openingLeakageLoss } from './infiltration';
import { createInitialPCMState, stepPCM, getPCMHeatContribution } from './pcm';
import { OCCUPANT_HEAT_GAIN, AIR_SPECIFIC_HEAT, airDensityAtAltitude } from './constants';

export function runSimulation(
  design: ShelterDesign,
  climate: ClimateDataPoint[],
  params: SimulationParams,
  latitude: number,
  longitude: number,
  utcOffset: number
): SimulationResult {
  const uWall = calculateUValue(calculateAssemblyR(design.wallAssembly.layers, 'wall'));
  const uRoof = calculateUValue(calculateAssemblyR(design.roofAssembly.layers, 'roof'));
  const uFloor = calculateUValue(calculateAssemblyR(design.floorAssembly.layers, 'floor'));

  let pcmState: PCMState | null = null;
  if (design.pcmConfig) {
    pcmState = createInitialPCMState(design.pcmConfig, params.initialIndoorTemp);
  }

  // Thermal mass: sum ALL layers of each assembly
  let cThermal = 0;
  for (const layer of design.wallAssembly.layers) {
    cThermal += layer.density * layer.specificHeat * (design.geometry.wallArea * layer.thickness);
  }
  for (const layer of design.roofAssembly.layers) {
    cThermal += layer.density * layer.specificHeat * (design.geometry.roofArea * layer.thickness);
  }
  for (const layer of design.floorAssembly.layers) {
    cThermal += layer.density * layer.specificHeat * (design.geometry.floorArea * layer.thickness);
  }
  // Add indoor air thermal mass
  cThermal += airDensityAtAltitude(design.altitude) * AIR_SPECIFIC_HEAT * design.geometry.volume;
  // Minimum thermal mass to prevent division instabilities
  cThermal = Math.max(cThermal, 10000);

  let tIndoor = params.initialIndoorTemp;

  const result: SimulationResult = {
    timeHours: [],
    indoorTemp: [],
    ambientTemp: [],
    solarIrradiance: [],
    solarGainTotal: [],
    totalHeatGain: [],
    totalHeatLoss: [],
    wallHeatLoss: [],
    roofHeatLoss: [],
    floorHeatLoss: [],
    windowHeatLoss: [],
    doorHeatLoss: [],
    infiltrationLoss: [],
    longwaveRadiationLoss: [],
    internalGain: [],
    pcmContribution: [],
    pcmTemperature: [],
    pcmMeltFraction: [],
    pcmEnergyStored: [],
    heatingEnergyRequired: [],
    comfortableHours: 0,
    totalHeatingEnergy_kWh: 0,
    hoursRequiringHeating: 0,
    maxIndoorTemp: -100,
    minIndoorTemp: 100,
    avgIndoorTemp: 0
  };

  const dt = params.timeStepSeconds;
  let totalIndoorTemp = 0;

  for (let i = 0; i < climate.length; i++) {
    const point = climate[i];
    const timeHours = i * dt / 3600;

    const solarRes = calculateAllSolarGains(point, design, latitude, longitude, utcOffset);
    
    // Conduction losses
    const qWallLoss = calculateConductionLoss(uWall, design.geometry.wallArea, tIndoor, point.temperature);
    const qRoofLoss = calculateConductionLoss(uRoof, design.geometry.roofArea, tIndoor, point.temperature);
    const qFloorLoss = calculateConductionLoss(uFloor, design.geometry.floorArea, tIndoor, point.temperature);

    let qWindowLoss = 0;
    let qDoorLoss = 0;
    for (const op of design.openings) {
      if (op.type === 'window') {
        qWindowLoss += calculateConductionLoss(op.uValue, op.area, tIndoor, point.temperature);
      } else {
        qDoorLoss += calculateConductionLoss(op.uValue, op.area, tIndoor, point.temperature);
      }
    }

    // Infiltration (altitude-corrected)
    const qInfilLoss = infiltrationHeatLoss(design.ventilationACH, design.geometry.volume, tIndoor, point.temperature, design.altitude);
    const qLeakLoss = openingLeakageLoss(design.openings, tIndoor, point.temperature, design.altitude);

    // Internal gains
    const qInternal = design.occupancy * OCCUPANT_HEAT_GAIN;

    // Longwave radiation (cloud cover: convert % to fraction)
    const cloudFraction = Math.min(1, Math.max(0, point.cloudCover / 100));
    const tSky = skyTemperature(point.temperature, cloudFraction, point.dewPoint);
    let qLongwaveLoss = 0;
    if (design.roofAssembly.layers.length > 0) {
      qLongwaveLoss += longWaveRadiationLoss(
        design.roofAssembly.layers[0].emissivity, 
        design.geometry.roofArea, 
        tIndoor, tSky, point.temperature, 0
      );
    }

    // PCM contribution (FIXED sign convention)
    // getPCMHeatContribution returns: positive = PCM releases heat to zone
    let qPcmContrib = 0;
    if (pcmState && design.pcmConfig) {
      // Heat flow FROM PCM TO zone (positive = warms zone)
      qPcmContrib = getPCMHeatContribution(pcmState, tIndoor, design.pcmConfig);
      // Heat flow INTO PCM = negative of heat flowing to zone
      const heatFlowIntoPCM = -qPcmContrib;
      const pcmUpdate = stepPCM(pcmState, heatFlowIntoPCM, dt, design.pcmConfig);
      pcmState = pcmUpdate.newState;
    }

    // Solar gains
    const qSolarGain = solarRes.totalSolarGain;

    // Energy balance
    const totalLoss = qWallLoss + qRoofLoss + qFloorLoss + qWindowLoss + qDoorLoss + qInfilLoss + qLeakLoss + qLongwaveLoss;
    const totalGain = qInternal + qSolarGain + qPcmContrib;
    
    const qNet = totalGain - totalLoss;

    // Update indoor temperature
    tIndoor = tIndoor + (dt * qNet) / cThermal;

    // External heating to maintain comfort
    let heatingNeeded = 0;
    if (tIndoor < params.targetTempMin) {
      heatingNeeded = (cThermal * (params.targetTempMin - tIndoor)) / dt;
      tIndoor = params.targetTempMin;
    }

    // Comfort tracking
    if (tIndoor >= params.targetTempMin && tIndoor <= params.targetTempMax) {
      result.comfortableHours += (dt / 3600);
    }

    if (heatingNeeded > 0) {
      result.hoursRequiringHeating += (dt / 3600);
      result.totalHeatingEnergy_kWh += (heatingNeeded * dt) / 3600000;
    }

    // Record results
    result.timeHours.push(timeHours);
    result.indoorTemp.push(tIndoor);
    result.ambientTemp.push(point.temperature);
    result.solarIrradiance.push(point.ghi);
    result.solarGainTotal.push(qSolarGain);
    result.totalHeatGain.push(totalGain);
    result.totalHeatLoss.push(totalLoss);
    result.wallHeatLoss.push(qWallLoss);
    result.roofHeatLoss.push(qRoofLoss);
    result.floorHeatLoss.push(qFloorLoss);
    result.windowHeatLoss.push(qWindowLoss);
    result.doorHeatLoss.push(qDoorLoss);
    result.infiltrationLoss.push(qInfilLoss + qLeakLoss);
    result.longwaveRadiationLoss.push(qLongwaveLoss);
    result.internalGain.push(qInternal);
    result.heatingEnergyRequired.push(heatingNeeded);
    
    if (pcmState) {
      result.pcmContribution.push(qPcmContrib);
      result.pcmTemperature.push(pcmState.temperature);
      result.pcmMeltFraction.push(pcmState.meltFraction);
      result.pcmEnergyStored.push(pcmState.energyStored);
    } else {
      result.pcmContribution.push(0);
      result.pcmTemperature.push(0);
      result.pcmMeltFraction.push(0);
      result.pcmEnergyStored.push(0);
    }

    result.maxIndoorTemp = Math.max(result.maxIndoorTemp, tIndoor);
    result.minIndoorTemp = Math.min(result.minIndoorTemp, tIndoor);
    totalIndoorTemp += tIndoor;
  }

  if (climate.length > 0) {
    result.avgIndoorTemp = totalIndoorTemp / climate.length;
  }

  return result;
}
