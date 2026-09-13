'use client';

import { useApp } from '@/context/AppContext';

export default function Dashboard() {
  const { state } = useApp();

  const designHealth = state.simulation.result
    ? Math.min(100, Math.max(0, (state.simulation.result.comfortPercentage * 0.7) + (100 - (state.simulation.result.result.totalHeatingEnergy_kWh / 10) * 0.3)))
    : 0;

  const designRecommendations = state.simulation.result
    ? [
        state.simulation.result.result.totalHeatingEnergy_kWh > 50
          ? 'Increase wall and roof insulation or reduce glazing to cut winter heating demand.'
          : 'The current shell is close to the target comfort band; small tuning is likely sufficient.',
        state.simulation.result.avgHeatLoss > 1200
          ? 'Reduce heat leakage through the envelope and tighten infiltration losses.'
          : 'Envelope loss is within a reasonable range for this climate profile.',
        state.pcmConfig
          ? `PCM is active (${state.pcmConfig.material}); keep it in the thermal mass layer to flatten overnight temperature swings.`
          : 'Add PCM storage to improve night-time thermal buffering and extend comfort hours.',
      ]
    : [
        'Load climate data to begin the thermal baseline assessment.',
        'Tune wall and roof assemblies before running a simulation.',
        'Use optimization after the baseline result is available to refine the shelter design.',
      ];

  const nextAction = state.simulation.result
    ? state.simulation.result.result.totalHeatingEnergy_kWh > 25
      ? 'Reduce envelope losses by tightening insulation and glazing before rerunning the simulation.'
      : state.optimization.result
        ? 'Optimization is available; compare the baseline against the recommended design and export the report.'
        : 'The baseline is stable; run optimization to refine comfort and reduce heating energy.'
    : state.climate.loaded
      ? 'Run the baseline simulation to assess thermal comfort and heating demand.'
      : 'Load climate data first to begin the passive shelter assessment.';

  const steps = [
    {
      id: 'climate',
      label: 'Climate Data',
      icon: '☀',
      status: state.climate.loaded ? 'complete' : 'pending',
      detail: state.climate.loaded 
        ? `${state.climate.data.length} hours — ${state.climate.location.name}` 
        : 'No data loaded',
      href: '/climate',
    },
    {
      id: 'shelter',
      label: 'Shelter Design',
      icon: '⌂',
      status: state.shelter.length > 0 ? 'complete' : 'pending',
      detail: `${state.shelter.shape} ${state.shelter.length}×${state.shelter.width}×${state.shelter.height}m`,
      href: '/shelter',
    },
    {
      id: 'materials',
      label: 'Materials',
      icon: '▦',
      status: state.materials.wallLayers.length > 0 ? 'complete' : 'pending',
      detail: `Wall: ${state.materials.wallLayers.length} layers, Roof: ${state.materials.roofLayers.length}, Floor: ${state.materials.floorLayers.length}`,
      href: '/materials',
    },
    {
      id: 'simulation',
      label: 'Simulation',
      icon: '▶',
      status: state.simulation.result ? 'complete' : state.simulation.running ? 'running' : 'pending',
      detail: state.simulation.result 
        ? `${state.simulation.result.result.comfortableHours.toFixed(1)}h comfort, ${state.simulation.result.result.totalHeatingEnergy_kWh.toFixed(1)} kWh heating` 
        : 'Not run',
      href: '/simulation',
    },
    {
      id: 'optimization',
      label: 'Optimization',
      icon: '⚡',
      status: state.optimization.result ? 'complete' : state.optimization.running ? 'running' : 'pending',
      detail: state.optimization.result 
        ? `${state.optimization.result.improvement.heatingReductionPercent.toFixed(1)}% heating reduction` 
        : 'Not run',
      href: '/optimization',
    },
    {
      id: 'ansys',
      label: 'ANSYS Validation',
      icon: '✓',
      status: state.ansys.validation ? (state.ansys.validation.status === 'pass' ? 'complete' : 'warning') : 'pending',
      detail: state.ansys.validation 
        ? `${state.ansys.validation.status.toUpperCase()} — Avg err: ${state.ansys.validation.avgAbsoluteError.toFixed(2)}°C` 
        : 'Pending ANSYS results',
      href: '/ansys',
    },
  ];

  const statusColors: Record<string, string> = {
    complete: 'bg-emerald-500',
    running: 'bg-blue-500 animate-pulse',
    warning: 'bg-amber-500',
    pending: 'bg-slate-600',
  };
  
  const statusBorders: Record<string, string> = {
    complete: 'border-emerald-500/30',
    running: 'border-blue-500/30',
    warning: 'border-amber-500/30',
    pending: 'border-slate-700',
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">TAPAS</h1>
        <p className="text-sm text-slate-400 mt-1">
          Region-specific thermal comfort analysis for high-altitude cold regions
        </p>
      </div>

      {/* Workflow Pipeline */}
      <div className="card mb-8">
        <div className="card-header">Design Workflow</div>
        <div className="flex items-center gap-2 overflow-x-auto py-2">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <a
                href={step.href}
                className={`flex items-center gap-2 px-3 py-2 rounded border ${statusBorders[step.status]} hover:bg-slate-700/50 transition-colors min-w-[140px]`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${statusColors[step.status]}`} />
                <div>
                  <div className="text-xs font-medium text-slate-200">{step.label}</div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{step.detail}</div>
                </div>
              </a>
              {i < steps.length - 1 && (
                <span className="text-slate-600 mx-1">→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card mb-8">
        <div className="card-header">Recommended next step</div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="text-sm text-slate-300 max-w-2xl">{nextAction}</p>
          <div className="flex flex-wrap gap-2">
            <a href="/climate" className="btn-secondary text-xs">Open climate</a>
            <a href="/simulation" className="btn-primary text-xs">Run baseline</a>
            <a href="/optimization" className="btn-secondary text-xs">Optimize design</a>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <div className="stat-label">Location</div>
          <div className="text-lg font-semibold text-white truncate">{state.climate.location.name}</div>
          <div className="text-xs text-slate-500">
            {state.climate.location.latitude.toFixed(2)}°N, {state.climate.location.altitude}m alt
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Shelter</div>
          <div className="text-lg font-semibold text-white">
            {state.shelter.length}×{state.shelter.width}×{state.shelter.height}m
          </div>
          <div className="text-xs text-slate-500">
            {state.shelter.shape} — {(state.shelter.length * state.shelter.width * state.shelter.height).toFixed(0)} m³
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Comfort Hours</div>
          <div className="stat-value">
            {state.simulation.result ? state.simulation.result.result.comfortableHours.toFixed(1) : '—'}
            <span className="stat-unit">h</span>
          </div>
          <div className="text-xs text-slate-500">
            {state.simulation.result 
              ? `${state.simulation.result.comfortPercentage.toFixed(0)}% of simulation` 
              : 'Run simulation first'}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Heating Required</div>
          <div className="stat-value">
            {state.simulation.result ? state.simulation.result.result.totalHeatingEnergy_kWh.toFixed(1) : '—'}
            <span className="stat-unit">kWh</span>
          </div>
          <div className="text-xs text-slate-500">
            {state.simulation.result 
              ? `${state.simulation.result.result.hoursRequiringHeating.toFixed(0)}h requiring heat` 
              : 'Run simulation first'}
          </div>
        </div>
      </div>

      {/* Simulation Summary (if available) */}
      {state.simulation.result && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="card text-center">
            <div className="text-sm text-blue-400">{state.simulation.result.result.minIndoorTemp.toFixed(1)}°C</div>
            <div className="text-[10px] text-slate-500">Min Indoor</div>
          </div>
          <div className="card text-center">
            <div className="text-sm text-emerald-400">{state.simulation.result.result.avgIndoorTemp.toFixed(1)}°C</div>
            <div className="text-[10px] text-slate-500">Avg Indoor</div>
          </div>
          <div className="card text-center">
            <div className="text-sm text-amber-400">{state.simulation.result.result.maxIndoorTemp.toFixed(1)}°C</div>
            <div className="text-[10px] text-slate-500">Max Indoor</div>
          </div>
          <div className="card text-center">
            <div className="text-sm text-cyan-400">{state.simulation.result.wallUValue.toFixed(3)}</div>
            <div className="text-[10px] text-slate-500">Wall U W/m²K</div>
          </div>
          <div className="card text-center">
            <div className="text-sm text-purple-400">{state.simulation.result.avgSolarGain.toFixed(0)} W</div>
            <div className="text-[10px] text-slate-500">Avg Solar Gain</div>
          </div>
        </div>
      )}

      {/* Design Recommendation */}
      <div className="card mb-8">
        <div className="card-header">Design Recommendation</div>
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_2fr] gap-5 items-center">
          <div>
            <div className="text-3xl font-bold text-white">{state.simulation.result ? `${designHealth.toFixed(0)}/100` : '—'}</div>
            <div className="text-xs text-slate-400 mt-1">
              {state.simulation.result ? 'Current design health score' : 'Run a baseline simulation to assess the design'}
            </div>
            <div className="h-2.5 w-full bg-slate-800 rounded-full mt-4 overflow-hidden">
              <div
                className={`h-full rounded-full ${designHealth >= 70 ? 'bg-emerald-500' : designHealth >= 45 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, designHealth)}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            {designRecommendations.map((recommendation, index) => (
              <div key={`${recommendation}-${index}`} className="flex gap-2 text-sm text-slate-300">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>{recommendation}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Project Info */}
      <div className="card">
        <div className="card-header">About This Tool</div>
        <div className="text-sm text-slate-400 space-y-2">
          <p>
            Physics-based thermal simulation for passive shelter design. Optimizes geometry, materials, 
            and thermal mass for thermal comfort in extreme climates like Ladakh.
          </p>
          <p className="text-xs text-slate-500">
            Core engine: transient energy balance with conduction, solar radiation, longwave radiation, 
            infiltration, internal gains, PCM thermal storage, and external heating calculation.
          </p>
        </div>
      </div>
    </div>
  );
}
