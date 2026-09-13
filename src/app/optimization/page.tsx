'use client';

import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { runOptimization } from '@/lib/optimization/genetic-algorithm';

export default function OptimizationPage() {
  const { state, dispatch } = useApp();
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('Ready');

  const baselineSummary = state.simulation.result;

  const heatFlowBreakdown = useMemo(() => {
    if (!baselineSummary) return [];

    const arr = baselineSummary.result;
    const avg = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

    return [
      { label: 'Wall', value: avg(arr.wallHeatLoss) },
      { label: 'Roof', value: avg(arr.roofHeatLoss) },
      { label: 'Floor', value: avg(arr.floorHeatLoss) },
      { label: 'Windows', value: avg(arr.windowHeatLoss) },
      { label: 'Infiltration', value: avg(arr.infiltrationLoss) },
      { label: 'Solar Gain', value: avg(arr.solarGainTotal) },
    ];
  }, [baselineSummary]);

  const recommendations = useMemo(() => {
    if (!state.optimization.result) return [];

    const recommendationsList: string[] = [];
    const best = state.optimization.result.bestDesign;
    const baseline = state.simulation.result;

    if (!baseline) return recommendationsList;

    if (state.optimization.result.improvement.heatingReductionPercent > 10) {
      recommendationsList.push('Increase insulation thickness or use a lower-conductivity material to cut heating demand substantially.');
    }

    if (best.pcmConfig) {
      recommendationsList.push(`PCM storage is beneficial; keep ${best.pcmConfig.material} near the thermal mass layer to smooth night-time temperature swings.`);
    }

    if (best.openings.length > 0 && best.openings.reduce((sum, item) => sum + item.area, 0) > 0) {
      recommendationsList.push('Window area remains moderate; reducing glazing and improving glazing U-value should improve comfort in cold conditions.');
    }

    if (state.optimization.result.bestSummary.result.comfortableHours > baseline.result.comfortableHours) {
      recommendationsList.push('The optimized design improves comfort hours without increasing heating demand excessively.');
    }

    if (recommendationsList.length === 0) {
      recommendationsList.push('The current shelter is already close to the comfort target; small insulation tuning may be enough.');
    }

    return recommendationsList;
  }, [state]);

  const baselineInput = useMemo(() => ({
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
  }), [state]);

  const canRun =
    state.climate.data.length > 0 &&
    state.materials.wallLayers.length > 0 &&
    state.simulation.result !== null;

  const runOptim = () => {
    if (!canRun) {
      setError('Load climate data and run the baseline simulation before optimization.');
      return;
    }

    setError(null);
    setProgress('Initializing genetic algorithm...');
    dispatch({ type: 'SET_OPTIMIZATION_RUNNING', payload: true });

    setTimeout(() => {
      try {
        const result = runOptimization(
          baselineInput,
          state.optimization.config,
          (gen, bestFitness, totalGens) => {
            setProgress(`Generation ${gen + 1}/${totalGens} · best fitness ${bestFitness.toFixed(3)}`);
          }
        );

        dispatch({ type: 'SET_OPTIMIZATION_RESULT', payload: result });
        setProgress(`Optimization complete · heating reduction ${result.improvement.heatingReductionPercent.toFixed(1)}%`);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Optimization failed');
        setProgress('Optimization failed');
      } finally {
        dispatch({ type: 'SET_OPTIMIZATION_RUNNING', payload: false });
      }
    }, 50);
  };

  const result = state.optimization.result;

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-6">Optimization</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-4">
          <div className="card">
            <div className="card-header">Optimization Parameters</div>
            <div className="space-y-3">
              <div>
                <label className="input-label">Population</label>
                <input
                  className="input-field"
                  type="number"
                  min="10"
                  max="200"
                  value={state.optimization.config.populationSize}
                  onChange={(e) => dispatch({
                    type: 'SET_OPTIMIZATION_CONFIG',
                    payload: { populationSize: Number(e.target.value) || 20 },
                  })}
                />
              </div>

              <div>
                <label className="input-label">Generations</label>
                <input
                  className="input-field"
                  type="number"
                  min="10"
                  max="200"
                  value={state.optimization.config.generations}
                  onChange={(e) => dispatch({
                    type: 'SET_OPTIMIZATION_CONFIG',
                    payload: { generations: Number(e.target.value) || 20 },
                  })}
                />
              </div>

              <div>
                <label className="input-label">Mutation Rate</label>
                <input
                  className="input-field"
                  type="number"
                  min="0"
                  max="0.5"
                  step="0.05"
                  value={state.optimization.config.mutationRate}
                  onChange={(e) => dispatch({
                    type: 'SET_OPTIMIZATION_CONFIG',
                    payload: { mutationRate: Number(e.target.value) || 0.1 },
                  })}
                />
              </div>

              <div>
                <label className="input-label">Crossover Rate</label>
                <input
                  className="input-field"
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={state.optimization.config.crossoverRate}
                  onChange={(e) => dispatch({
                    type: 'SET_OPTIMIZATION_CONFIG',
                    payload: { crossoverRate: Number(e.target.value) || 0.8 },
                  })}
                />
              </div>
            </div>
          </div>

          <button
            className="btn-success w-full"
            onClick={runOptim}
            disabled={!canRun || state.optimization.running}
          >
            {state.optimization.running ? 'Optimizing...' : '▶ Run Optimization'}
          </button>

          {progress && (
            <div className="card border-blue-800 bg-blue-900/20">
              <p className="text-xs text-blue-300">{progress}</p>
            </div>
          )}

          {error && (
            <div className="card border-red-800 bg-red-900/20">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 space-y-4">
          {!result ? (
            <div className="card h-[420px] flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-4">⚡</div>
                <p className="text-slate-400">Run the optimization engine to find a better shelter design.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="card text-center">
                  <div className="text-lg font-bold text-emerald-400">{result.improvement.heatingReductionPercent.toFixed(1)}%</div>
                  <div className="text-[10px] text-slate-500">Heating Reduction</div>
                </div>
                <div className="card text-center">
                  <div className="text-lg font-bold text-blue-400">{result.improvement.comfortHoursChange.toFixed(1)}h</div>
                  <div className="text-[10px] text-slate-500">Comfort Change</div>
                </div>
                <div className="card text-center">
                  <div className="text-lg font-bold text-amber-400">{result.bestSummary.result.totalHeatingEnergy_kWh.toFixed(1)} kWh</div>
                  <div className="text-[10px] text-slate-500">Optimized Heating</div>
                </div>
                <div className="card text-center">
                  <div className="text-lg font-bold text-white">{result.bestDesign.length.toFixed(1)}×{result.bestDesign.width.toFixed(1)}×{result.bestDesign.height.toFixed(1)}m</div>
                  <div className="text-[10px] text-slate-500">Best Dimensions</div>
                </div>
                <div className="card text-center">
                  <div className="text-lg font-bold text-cyan-400">{result.bestDesign.shape}</div>
                  <div className="text-[10px] text-slate-500">Best Shape</div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">Baseline vs Optimized Comparison</div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs text-slate-300">
                  <div className="bg-slate-900/60 rounded p-3">
                    <div className="text-slate-400">Comfort</div>
                    <div className="text-base font-semibold text-white">{state.simulation.result?.result.comfortableHours.toFixed(1) ?? '0.0'}h</div>
                    <div className="text-emerald-400">→ {result.bestSummary.result.comfortableHours.toFixed(1)}h</div>
                  </div>
                  <div className="bg-slate-900/60 rounded p-3">
                    <div className="text-slate-400">Heating</div>
                    <div className="text-base font-semibold text-white">{state.simulation.result?.result.totalHeatingEnergy_kWh.toFixed(1) ?? '0.0'} kWh</div>
                    <div className="text-emerald-400">→ {result.bestSummary.result.totalHeatingEnergy_kWh.toFixed(1)} kWh</div>
                  </div>
                  <div className="bg-slate-900/60 rounded p-3">
                    <div className="text-slate-400">Avg Indoor</div>
                    <div className="text-base font-semibold text-white">{state.simulation.result?.result.avgIndoorTemp.toFixed(1) ?? '0.0'}°C</div>
                    <div className="text-emerald-400">→ {result.bestSummary.result.avgIndoorTemp.toFixed(1)}°C</div>
                  </div>
                  <div className="bg-slate-900/60 rounded p-3">
                    <div className="text-slate-400">Heat Loss</div>
                    <div className="text-base font-semibold text-white">{state.simulation.result?.avgHeatLoss.toFixed(0) ?? '0'} W</div>
                    <div className="text-emerald-400">→ {result.bestSummary.avgHeatLoss.toFixed(0)} W</div>
                  </div>
                  <div className="bg-slate-900/60 rounded p-3">
                    <div className="text-slate-400">Solar Gain</div>
                    <div className="text-base font-semibold text-white">{state.simulation.result?.avgSolarGain.toFixed(0) ?? '0'} W</div>
                    <div className="text-emerald-400">→ {result.bestSummary.avgSolarGain.toFixed(0)} W</div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">Heat Flow Breakdown</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-slate-300">
                  {heatFlowBreakdown.map((item) => (
                    <div key={item.label} className="bg-slate-900/60 rounded p-3">
                      <div className="text-slate-400">{item.label}</div>
                      <div className="text-base font-semibold text-white">{item.value.toFixed(0)} W</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-header">Best Design Summary</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-300">
                  <div><span className="text-slate-500">Shape:</span> <span className="text-white">{result.bestDesign.shape}</span></div>
                  <div><span className="text-slate-500">Azimuth:</span> <span className="text-white">{result.bestDesign.azimuth.toFixed(0)}°</span></div>
                  <div><span className="text-slate-500">Wall U:</span> <span className="text-white">{result.bestSummary.wallUValue.toFixed(3)} W/m²K</span></div>
                  <div><span className="text-slate-500">Roof U:</span> <span className="text-white">{result.bestSummary.roofUValue.toFixed(3)} W/m²K</span></div>
                  <div><span className="text-slate-500">Comfort:</span> <span className="text-emerald-400">{result.bestSummary.result.comfortableHours.toFixed(1)}h</span></div>
                  <div><span className="text-slate-500">Avg heat loss:</span> <span className="text-white">{result.bestSummary.avgHeatLoss.toFixed(0)} W</span></div>
                  <div><span className="text-slate-500">Avg solar gain:</span> <span className="text-white">{result.bestSummary.avgSolarGain.toFixed(0)} W</span></div>
                  <div><span className="text-slate-500">PCM:</span> <span className="text-white">{result.bestDesign.pcmConfig ? `${result.bestDesign.pcmConfig.material} (${result.bestDesign.pcmConfig.mass}kg)` : 'None'}</span></div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">Design Recommendations</div>
                <ul className="space-y-2 text-sm text-slate-300 list-disc pl-5">
                  {recommendations.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="card">
                <div className="card-header">Optimization Convergence</div>
                <div className="space-y-2">
                  {result.convergence.slice(-8).map((point, index) => (
                    <div key={`${point.generation}-${index}`} className="flex items-center justify-between text-xs text-slate-300">
                      <span>Gen {point.generation}</span>
                      <span className="text-white">best {point.bestFitness.toFixed(3)}</span>
                      <span className="text-slate-500">avg {point.avgFitness.toFixed(3)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
