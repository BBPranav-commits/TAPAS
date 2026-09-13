'use client';

import { useApp } from '@/context/AppContext';
import { useCallback } from 'react';

export default function ReportsPage() {
  const { state } = useApp();
  const result = state.simulation.result;
  const optResult = state.optimization.result;

  const engineeringSummary = useCallback(() => {
    if (!result) return '';

    const recommendation = optResult
      ? `Optimization suggests ${optResult.improvement.heatingReductionPercent.toFixed(1)}% lower heating demand and ${optResult.improvement.comfortHoursChange.toFixed(1)}h comfort change.`
      : 'Baseline design is retained; consider increasing insulation or adjusting glazing to reduce heating losses.';

    return [
      'Passive Thermal Shelter Engineering Summary',
      '=======================================',
      `Location: ${state.climate.location.name} (${state.climate.location.latitude}°, ${state.climate.location.longitude}°)`,
      `Climate source: ${state.climate.source} | Dataset: ${state.climate.dataset}`,
      `Period: ${state.climate.startDate} to ${state.climate.endDate}`,
      `Shelter: ${state.shelter.shape} ${state.shelter.length}x${state.shelter.width}x${state.shelter.height} m`,
      `Comfort hours: ${result.result.comfortableHours.toFixed(1)}h (${result.comfortPercentage.toFixed(0)}%)`,
      `Heating demand: ${result.result.totalHeatingEnergy_kWh.toFixed(2)} kWh`,
      `Average heat loss: ${result.avgHeatLoss.toFixed(0)} W`,
      `Average solar gain: ${result.avgSolarGain.toFixed(0)} W`,
      `Wall U-value: ${result.wallUValue.toFixed(3)} W/m²K`,
      `Roof U-value: ${result.roofUValue.toFixed(3)} W/m²K`,
      `Recommendation: ${recommendation}`,
      '',
      `PCM: ${state.pcmConfig ? state.pcmConfig.material : 'none'} | Openings: ${state.openings.length}`,
    ].join('\n');
  }, [optResult, result, state]);

  const exportCSV = useCallback(() => {
    if (!result) return;
    const r = result.result;
    let csv = 'Time_h,Indoor_C,Ambient_C,GHI_Wm2,SolarGain_W,TotalHeatLoss_W,WallLoss_W,RoofLoss_W,FloorLoss_W,WindowLoss_W,DoorLoss_W,InfiltrationLoss_W,LongwaveLoss_W,InternalGain_W,HeatingRequired_W,PCMContrib_W,PCMTemp_C,PCMMeltFrac\n';
    for (let i = 0; i < r.timeHours.length; i++) {
      csv += `${r.timeHours[i].toFixed(2)},${r.indoorTemp[i].toFixed(2)},${r.ambientTemp[i].toFixed(2)},${r.solarIrradiance[i].toFixed(1)},${r.solarGainTotal[i].toFixed(1)},${r.totalHeatLoss[i].toFixed(1)},${r.wallHeatLoss[i].toFixed(1)},${r.roofHeatLoss[i].toFixed(1)},${r.floorHeatLoss[i].toFixed(1)},${r.windowHeatLoss[i].toFixed(1)},${r.doorHeatLoss[i].toFixed(1)},${r.infiltrationLoss[i].toFixed(1)},${r.longwaveRadiationLoss[i].toFixed(1)},${r.internalGain[i].toFixed(1)},${r.heatingEnergyRequired[i].toFixed(1)},${r.pcmContribution[i].toFixed(1)},${r.pcmTemperature[i].toFixed(2)},${r.pcmMeltFraction[i].toFixed(4)}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'simulation_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const exportSummaryText = useCallback(() => {
    const summary = engineeringSummary();
    if (!summary) return;
    const blob = new Blob([summary], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'engineering_summary.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [engineeringSummary]);

  const exportSummaryJSON = useCallback(() => {
    if (!result) return;
    const payload = {
      location: state.climate.location,
      climateSource: state.climate.source,
      dataset: state.climate.dataset,
      period: `${state.climate.startDate} to ${state.climate.endDate}`,
      shelter: {
        shape: state.shelter.shape,
        dimensions: `${state.shelter.length}x${state.shelter.width}x${state.shelter.height}m`,
        occupancy: state.shelter.occupancy,
        ventilationACH: state.shelter.ventilationACH,
      },
      thermalPerformance: {
        wallR: result.wallRValue,
        wallU: result.wallUValue,
        roofR: result.roofRValue,
        roofU: result.roofUValue,
        comfortHours: result.result.comfortableHours,
        comfortPercent: result.comfortPercentage,
        totalHeatingEnergy_kWh: result.result.totalHeatingEnergy_kWh,
        avgHeatLoss: result.avgHeatLoss,
        avgSolarGain: result.avgSolarGain,
      },
      optimization: optResult ? {
        heatingReductionPercent: optResult.improvement.heatingReductionPercent,
        comfortChangeHours: optResult.improvement.comfortHoursChange,
        bestShape: optResult.bestDesign.shape,
      } : null,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'engineering_summary.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [optResult, result, state]);

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-6">Reports</h1>

      {result ? (
        <div className="space-y-6">
          <div className="card">
            <div className="card-header">Engineering summary</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-300">
              <div className="bg-slate-900/60 rounded p-3"><div className="text-slate-400">Comfort</div><div className="text-base font-semibold text-emerald-400">{result.result.comfortableHours.toFixed(1)}h</div></div>
              <div className="bg-slate-900/60 rounded p-3"><div className="text-slate-400">Heating</div><div className="text-base font-semibold text-amber-400">{result.result.totalHeatingEnergy_kWh.toFixed(2)} kWh</div></div>
              <div className="bg-slate-900/60 rounded p-3"><div className="text-slate-400">Avg heat loss</div><div className="text-base font-semibold text-white">{result.avgHeatLoss.toFixed(0)} W</div></div>
              <div className="bg-slate-900/60 rounded p-3"><div className="text-slate-400">Avg solar gain</div><div className="text-base font-semibold text-cyan-400">{result.avgSolarGain.toFixed(0)} W</div></div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={exportCSV} className="btn-primary">⬇ Export Simulation Data (CSV)</button>
            <button onClick={exportSummaryText} className="btn-secondary">⬇ Export Engineering Summary (TXT)</button>
            <button onClick={exportSummaryJSON} className="btn-secondary">⬇ Export Structured Summary (JSON)</button>
          </div>

          <div className="card">
            <div className="card-header">Simulation Report</div>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2">Location & Climate</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div><span className="text-slate-500">Name:</span> <span className="text-white">{state.climate.location.name}</span></div>
                  <div><span className="text-slate-500">Lat:</span> <span className="text-white">{state.climate.location.latitude}°N</span></div>
                  <div><span className="text-slate-500">Lon:</span> <span className="text-white">{state.climate.location.longitude}°E</span></div>
                  <div><span className="text-slate-500">Altitude:</span> <span className="text-white">{state.climate.location.altitude}m</span></div>
                  <div><span className="text-slate-500">Data Source:</span> <span className="text-white">{state.climate.source}</span></div>
                  <div><span className="text-slate-500">Data Points:</span> <span className="text-white">{state.climate.data.length}</span></div>
                  <div><span className="text-slate-500">Period:</span> <span className="text-white">{state.climate.startDate} to {state.climate.endDate}</span></div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2">Shelter Design</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div><span className="text-slate-500">Shape:</span> <span className="text-white">{state.shelter.shape}</span></div>
                  <div><span className="text-slate-500">Dimensions:</span> <span className="text-white">{state.shelter.length}×{state.shelter.width}×{state.shelter.height}m</span></div>
                  <div><span className="text-slate-500">Azimuth:</span> <span className="text-white">{state.shelter.azimuth}°</span></div>
                  <div><span className="text-slate-500">Occupancy:</span> <span className="text-white">{state.shelter.occupancy} persons</span></div>
                  <div><span className="text-slate-500">ACH:</span> <span className="text-white">{state.shelter.ventilationACH}</span></div>
                  <div><span className="text-slate-500">Volume:</span> <span className="text-white">{result.design.geometry.volume.toFixed(1)} m³</span></div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2">Thermal Performance</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div><span className="text-slate-500">Wall R:</span> <span className="text-white">{result.wallRValue.toFixed(3)} m²K/W</span></div>
                  <div><span className="text-slate-500">Wall U:</span> <span className="text-white">{result.wallUValue.toFixed(3)} W/m²K</span></div>
                  <div><span className="text-slate-500">Roof R:</span> <span className="text-white">{result.roofRValue.toFixed(3)} m²K/W</span></div>
                  <div><span className="text-slate-500">Roof U:</span> <span className="text-white">{result.roofUValue.toFixed(3)} W/m²K</span></div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-2">Simulation Results</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div><span className="text-slate-500">Min Indoor:</span> <span className="text-blue-400 font-medium">{result.result.minIndoorTemp.toFixed(1)}°C</span></div>
                  <div><span className="text-slate-500">Max Indoor:</span> <span className="text-red-400 font-medium">{result.result.maxIndoorTemp.toFixed(1)}°C</span></div>
                  <div><span className="text-slate-500">Avg Indoor:</span> <span className="text-white font-medium">{result.result.avgIndoorTemp.toFixed(1)}°C</span></div>
                  <div><span className="text-slate-500">Comfort Hours:</span> <span className="text-emerald-400 font-medium">{result.result.comfortableHours.toFixed(1)}h ({result.comfortPercentage.toFixed(0)}%)</span></div>
                  <div><span className="text-slate-500">Heating Required:</span> <span className="text-amber-400 font-medium">{result.result.totalHeatingEnergy_kWh.toFixed(2)} kWh</span></div>
                  <div><span className="text-slate-500">Hours w/ Heating:</span> <span className="text-white">{result.result.hoursRequiringHeating.toFixed(0)}h</span></div>
                  <div><span className="text-slate-500">Avg Heat Loss:</span> <span className="text-white">{result.avgHeatLoss.toFixed(0)} W</span></div>
                  <div><span className="text-slate-500">Avg Solar Gain:</span> <span className="text-white">{result.avgSolarGain.toFixed(0)} W</span></div>
                </div>
              </div>

              {optResult && (
                <div>
                  <h3 className="text-sm font-medium text-slate-300 mb-2">Optimization Results</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div><span className="text-slate-500">Heating Reduction:</span> <span className="text-emerald-400 font-medium">{optResult.improvement.heatingReductionPercent.toFixed(1)}%</span></div>
                    <div><span className="text-slate-500">Comfort Change:</span> <span className="text-white">{optResult.improvement.comfortHoursChange >= 0 ? '+' : ''}{optResult.improvement.comfortHoursChange.toFixed(1)}h</span></div>
                    <div><span className="text-slate-500">Optimized Shape:</span> <span className="text-white">{optResult.bestDesign.shape}</span></div>
                    <div><span className="text-slate-500">Fossil Fuel Reduction:</span> <span className="text-emerald-400 font-medium">≈{Math.min(100, optResult.improvement.heatingReductionPercent).toFixed(0)}%</span></div>
                  </div>
                </div>
              )}

              {state.ansys.validation && (
                <div>
                  <h3 className="text-sm font-medium text-slate-300 mb-2">ANSYS Validation</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div><span className="text-slate-500">Status:</span> <span className={state.ansys.validation.status === 'pass' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{state.ansys.validation.status.toUpperCase()}</span></div>
                    <div><span className="text-slate-500">Avg Error:</span> <span className="text-white">{state.ansys.validation.avgAbsoluteError.toFixed(2)}°C</span></div>
                    <div><span className="text-slate-500">Max Error:</span> <span className="text-white">{state.ansys.validation.maxAbsoluteError.toFixed(2)}°C</span></div>
                    <div><span className="text-slate-500">Threshold:</span> <span className="text-white">±{state.ansys.validation.passThreshold}°C</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="card h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm text-slate-400">Run a simulation first to generate reports.</p>
          </div>
        </div>
      )}
    </div>
  );
}
