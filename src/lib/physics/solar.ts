import { ClimateDataPoint, ShelterDesign } from './types';
import { GROUND_REFLECTANCE } from './constants';

export function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = (date.getTime() - start.getTime()) + ((start.getTimezoneOffset() - date.getTimezoneOffset()) * 60 * 1000);
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/** Spencer (1971) solar declination [rad] */
export function solarDeclination(dayOfYear: number): number {
  const b = (2 * Math.PI * (dayOfYear - 1)) / 365;
  return 0.006918 - 0.399912 * Math.cos(b) + 0.070257 * Math.sin(b) 
         - 0.006758 * Math.cos(2 * b) + 0.000907 * Math.sin(2 * b) 
         - 0.002697 * Math.cos(3 * b) + 0.00148 * Math.sin(3 * b);
}

/** Spencer (1971) equation of time [minutes] */
export function equationOfTime(dayOfYear: number): number {
  const b = (2 * Math.PI * (dayOfYear - 1)) / 365;
  return 229.18 * (0.000075 + 0.001868 * Math.cos(b) - 0.032077 * Math.sin(b) 
         - 0.014615 * Math.cos(2 * b) - 0.040849 * Math.sin(2 * b));
}

export function localSolarTime(localHour: number, longitude: number, utcOffset: number, eot: number): number {
  const timeCorrection = 4 * longitude - 60 * utcOffset + eot;
  return localHour + timeCorrection / 60;
}

export function hourAngle(solarTime: number): number {
  return (solarTime - 12) * 15 * (Math.PI / 180);
}

export function solarAltitude(latitude_rad: number, declination_rad: number, hourAngle_rad: number): number {
  const sinAlt = Math.sin(latitude_rad) * Math.sin(declination_rad) + 
                 Math.cos(latitude_rad) * Math.cos(declination_rad) * Math.cos(hourAngle_rad);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt)));
}

export function solarAzimuth(altitude_rad: number, latitude_rad: number, declination_rad: number, hourAngle_rad: number): number {
  const cosAz = (Math.sin(declination_rad) * Math.cos(latitude_rad) - 
                 Math.cos(declination_rad) * Math.sin(latitude_rad) * Math.cos(hourAngle_rad)) / 
                Math.cos(altitude_rad);
  const az = Math.acos(Math.max(-1, Math.min(1, cosAz)));
  if (hourAngle_rad > 0) {
    return (2 * Math.PI) - az;
  } else {
    return az;
  }
}

export function incidenceAngle(solarAlt: number, solarAz: number, surfaceTilt: number, surfaceAzimuth: number): number {
  const cosInc = Math.sin(solarAlt) * Math.cos(surfaceTilt) + 
                 Math.cos(solarAlt) * Math.sin(surfaceTilt) * Math.cos(solarAz - surfaceAzimuth);
  return Math.acos(Math.max(-1, Math.min(1, cosInc)));
}

export function effectiveIrradianceOnSurface(
  dni: number, dhi: number, ghi: number, 
  incidenceAngle: number, surfaceTilt: number, groundReflectance: number
): number {
  const cosInc = Math.cos(incidenceAngle);
  const direct = dni * Math.max(0, cosInc);
  const diffuse = dhi * ((1 + Math.cos(surfaceTilt)) / 2);
  const reflected = ghi * groundReflectance * ((1 - Math.cos(surfaceTilt)) / 2);
  return direct + diffuse + reflected;
}

export function solarGainOpaque(absorptivity: number, irradiance: number, area: number): number {
  return absorptivity * irradiance * area;
}

export function solarGainWindow(shgc: number, irradiance: number, area: number): number {
  return shgc * irradiance * area;
}

export interface SolarGainResult {
  totalSolarGain: number;
  solarGainPerFace: number[];
  windowSolarGain: number;
  opaqueSolarGain: number;
}

/**
 * Calculate all solar gains for the shelter at a given time step.
 * Includes window transmitted gains and opaque envelope sol-air gains.
 * A simplified inward fraction (0.30) of opaque absorbed solar is added
 * to represent heat conducted inward through the envelope.
 */
export function calculateAllSolarGains(
  climatePoint: ClimateDataPoint, shelterDesign: ShelterDesign,
  latitude: number, longitude: number, utcOffset: number
): SolarGainResult {
  const lat_rad = latitude * Math.PI / 180;
  const doy = dayOfYear(climatePoint.time);
  const decl = solarDeclination(doy);
  const eot = equationOfTime(doy);
  
  const localHour = climatePoint.time.getHours() + climatePoint.time.getMinutes() / 60;
  const lst = localSolarTime(localHour, longitude, utcOffset, eot);
  const ha = hourAngle(lst);
  
  const solAlt = solarAltitude(lat_rad, decl, ha);
  const solAz = solarAzimuth(solAlt, lat_rad, decl, ha);

  const solarGainPerFace: number[] = [];
  let opaqueSolarGain = 0;

  // Opaque surfaces
  for (const face of shelterDesign.geometry.facesWithOrientations) {
    const tilt_rad = face.tilt * Math.PI / 180;
    const az_rad = face.azimuth * Math.PI / 180;
    
    let incAngle = Math.PI / 2;
    if (solAlt > 0) {
      incAngle = incidenceAngle(solAlt, solAz, tilt_rad, az_rad);
    }
    
    const irradiance = effectiveIrradianceOnSurface(
      climatePoint.dni, climatePoint.dhi, climatePoint.ghi,
      incAngle, tilt_rad, GROUND_REFLECTANCE
    );
    
    let absorptivity = 0.7;
    if (face.tilt === 0) {
      if (shelterDesign.roofAssembly.layers.length > 0) {
        absorptivity = shelterDesign.roofAssembly.layers[0].solarAbsorptivity;
      }
    } else {
      if (shelterDesign.wallAssembly.layers.length > 0) {
        absorptivity = shelterDesign.wallAssembly.layers[0].solarAbsorptivity;
      }
    }

    const gain = solarGainOpaque(absorptivity, irradiance, face.area);
    solarGainPerFace.push(gain);
    opaqueSolarGain += gain;
  }

  // Simplified inward fraction of opaque solar absorbed on exterior
  // This represents the sol-air temperature effect on conduction
  const INWARD_FRACTION = 0.30;
  const opaqueInwardGain = opaqueSolarGain * INWARD_FRACTION;

  // Windows
  let windowSolarGain = 0;
  for (const opening of shelterDesign.openings) {
    if (opening.type === 'window') {
      const tilt_rad = Math.PI / 2;
      const az_rad = opening.orientation * Math.PI / 180;
      let incAngle = Math.PI / 2;
      if (solAlt > 0) {
        incAngle = incidenceAngle(solAlt, solAz, tilt_rad, az_rad);
      }
      
      const irradiance = effectiveIrradianceOnSurface(
        climatePoint.dni, climatePoint.dhi, climatePoint.ghi,
        incAngle, tilt_rad, GROUND_REFLECTANCE
      );
      
      const gain = solarGainWindow(opening.shgc, irradiance, opening.area);
      windowSolarGain += gain;
    }
  }
  
  const totalSolarGain = windowSolarGain + opaqueInwardGain;

  return { totalSolarGain, solarGainPerFace, windowSolarGain, opaqueSolarGain };
}
