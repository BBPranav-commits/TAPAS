import { LocationInput } from './open-meteo';

export interface ClimatePreset {
  id: string;
  name: string;
  description: string;
  location: LocationInput;
  /** Recommended simulation date range */
  startDate: string;
  endDate: string;
  /** Fallback synthetic data parameters */
  synthetic: {
    tempMin: number;
    tempMax: number;
    maxGHI: number;
    windSpeedAvg: number;
    humidityAvg: number;
    cloudCoverAvg: number;
  };
}

export const CLIMATE_PRESETS: ClimatePreset[] = [
  {
    id: 'ladakh-winter',
    name: 'Ladakh — Winter (January)',
    description: 'Leh, Ladakh at 3,500m altitude. Extreme cold, clear skies, strong solar irradiance. Typical January conditions.',
    location: {
      name: 'Leh, Ladakh',
      latitude: 34.16,
      longitude: 77.58,
      altitude: 3500,
      utcOffset: 5.5,
    },
    startDate: '2024-01-10',
    endDate: '2024-01-17',
    synthetic: {
      tempMin: -20,
      tempMax: -5,
      maxGHI: 700,
      windSpeedAvg: 3,
      humidityAvg: 30,
      cloudCoverAvg: 15,
    },
  },
  {
    id: 'ladakh-summer',
    name: 'Ladakh — Summer (July)',
    description: 'Leh, Ladakh summer. Moderate temperatures with high solar radiation.',
    location: {
      name: 'Leh, Ladakh',
      latitude: 34.16,
      longitude: 77.58,
      altitude: 3500,
      utcOffset: 5.5,
    },
    startDate: '2024-07-10',
    endDate: '2024-07-17',
    synthetic: {
      tempMin: 10,
      tempMax: 28,
      maxGHI: 900,
      windSpeedAvg: 4,
      humidityAvg: 35,
      cloudCoverAvg: 30,
    },
  },
  {
    id: 'coimbatore',
    name: 'Coimbatore — Summer (May)',
    description: 'Coimbatore, Tamil Nadu at 411m. Hot, humid tropical climate. Tests cooling performance.',
    location: {
      name: 'Coimbatore, Tamil Nadu',
      latitude: 11.01,
      longitude: 76.97,
      altitude: 411,
      utcOffset: 5.5,
    },
    startDate: '2024-05-10',
    endDate: '2024-05-17',
    synthetic: {
      tempMin: 24,
      tempMax: 38,
      maxGHI: 950,
      windSpeedAvg: 3,
      humidityAvg: 55,
      cloudCoverAvg: 35,
    },
  },
  {
    id: 'srinagar-winter',
    name: 'Srinagar — Winter (December)',
    description: 'Srinagar, Kashmir at 1,585m. Cold winter with moderate snowfall.',
    location: {
      name: 'Srinagar, Kashmir',
      latitude: 34.08,
      longitude: 74.79,
      altitude: 1585,
      utcOffset: 5.5,
    },
    startDate: '2024-12-10',
    endDate: '2024-12-17',
    synthetic: {
      tempMin: -5,
      tempMax: 8,
      maxGHI: 500,
      windSpeedAvg: 2,
      humidityAvg: 70,
      cloudCoverAvg: 50,
    },
  },
  {
    id: 'jaisalmer',
    name: 'Jaisalmer — Summer (June)',
    description: 'Jaisalmer, Rajasthan at 229m. Hot arid desert climate with extreme temperature swings.',
    location: {
      name: 'Jaisalmer, Rajasthan',
      latitude: 26.92,
      longitude: 70.90,
      altitude: 229,
      utcOffset: 5.5,
    },
    startDate: '2024-06-10',
    endDate: '2024-06-17',
    synthetic: {
      tempMin: 28,
      tempMax: 45,
      maxGHI: 1000,
      windSpeedAvg: 5,
      humidityAvg: 25,
      cloudCoverAvg: 10,
    },
  },
  {
    id: 'siachen-winter',
    name: 'Siachen Region — Winter (January)',
    description: 'Near Siachen Glacier at 5,400m. Extreme cold, high altitude military outpost conditions.',
    location: {
      name: 'Siachen Region',
      latitude: 35.42,
      longitude: 77.10,
      altitude: 5400,
      utcOffset: 5.5,
    },
    startDate: '2024-01-10',
    endDate: '2024-01-17',
    synthetic: {
      tempMin: -35,
      tempMax: -15,
      maxGHI: 600,
      windSpeedAvg: 8,
      humidityAvg: 20,
      cloudCoverAvg: 20,
    },
  },
];

export function getPresetById(id: string): ClimatePreset | undefined {
  return CLIMATE_PRESETS.find(p => p.id === id);
}
