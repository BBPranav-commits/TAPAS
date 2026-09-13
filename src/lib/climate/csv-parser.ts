import { ClimateDataPoint } from '@/lib/physics/types';

/**
 * Expected CSV columns (header names, case-insensitive):
 * time/datetime, temperature/temp_c, ghi, dni, dhi,
 * wind_speed/windspeed, humidity/rh, cloud_cover/cloudcover,
 * dew_point/dewpoint (optional)
 */

const COLUMN_ALIASES: Record<string, string[]> = {
  time: ['time', 'datetime', 'date_time', 'timestamp'],
  temperature: ['temperature', 'temp_c', 'temp', 'air_temperature', 'temperature_2m'],
  ghi: ['ghi', 'shortwave_radiation', 'global_horizontal_irradiance', 'solar_radiation'],
  dni: ['dni', 'direct_normal_irradiance', 'direct_radiation'],
  dhi: ['dhi', 'diffuse_radiation', 'diffuse_horizontal_irradiance'],
  windSpeed: ['wind_speed', 'windspeed', 'wind_speed_10m', 'ws'],
  humidity: ['humidity', 'rh', 'relative_humidity', 'relative_humidity_2m'],
  cloudCover: ['cloud_cover', 'cloudcover', 'cloud_cover_total', 'cc'],
  dewPoint: ['dew_point', 'dewpoint', 'dew_point_2m', 'tdew'],
};

function findColumnIndex(headers: string[], field: string): number {
  const aliases = COLUMN_ALIASES[field] || [field];
  const normalizedHeaders = headers.map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));
  for (const alias of aliases) {
    const idx = normalizedHeaders.indexOf(alias.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

export interface CSVParseResult {
  data: ClimateDataPoint[];
  warnings: string[];
  rowCount: number;
}

export function parseClimateJSON(jsonText: string): CSVParseResult {
  const warnings: string[] = [];
  const parsed = JSON.parse(jsonText);
  const rawItems = Array.isArray(parsed) ? parsed : parsed.data ?? parsed.records ?? parsed.hourly ?? [];

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('JSON dataset must contain an array of records or a data/records property');
  }

  const normalize = (value: unknown): number => {
    const num = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(num) ? num : 0;
  };

  const data: ClimateDataPoint[] = rawItems.map((item, index) => {
    const record = typeof item === 'object' && item !== null ? item as Record<string, unknown> : {};
    const rawTime = record.time ?? record.datetime ?? record.timestamp ?? record.date ?? record.date_time;
    const time = rawTime ? new Date(String(rawTime)) : new Date(Date.now() + index * 3600000);

    return {
      time: Number.isNaN(time.getTime()) ? new Date(Date.now() + index * 3600000) : time,
      temperature: normalize(record.temperature ?? record.temp_c ?? record.temp ?? record.air_temperature ?? record.temperature_2m),
      ghi: Math.max(0, normalize(record.ghi ?? record.shortwave_radiation ?? record.global_horizontal_irradiance ?? record.solar_radiation)),
      dni: Math.max(0, normalize(record.dni ?? record.direct_normal_irradiance ?? record.direct_radiation)),
      dhi: Math.max(0, normalize(record.dhi ?? record.diffuse_radiation ?? record.diffuse_horizontal_irradiance)),
      windSpeed: Math.max(0, normalize(record.wind_speed ?? record.windspeed ?? record.wind_speed_10m ?? record.ws)),
      humidity: Math.max(0, Math.min(100, normalize(record.humidity ?? record.rh ?? record.relative_humidity ?? record.relative_humidity_2m))),
      cloudCover: Math.max(0, Math.min(100, normalize(record.cloud_cover ?? record.cloudcover ?? record.cloud_cover_total ?? record.cc))),
      dewPoint: record.dew_point !== undefined || record.dewpoint !== undefined || record.dew_point_2m !== undefined
        ? normalize(record.dew_point ?? record.dewpoint ?? record.dew_point_2m)
        : undefined,
    };
  });

  return { data, warnings, rowCount: data.length };
}

export function parseClimateCSV(csvText: string): CSVParseResult {
  const warnings: string[] = [];
  const lines = csvText.trim().split(/\r?\n/);
  
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }
  
  const headers = lines[0].split(',');
  
  const cols = {
    time: findColumnIndex(headers, 'time'),
    temperature: findColumnIndex(headers, 'temperature'),
    ghi: findColumnIndex(headers, 'ghi'),
    dni: findColumnIndex(headers, 'dni'),
    dhi: findColumnIndex(headers, 'dhi'),
    windSpeed: findColumnIndex(headers, 'windSpeed'),
    humidity: findColumnIndex(headers, 'humidity'),
    cloudCover: findColumnIndex(headers, 'cloudCover'),
    dewPoint: findColumnIndex(headers, 'dewPoint'),
  };
  
  if (cols.time === -1) warnings.push('No time/datetime column found; using sequential hours');
  if (cols.temperature === -1) throw new Error('Temperature column is required');
  if (cols.ghi === -1) warnings.push('No GHI column found; defaulting to 0');
  
  const data: ClimateDataPoint[] = [];
  const startTime = new Date();
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',');
    
    let time: Date;
    if (cols.time !== -1 && values[cols.time]) {
      time = new Date(values[cols.time].trim());
      if (isNaN(time.getTime())) {
        warnings.push(`Row ${i}: Invalid date "${values[cols.time]}", using sequential hour`);
        time = new Date(startTime.getTime() + (i - 1) * 3600000);
      }
    } else {
      time = new Date(startTime.getTime() + (i - 1) * 3600000);
    }
    
    const getNum = (colIdx: number, defaultVal: number): number => {
      if (colIdx === -1) return defaultVal;
      const val = parseFloat(values[colIdx]);
      return isNaN(val) ? defaultVal : val;
    };
    
    const ghi = getNum(cols.ghi, 0);
    const dni = getNum(cols.dni, ghi * 0.7);
    const dhi = getNum(cols.dhi, Math.max(0, ghi - dni * 0.5));
    
    data.push({
      time,
      temperature: getNum(cols.temperature, 0),
      ghi: Math.max(0, ghi),
      dni: Math.max(0, dni),
      dhi: Math.max(0, dhi),
      windSpeed: Math.max(0, getNum(cols.windSpeed, 2)),
      humidity: Math.max(0, Math.min(100, getNum(cols.humidity, 50))),
      cloudCover: Math.max(0, Math.min(100, getNum(cols.cloudCover, 50))),
      dewPoint: cols.dewPoint !== -1 ? getNum(cols.dewPoint, undefined as unknown as number) : undefined,
    });
  }
  
  return { data, warnings, rowCount: data.length };
}
