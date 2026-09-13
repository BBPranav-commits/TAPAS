import { PCMConfig, PCMState } from './types';

/**
 * Create initial PCM state based on configuration and initial temperature.
 */
export function createInitialPCMState(config: PCMConfig, initialTemp: number): PCMState {
  let phase: 'solid' | 'transition' | 'liquid' = 'solid';
  let meltFraction = 0;
  let energyStored = 0;
  
  if (initialTemp > config.meltingPoint + config.transitionRange) {
    phase = 'liquid';
    meltFraction = 1;
    // Sensible heat from reference (0°C) to melting + latent + sensible to current
    energyStored = config.mass * config.cpSolid * config.meltingPoint
      + config.mass * config.latentHeat
      + config.mass * config.cpLiquid * (initialTemp - config.meltingPoint - config.transitionRange);
  } else if (initialTemp > config.meltingPoint) {
    phase = 'transition';
    meltFraction = (initialTemp - config.meltingPoint) / config.transitionRange;
    energyStored = config.mass * config.cpSolid * config.meltingPoint
      + config.mass * config.latentHeat * meltFraction;
  } else {
    energyStored = config.mass * config.cpSolid * initialTemp;
  }

  return {
    temperature: initialTemp,
    meltFraction,
    energyStored,
    phase,
    latentHeatContribution: 0,
    remainingCapacity: config.latentHeat * config.mass * (1 - meltFraction)
  };
}

/**
 * Step PCM state forward by dt seconds given heat flow into the PCM.
 * @param state Current PCM state
 * @param heatFlowIntoPCM Heat flow rate INTO the PCM [W] (positive = PCM absorbs heat)
 * @param dt Time step [s]
 * @param config PCM configuration
 */
export function stepPCM(state: PCMState, heatFlowIntoPCM: number, dt: number, config: PCMConfig): { newState: PCMState, heatAbsorbed: number } {
  const newState = { ...state };
  const energyInput = heatFlowIntoPCM * dt; // Joules
  let energyAbsorbed = 0;

  if (newState.phase === 'solid') {
    const heatCap = config.mass * config.cpSolid;
    const sensibleMax = heatCap * (config.meltingPoint - newState.temperature);
    
    if (energyInput >= 0 && energyInput <= sensibleMax) {
      newState.temperature += energyInput / heatCap;
      energyAbsorbed = energyInput;
    } else if (energyInput > sensibleMax) {
      newState.temperature = config.meltingPoint;
      newState.phase = 'transition';
      const remainingEnergy = energyInput - sensibleMax;
      energyAbsorbed = sensibleMax;
      
      const latentCap = config.mass * config.latentHeat;
      const latentFraction = remainingEnergy / latentCap;
      
      if (latentFraction <= 1) {
        newState.meltFraction = latentFraction;
        newState.temperature = config.meltingPoint + latentFraction * config.transitionRange;
        energyAbsorbed += remainingEnergy;
      } else {
        newState.meltFraction = 1;
        newState.phase = 'liquid';
        const sensibleLiquidEnergy = remainingEnergy - latentCap;
        energyAbsorbed += latentCap;
        const heatCapLiq = config.mass * config.cpLiquid;
        newState.temperature = config.meltingPoint + config.transitionRange + (sensibleLiquidEnergy / heatCapLiq);
        energyAbsorbed += sensibleLiquidEnergy;
      }
    } else {
      // Cooling in solid phase
      newState.temperature += energyInput / heatCap;
      energyAbsorbed = energyInput;
    }
  } else if (newState.phase === 'liquid') {
    if (energyInput < 0) {
      const heatCap = config.mass * config.cpLiquid;
      const sensibleMax = heatCap * (newState.temperature - (config.meltingPoint + config.transitionRange));
      
      if (-energyInput <= sensibleMax) {
        newState.temperature += energyInput / heatCap;
        energyAbsorbed = energyInput;
      } else {
        newState.temperature = config.meltingPoint + config.transitionRange;
        newState.phase = 'transition';
        const remainingEnergy = energyInput + sensibleMax; // negative
        energyAbsorbed = -sensibleMax;
        
        const latentCap = config.mass * config.latentHeat;
        const latentFraction = remainingEnergy / latentCap; // negative
        
        if (1 + latentFraction >= 0) {
          newState.meltFraction = 1 + latentFraction;
          newState.temperature = config.meltingPoint + newState.meltFraction * config.transitionRange;
          energyAbsorbed += remainingEnergy;
        } else {
          newState.meltFraction = 0;
          newState.phase = 'solid';
          const sensibleSolidEnergy = remainingEnergy + latentCap;
          energyAbsorbed += -latentCap;
          const heatCapSolid = config.mass * config.cpSolid;
          newState.temperature = config.meltingPoint + (sensibleSolidEnergy / heatCapSolid);
          energyAbsorbed += sensibleSolidEnergy;
        }
      }
    } else {
      const heatCap = config.mass * config.cpLiquid;
      newState.temperature += energyInput / heatCap;
      energyAbsorbed = energyInput;
    }
  } else {
    // transition phase
    const latentCap = config.mass * config.latentHeat;
    if (energyInput > 0) {
      const remainingLatentCap = latentCap * (1 - newState.meltFraction);
      if (energyInput <= remainingLatentCap) {
        newState.meltFraction += energyInput / latentCap;
        newState.temperature = config.meltingPoint + newState.meltFraction * config.transitionRange;
        energyAbsorbed = energyInput;
      } else {
        newState.meltFraction = 1;
        newState.phase = 'liquid';
        const remainingEnergy = energyInput - remainingLatentCap;
        energyAbsorbed = remainingLatentCap;
        const heatCapLiq = config.mass * config.cpLiquid;
        newState.temperature = config.meltingPoint + config.transitionRange + (remainingEnergy / heatCapLiq);
        energyAbsorbed += remainingEnergy;
      }
    } else {
      const extractableLatentCap = latentCap * newState.meltFraction;
      if (-energyInput <= extractableLatentCap) {
        newState.meltFraction += energyInput / latentCap;
        newState.temperature = config.meltingPoint + newState.meltFraction * config.transitionRange;
        energyAbsorbed = energyInput;
      } else {
        newState.meltFraction = 0;
        newState.phase = 'solid';
        const remainingEnergy = energyInput + extractableLatentCap;
        energyAbsorbed = -extractableLatentCap;
        const heatCapSolid = config.mass * config.cpSolid;
        newState.temperature = config.meltingPoint + (remainingEnergy / heatCapSolid);
        energyAbsorbed += remainingEnergy;
      }
    }
  }

  newState.energyStored += energyAbsorbed;
  newState.latentHeatContribution = (newState.phase === 'transition') ? (energyAbsorbed / dt) : 0;
  newState.remainingCapacity = config.mass * config.latentHeat * (1 - newState.meltFraction);
  
  return { newState, heatAbsorbed: energyAbsorbed };
}

/**
 * Calculate heat flow rate between PCM and zone air.
 * Positive return = heat flows FROM PCM TO zone (PCM releases heat, warms zone).
 * Negative return = heat flows FROM zone TO PCM (PCM absorbs heat, cools zone).
 * @param state Current PCM state
 * @param zoneTemp Zone air temperature [°C]
 * @param config PCM configuration
 * @returns Heat flow rate FROM PCM TO zone [W]
 */
export function getPCMHeatContribution(state: PCMState, zoneTemp: number, config: PCMConfig): number {
  const h = 5; // W/m²K convective heat transfer coefficient
  // Estimate PCM surface area from volume (cube approximation)
  const volume = config.mass / config.density;
  const side = Math.pow(volume, 1/3);
  const area = Math.max(1, 6 * side * side); // m², minimum 1 m²
  // Positive when PCM is hotter (releases heat to zone)
  return h * area * (state.temperature - zoneTemp);
}
