'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { ClimateDataPoint, MaterialLayer, Opening, PCMConfig, SimulationResult } from '@/lib/physics/types';
import { ShelterShape } from '@/lib/geometry/calculator';
import { DataSource, LocationInput, OpenMeteoDataset } from '@/lib/climate/open-meteo';
import { SimulationSummary } from '@/lib/simulation/runner';
import { OptimizationResult, OptimizationConfig, DEFAULT_CONFIG } from '@/lib/optimization/genetic-algorithm';
import { ValidationResult } from '@/lib/ansys/apdl-export';

// State
export interface AppState {
  // Climate
  climate: {
    location: LocationInput;
    data: ClimateDataPoint[];
    source: DataSource;
    dataset: OpenMeteoDataset;
    startDate: string;
    endDate: string;
    loaded: boolean;
  };
  
  // Shelter
  shelter: {
    shape: ShelterShape;
    length: number;
    width: number;
    height: number;
    azimuth: number;
    occupancy: number;
    ventilationACH: number;
  };
  
  // Materials
  materials: {
    wallLayers: MaterialLayer[];
    roofLayers: MaterialLayer[];
    floorLayers: MaterialLayer[];
  };
  
  // Openings
  openings: Opening[];
  
  // PCM
  pcmConfig: PCMConfig | undefined;
  
  // Simulation
  simulation: {
    timeStepSeconds: number;
    targetTempMin: number;
    targetTempMax: number;
    initialIndoorTemp: number;
    result: SimulationSummary | null;
    running: boolean;
  };
  
  // Optimization
  optimization: {
    config: OptimizationConfig;
    result: OptimizationResult | null;
    running: boolean;
  };
  
  // ANSYS
  ansys: {
    validation: ValidationResult | null;
  };
}

// Default state
const defaultState: AppState = {
  climate: {
    location: {
      name: 'Leh, Ladakh',
      latitude: 34.16,
      longitude: 77.58,
      altitude: 3500,
      utcOffset: 5.5,
    },
    data: [],
    source: 'synthetic',
    dataset: 'auto',
    startDate: '2024-01-10',
    endDate: '2024-01-17',
    loaded: false,
  },
  shelter: {
    shape: 'box',
    length: 6,
    width: 4,
    height: 3,
    azimuth: 180, // south-facing
    occupancy: 4,
    ventilationACH: 0.5,
  },
  materials: {
    wallLayers: [
      { name: 'Mud Brick (Adobe)', thickness: 0.3, conductivity: 0.75, density: 1700, specificHeat: 900, emissivity: 0.9, solarAbsorptivity: 0.7 },
      { name: 'EPS (Expanded Polystyrene)', thickness: 0.05, conductivity: 0.035, density: 25, specificHeat: 1400, emissivity: 0.6, solarAbsorptivity: 0.4 },
    ],
    roofLayers: [
      { name: 'Concrete (Dense)', thickness: 0.15, conductivity: 1.4, density: 2300, specificHeat: 880, emissivity: 0.9, solarAbsorptivity: 0.65 },
      { name: 'EPS (Expanded Polystyrene)', thickness: 0.05, conductivity: 0.035, density: 25, specificHeat: 1400, emissivity: 0.6, solarAbsorptivity: 0.4 },
    ],
    floorLayers: [
      { name: 'Concrete (Dense)', thickness: 0.2, conductivity: 1.4, density: 2300, specificHeat: 880, emissivity: 0.9, solarAbsorptivity: 0.65 },
    ],
  },
  openings: [
    { type: 'window', area: 2.0, orientation: 180, uValue: 2.8, shgc: 0.6, airLeakage: 0.0005 },
    { type: 'door', area: 1.8, orientation: 180, uValue: 3.5, shgc: 0.1, airLeakage: 0.001 },
  ],
  pcmConfig: undefined,
  simulation: {
    timeStepSeconds: 3600,
    targetTempMin: 18,
    targetTempMax: 26,
    initialIndoorTemp: 15,
    result: null,
    running: false,
  },
  optimization: {
    config: DEFAULT_CONFIG,
    result: null,
    running: false,
  },
  ansys: {
    validation: null,
  },
};

// Actions
type Action =
  | { type: 'SET_CLIMATE'; payload: Partial<AppState['climate']> }
  | { type: 'SET_SHELTER'; payload: Partial<AppState['shelter']> }
  | { type: 'SET_WALL_LAYERS'; payload: MaterialLayer[] }
  | { type: 'SET_ROOF_LAYERS'; payload: MaterialLayer[] }
  | { type: 'SET_FLOOR_LAYERS'; payload: MaterialLayer[] }
  | { type: 'SET_OPENINGS'; payload: Opening[] }
  | { type: 'SET_PCM'; payload: PCMConfig | undefined }
  | { type: 'SET_SIMULATION_PARAMS'; payload: Partial<AppState['simulation']> }
  | { type: 'SET_SIMULATION_RESULT'; payload: SimulationSummary | null }
  | { type: 'SET_SIMULATION_RUNNING'; payload: boolean }
  | { type: 'SET_OPTIMIZATION_CONFIG'; payload: Partial<OptimizationConfig> }
  | { type: 'SET_OPTIMIZATION_RESULT'; payload: OptimizationResult | null }
  | { type: 'SET_OPTIMIZATION_RUNNING'; payload: boolean }
  | { type: 'SET_ANSYS_VALIDATION'; payload: ValidationResult | null }
  | { type: 'RESET_ALL' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_CLIMATE':
      return { ...state, climate: { ...state.climate, ...action.payload } };
    case 'SET_SHELTER':
      return { ...state, shelter: { ...state.shelter, ...action.payload } };
    case 'SET_WALL_LAYERS':
      return { ...state, materials: { ...state.materials, wallLayers: action.payload } };
    case 'SET_ROOF_LAYERS':
      return { ...state, materials: { ...state.materials, roofLayers: action.payload } };
    case 'SET_FLOOR_LAYERS':
      return { ...state, materials: { ...state.materials, floorLayers: action.payload } };
    case 'SET_OPENINGS':
      return { ...state, openings: action.payload };
    case 'SET_PCM':
      return { ...state, pcmConfig: action.payload };
    case 'SET_SIMULATION_PARAMS':
      return { ...state, simulation: { ...state.simulation, ...action.payload } };
    case 'SET_SIMULATION_RESULT':
      return { ...state, simulation: { ...state.simulation, result: action.payload, running: false } };
    case 'SET_SIMULATION_RUNNING':
      return { ...state, simulation: { ...state.simulation, running: action.payload } };
    case 'SET_OPTIMIZATION_CONFIG':
      return { ...state, optimization: { ...state.optimization, config: { ...state.optimization.config, ...action.payload } } };
    case 'SET_OPTIMIZATION_RESULT':
      return { ...state, optimization: { ...state.optimization, result: action.payload, running: false } };
    case 'SET_OPTIMIZATION_RUNNING':
      return { ...state, optimization: { ...state.optimization, running: action.payload } };
    case 'SET_ANSYS_VALIDATION':
      return { ...state, ansys: { ...state.ansys, validation: action.payload } };
    case 'RESET_ALL':
      return defaultState;
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, defaultState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

export { defaultState };
