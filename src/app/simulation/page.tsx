'use client';

import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { SimulationInput, executeSimulation } from '@/lib/simulation/runner';
import dynamic from 'next/dynamic';

const SimResultCharts = dynamic(() => import('@/components/charts/SimResultCharts'), { ssr: false });

export default function SimulationPage() {
  const { state, dispatch } = useApp();
  const [error, setError] = useState<string | null>(null);

  const canRun = state.climate.data.length > 0 && state.materials.wallLayers.length > 0;

  const runSim = () => {
    if (!canRun) {
      setError('Load climate data and define wall materials first');
      return;
    }
    setError(null);
    dispatch({ type: 'SET_SIMULATION_RUNNING', payload: true });

    // Use setTimeout to allow UI update before blocking computation
    setTimeout(() => {
      try {
        const input: SimulationInput = {
          latitude: state.climate.location.latitude,
          longitude: state.climate.location.longitude,
          altitude: state.climate.location.altitude,
          utcOffset: state.climate.location.utcOffset,
          climateData: state.climate.data,
          shape: state.shelter.shape,
          length: state.shelter.length,
          width: state.shelter.width,
          height: state.shelter.height,
          azimuth: state.shelter.azimuth,
          wallLayers: state.materials.wallLayers,
          roofLayers: state.materials.roofLayers,
          floorLayers: state.materials.floorLayers,
          openings: state.openings,
          occupancy: state.shelter.occupancy,
          ventilationACH: state.shelter.ventilationACH,
          pcmConfig: state.pcmConfig,
          timeStepSeconds: state.simulation.timeStepSeconds,
          targetTempMin: state.simulation.targetTempMin,
          targetTempMax: state.simulation.targetTempMax,
          initialIndoorTemp: state.simulation.initialIndoorTemp,
        };

        const summary = executeSimulation(input);
        dispatch({ type: 'SET_SIMULATION_RESULT', payload: summary });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Simulation failed');
        dispatch({ type: 'SET_SIMULATION_RUNNING', payload: false });
      }
    }, 50);
  };

  const result = state.simulation.result;

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-6">Thermal Simulation</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">Simulation Parameters</div>
            <div className="space-y-3">
              <div>
                <label className="input-label">Time Step [s]</label>
                <select className="input-field" value={state.simulation.timeStepSeconds} onChange={e => dispatch({ type: 'SET_SIMULATION_PARAMS', payload: { timeStepSeconds: parseInt(e.target.value) } })}>
                  <option value="1800">30 min</option>
                  <option value="3600">1 hour</option>
                  <option value="7200">2 hours</option>
                </select>
              </div>
              <div>
                <label className="input-label">Target Min Temp [°C]</label>
                <input className="input-field" type="number" step="1" value={state.simulation.targetTempMin} onChange={e => dispatch({ type: 'SET_SIMULATION_PARAMS', payload: { targetTempMin: parseFloat(e.target.value) || 18 } })} />
              </div>
              <div>
                <label className="input-label">Target Max Temp [°C]</label>
                <input className="input-field" type="number" step="1" value={state.simulation.targetTempMax} onChange={e => dispatch({ type: 'SET_SIMULATION_PARAMS', payload: { targetTempMax: parseFloat(e.target.value) || 26 } })} />
              </div>
              <div>
                <label className="input-label">Initial Indoor Temp [°C]</label>
                <input className="input-field" type="number" step="1" value={state.simulation.initialIndoorTemp} onChange={e => dispatch({ type: 'SET_SIMULATION_PARAMS', payload: { initialIndoorTemp: parseFloat(e.target.value) || 15 } })} />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">Configuration Summary</div>
            <div className="space-y-1 text-xs text-slate-400">
              <p>Location: {state.climate.location.name}</p>
              <p>Data: {state.climate.data.length} points ({state.climate.source})</p>
              <p>Shelter: {state.shelter.shape} {state.shelter.length}×{state.shelter.width}×{state.shelter.height}m</p>
              <p>Wall: {state.materials.wallLayers.length} layers</p>
              <p>Roof: {state.materials.roofLayers.length} layers</p>
              <p>Openings: {state.openings.length}</p>
              <p>PCM: {state.pcmConfig ? `${state.pcmConfig.material} (${state.pcmConfig.mass}kg)` : 'None'}</p>
            </div>
          </div>

          <button
            onClick={runSim}
            disabled={!canRun || state.simulation.running}
            className="btn-success w-full"
          >
            {state.simulation.running ? 'Running...' : '▶ Run Simulation'}
          </button>

          {error && (
            <div className="card border-red-800 bg-red-900/20">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {!canRun && (
            <div className="card border-amber-800 bg-amber-900/20">
              <p className="text-xs text-amber-400">
                {state.climate.data.length === 0 ? 'Load climate data first. ' : ''}
                {state.materials.wallLayers.length === 0 ? 'Define wall materials. ' : ''}
              </p>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="lg:col-span-3 space-y-4">
          {result ? (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="card text-center">
                  <div className="text-lg font-bold text-emerald-400">{result.result.comfortableHours.toFixed(1)}</div>
                  <div className="text-[10px] text-slate-500">Comfort Hours</div>
                  <div className="text-[10px] text-slate-600">{result.comfortPercentage.toFixed(0)}%</div>
                </div>
                <div className="card text-center">
                  <div className="text-lg font-bold text-amber-400">{result.result.totalHeatingEnergy_kWh.toFixed(1)}</div>
                  <div className="text-[10px] text-slate-500">Heating [kWh]</div>
                  <div className="text-[10px] text-slate-600">{result.result.hoursRequiringHeating.toFixed(0)}h</div>
                </div>
                <div className="card text-center">
                  <div className="text-lg font-bold text-blue-400">{result.result.minIndoorTemp.toFixed(1)}°</div>
                  <div className="text-[10px] text-slate-500">Min Indoor</div>
                </div>
                <div className="card text-center">
                  <div className="text-lg font-bold text-white">{result.result.avgIndoorTemp.toFixed(1)}°</div>
                  <div className="text-[10px] text-slate-500">Avg Indoor</div>
                </div>
                <div className="card text-center">
                  <div className="text-lg font-bold text-red-400">{result.result.maxIndoorTemp.toFixed(1)}°</div>
                  <div className="text-[10px] text-slate-500">Max Indoor</div>
                </div>
              </div>

              {/* R/U Values */}
              <div className="grid grid-cols-3 gap-3">
                <div className="card">
                  <div className="text-xs text-slate-400">Wall</div>
                  <div className="text-sm">R={result.wallRValue.toFixed(2)} m²K/W • U={result.wallUValue.toFixed(3)} W/m²K</div>
                </div>
                <div className="card">
                  <div className="text-xs text-slate-400">Roof</div>
                  <div className="text-sm">R={result.roofRValue.toFixed(2)} m²K/W • U={result.roofUValue.toFixed(3)} W/m²K</div>
                </div>
                <div className="card">
                  <div className="text-xs text-slate-400">Floor</div>
                  <div className="text-sm">R={result.floorRValue.toFixed(2)} m²K/W • U={result.floorUValue.toFixed(3)} W/m²K</div>
                </div>
              </div>

              {/* Charts */}
              <SimResultCharts result={result.result} targetMin={state.simulation.targetTempMin} targetMax={state.simulation.targetTempMax} />
            </>
          ) : (
            <div className="card h-96 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-4">▶</div>
                <p className="text-slate-400">Configure parameters and run simulation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
