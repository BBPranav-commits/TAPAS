import { ClimateDataPoint } from '@/lib/physics/types';

export interface LocationInput {
  name: string;
  latitude: number;
  longitude: number;
  altitude: number;
  utcOffset: number;
}

export type DataSource = 'real' | 'forecast' | 'synthetic';
export type OpenMeteoDataset = 'auto' | 'archive' | 'forecast';

export interface FetchOpenMeteoOptions {
  dataset?: OpenMeteoDataset;
}

export interface ClimateDataResult {
  data: ClimateDataPoint[];
  source: DataSource;
  location: LocationInput;
  startDate: string;
  endDate: string;
  dataset: OpenMeteoDataset;
}

export async function reverseGeocodeLocation(latitude: number, longitude: number): Promise<string> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return '';
  }

  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return '';
  }

  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
  const response = await fetch(url, {
    headers: {
      'Accept-Language': 'en',
      'User-Agent': 'TAPAS-App/1.0'
    },
  });

  if (!response.ok) {
    throw new Error(`Reverse geocoding failed: ${response.status}`);
  }

  const json = await response.json();
  const address = json?.address ?? {};

  return (
    address.city ||
    address.town ||
    address.village ||
    address.hamlet ||
    address.state ||
    address.country ||
    'Custom Location'
  );
}

export function resolveOpenMeteoDataset(
  startDate: string,
  endDate: string,
  dataset: OpenMeteoDataset = 'auto'
): 'archive' | 'forecast' {
  if (dataset !== 'auto') {
    return dataset;
  }

  const start = new Date(startDate);
  const today = new Date();
  const end = new Date(endDate);

  const isFutureRange = end > today || start > today;
  return isFutureRange ? 'forecast' : 'archive';
}

/**
 * Fetch historical weather data from Open-Meteo Archive API.
 * Uses hourly: temperature_2m, relative_humidity_2m, dew_point_2m,
 * shortwave_radiation, direct_normal_irradiance, diffuse_radiation,
 * cloud_cover, wind_speed_10m
 */
export async function fetchOpenMeteoData(
  location: LocationInput,
  startDate: string, // YYYY-MM-DD
  endDate: string,   // YYYY-MM-DD
  options: FetchOpenMeteoOptions = {}
): Promise<ClimateDataResult> {
  const dataset = resolveOpenMeteoDataset(startDate, endDate, options.dataset ?? 'auto');
  
  const baseUrl = dataset === 'forecast'
    ? 'https://api.open-meteo.com/v1/forecast'
    : 'https://archive-api.open-meteo.com/v1/archive';
  
  const params = new URLSearchParams({
    latitude: location.latitude.toString(),
    longitude: location.longitude.toString(),
    start_date: startDate,
    end_date: endDate,
    hourly: 'temperature_2m,relative_humidity_2m,dew_point_2m,shortwave_radiation,direct_normal_irradiance,diffuse_radiation,cloud_cover,wind_speed_10m',
    timezone: 'auto',
  });
  
  const url = `${baseUrl}?${params.toString()}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
  }
  
  const json = await response.json();
  const hourly = json.hourly;
  
  if (!hourly || !hourly.time || hourly.time.length === 0) {
    throw new Error('No data returned from Open-Meteo API');
  }
  
  const data: ClimateDataPoint[] = [];
  
  for (let i = 0; i < hourly.time.length; i++) {
    const ghi = hourly.shortwave_radiation?.[i] ?? 0;
    const dni = hourly.direct_normal_irradiance?.[i] ?? 0;
    // DHI = GHI - DNI * cos(zenith), approximate as GHI - DNI * 0.5 if not provided
    const dhi = hourly.diffuse_radiation?.[i] ?? Math.max(0, ghi - dni * 0.5);
    
    data.push({
      time: new Date(hourly.time[i]),
      temperature: hourly.temperature_2m?.[i] ?? 0,
      ghi: Math.max(0, ghi),
      dni: Math.max(0, dni),
      dhi: Math.max(0, dhi),
      windSpeed: hourly.wind_speed_10m?.[i] ?? 0,
      humidity: hourly.relative_humidity_2m?.[i] ?? 50,
      cloudCover: hourly.cloud_cover?.[i] ?? 50,
      dewPoint: hourly.dew_point_2m?.[i],
    });
  }
  
  return {
    data,
    source: dataset === 'forecast' ? 'forecast' : 'real',
    location,
    startDate,
    endDate,
    dataset,
  };
}

/**
 * Generate synthetic hourly climate data from summary parameters.
 * Useful when API is unavailable or for custom scenarios.
 */
export function generateSyntheticData(
  location: LocationInput,
  startDate: string,
  days: number,
  params: {
    tempMin: number;    // °C
    tempMax: number;    // °C
    maxGHI: number;     // W/m² peak solar
    windSpeedAvg: number; // m/s
    humidityAvg: number;  // %
    cloudCoverAvg: number; // %
  }
): ClimateDataResult {
  const data: ClimateDataPoint[] = [];
  const start = new Date(startDate + 'T00:00:00');
  const totalHours = days * 24;
  
  for (let h = 0; h < totalHours; h++) {
    const time = new Date(start.getTime() + h * 3600000);
    const hourOfDay = h % 24;
    
    // Diurnal temperature cycle: min at 5am, max at 2pm
    const tempPhase = (hourOfDay - 5) / 24 * 2 * Math.PI;
    const tempFrac = 0.5 * (1 - Math.cos(tempPhase));
    const temperature = params.tempMin + (params.tempMax - params.tempMin) * (
      hourOfDay >= 5 && hourOfDay <= 14 ? tempFrac : (1 - tempFrac) * 0.3
    );
    // Better sinusoidal model
    const tMean = (params.tempMin + params.tempMax) / 2;
    const tAmp = (params.tempMax - params.tempMin) / 2;
    const tempActual = tMean - tAmp * Math.cos(2 * Math.PI * (hourOfDay - 14) / 24);
    
    // Solar: sunrise ~6, sunset ~18, peak at noon
    let ghi = 0;
    let dni = 0;
    let dhi = 0;
    if (hourOfDay >= 6 && hourOfDay <= 18) {
      const solarFrac = Math.sin(Math.PI * (hourOfDay - 6) / 12);
      ghi = params.maxGHI * solarFrac * (1 - 0.5 * params.cloudCoverAvg / 100);
      dni = ghi * 0.7;
      dhi = ghi * 0.3;
    }
    
    // Dew point approximation
    const dewPoint = tempActual - ((100 - params.humidityAvg) / 5);
    
    data.push({
      time,
      temperature: Math.round(tempActual * 10) / 10,
      ghi: Math.round(Math.max(0, ghi)),
      dni: Math.round(Math.max(0, dni)),
      dhi: Math.round(Math.max(0, dhi)),
      windSpeed: params.windSpeedAvg + (Math.random() - 0.5) * 2,
      humidity: Math.max(10, Math.min(100, params.humidityAvg + (Math.random() - 0.5) * 10)),
      cloudCover: Math.max(0, Math.min(100, params.cloudCoverAvg + (Math.random() - 0.5) * 20)),
      dewPoint: Math.round(dewPoint * 10) / 10,
    });
  }
  
  const endDate = new Date(start.getTime() + (days - 1) * 86400000);
  
  return {
    data,
    source: 'synthetic',
    location,
    startDate,
    endDate: endDate.toISOString().split('T')[0],
    dataset: 'auto',
  };
}
