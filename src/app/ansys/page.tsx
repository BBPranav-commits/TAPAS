'use client';

import { useState, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { generateAPDL, parseANSYSResults, compareResults } from '@/lib/ansys/apdl-export';
import { buildShelterDesign } from '@/lib/simulation/runner';
import { calculateGeometry } from '@/lib/geometry/calculator';

export default function ANSYSPage() {
  const { state, dispatch } = useApp();
  const [apdlScript, setApdlScript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasSimulation = state.simulation.result !== null;

  const generateScript = useCallback(() => {
    try {
      const geometry = calculateGeometry(
        state.shelter.shape, state.shelter.length, state.shelter.width, state.shelter.height, state.shelter.azimuth
      );
      const design = {
        geometry,
        wallAssembly: { layers: state.materials.wallLayers, type: 'wall' as const },
        roofAssembly: { layers: state.materials.roofLayers, type: 'roof' as const },
        floorAssembly: { layers: state.materials.floorLayers, type: 'floor' as const },
        openings: state.openings,
        occupancy: state.shelter.occupancy,
        ventilationACH: state.shelter.ventilationACH,
        pcmConfig: state.pcmConfig,
        altitude: state.climate.location.altitude,
      };

      const params = {
        timeStepSeconds: state.simulation.timeStepSeconds,
        targetTempMin: state.simulation.targetTempMin,
        targetTempMax: state.simulation.targetTempMax,
        initialIndoorTemp: state.simulation.initialIndoorTemp,
      };

      const script = generateAPDL(design, params, state.climate.data, state.climate.location.latitude);
      setApdlScript(script);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'APDL generation failed');
    }
  }, [state]);

  const downloadScript = useCallback(() => {
    if (!apdlScript) return;
    const blob = new Blob([apdlScript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shelter_thermal_analysis.inp';
    a.click();
    URL.revokeObjectURL(url);
  }, [apdlScript]);

  const handleANSYSUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !state.simulation.result) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const ansysData = parseANSYSResults(text);
        if (ansysData.timesteps.length === 0) {
          setError('No valid data found in ANSYS results file');
          return;
        }
        const validation = compareResults(
          state.simulation.result!.result.indoorTemp,
          state.simulation.result!.result.timeHours,
          ansysData.timesteps,
          ansysData.temperatures,
          3.0
        );
        dispatch({ type: 'SET_ANSYS_VALIDATION', payload: validation });
        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to parse ANSYS results');
      }
    };
    reader.readAsText(file);
  }, [state.simulation.result, dispatch]);

  const validation = state.ansys.validation;

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-6">ANSYS Validation</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">APDL Export</div>
            <p className="text-xs text-slate-400 mb-3">
              Generate an ANSYS APDL input script containing geometry, materials, boundary conditions, and transient thermal setup.
            </p>
            <button onClick={generateScript} className="btn-primary w-full mb-2">
              Generate APDL Script
            </button>
            {apdlScript && (
              <button onClick={downloadScript} className="btn-secondary w-full">
                ⬇ Download .inp File
              </button>
            )}
          </div>

          <div className="card">
            <div className="card-header">Import ANSYS Results</div>
            <p className="text-xs text-slate-400 mb-3">
              Upload ANSYS thermal analysis results (CSV: timestep, temperature) to compare with software predictions.
            </p>
            {hasSimulation ? (
              <label className="btn-primary w-full block text-center cursor-pointer">
                Upload ANSYS Results
                <input type="file" accept=".csv,.txt,.dat" onChange={handleANSYSUpload} className="hidden" />
              </label>
            ) : (
              <div className="text-xs text-amber-400">
                Run a simulation first before importing ANSYS results.
              </div>
            )}
          </div>

          {error && (
            <div className="card border-red-800 bg-red-900/20">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* APDL Preview */}
          {apdlScript && (
            <div className="card">
              <div className="card-header">APDL Script Preview</div>
              <pre className="bg-slate-950 border border-slate-700 rounded p-3 text-xs text-slate-300 max-h-96 overflow-auto font-mono">
                {apdlScript}
              </pre>
            </div>
          )}

          {/* Validation Results */}
          {validation ? (
            <>
              <div className="card">
                <div className="card-header">Validation Status</div>
                <div className="flex items-center gap-4">
                  <div className={`text-3xl font-bold ${
                    validation.status === 'pass' ? 'text-emerald-400' :
                    validation.status === 'fail' ? 'text-red-400' : 'text-slate-400'
                  }`}>
                    {validation.status.toUpperCase()}
                  </div>
                  <div className="text-xs text-slate-400">
                    <p>Threshold: ±{validation.passThreshold}°C max absolute error</p>
                    <p>Data points compared: {validation.timesteps.length}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="card text-center">
                  <div className="text-lg font-bold text-white">{validation.avgAbsoluteError.toFixed(2)}°C</div>
                  <div className="text-[10px] text-slate-500">Avg Absolute Error</div>
                </div>
                <div className="card text-center">
                  <div className="text-lg font-bold text-white">{validation.maxAbsoluteError.toFixed(2)}°C</div>
                  <div className="text-[10px] text-slate-500">Max Absolute Error</div>
                </div>
                <div className="card text-center">
                  <div className="text-lg font-bold text-white">{validation.avgPercentageError.toFixed(1)}%</div>
                  <div className="text-[10px] text-slate-500">Avg Percentage Error</div>
                </div>
                <div className="card text-center">
                  <div className="text-lg font-bold text-white">{validation.maxPercentageError.toFixed(1)}%</div>
                  <div className="text-[10px] text-slate-500">Max Percentage Error</div>
                </div>
              </div>

              {/* Comparison Table */}
              <div className="card">
                <div className="card-header">Point-by-Point Comparison</div>
                <div className="max-h-80 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-800">
                      <tr className="text-slate-400 border-b border-slate-700">
                        <th className="py-1.5 text-left">Time [h]</th>
                        <th className="py-1.5 text-right">Software [°C]</th>
                        <th className="py-1.5 text-right">ANSYS [°C]</th>
                        <th className="py-1.5 text-right">Abs Err [°C]</th>
                        <th className="py-1.5 text-right">% Err</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validation.timesteps.map((t, i) => (
                        <tr key={i} className="border-b border-slate-800">
                          <td className="py-1">{t.toFixed(1)}</td>
                          <td className="py-1 text-right">{validation.softwareTemp[i].toFixed(2)}</td>
                          <td className="py-1 text-right">{validation.ansysTemp[i].toFixed(2)}</td>
                          <td className={`py-1 text-right ${validation.absoluteError[i] > validation.passThreshold ? 'text-red-400' : 'text-emerald-400'}`}>
                            {validation.absoluteError[i].toFixed(3)}
                          </td>
                          <td className="py-1 text-right text-slate-400">{validation.percentageError[i].toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="card h-64 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-3">✓</div>
                <p className="text-sm text-slate-400">Generate APDL script, run in ANSYS, then import results for validation.</p>
                <p className="text-xs text-slate-500 mt-2">Status: Pending ANSYS results</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
