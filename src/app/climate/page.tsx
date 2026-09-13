'use client';

import { useState, useCallback, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { CLIMATE_PRESETS } from '@/lib/climate/presets';
import { fetchOpenMeteoData, generateSyntheticData, LocationInput, OpenMeteoDataset, reverseGeocodeLocation } from '@/lib/climate/open-meteo';
import { parseClimateCSV, parseClimateJSON } from '@/lib/climate/csv-parser';
import dynamic from 'next/dynamic';

const TemperatureChart = dynamic(() => import('@/components/charts/TemperatureChart'), { ssr: false });
const SolarChart = dynamic(() => import('@/components/charts/SolarChart'), { ssr: false });

export default function ClimatePage() {
  const { state, dispatch } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [dataset, setDataset] = useState<OpenMeteoDataset>('auto');
  
  // Local form state
  const [location, setLocation] = useState<LocationInput>(state.climate.location);
  const [startDate, setStartDate] = useState(state.climate.startDate);
  const [endDate, setEndDate] = useState(state.climate.endDate);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);

  useEffect(() => {
    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;

    const timer = setTimeout(async () => {
      setIsResolvingLocation(true);
      try {
        const resolvedName = await reverseGeocodeLocation(latitude, longitude);
        if (resolvedName) {
          setLocation(prev => ({ ...prev, name: resolvedName }));
        }
      } catch {
        // Ignore reverse-geocoding failures and keep the current label.
      } finally {
        setIsResolvingLocation(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [location.latitude, location.longitude]);

  const applyPreset = (presetId: string) => {
    const preset = CLIMATE_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    setSelectedPreset(presetId);
    setLocation(preset.location);
    setStartDate(preset.startDate);
    setEndDate(preset.endDate);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchOpenMeteoData(location, startDate, endDate, { dataset });
      dispatch({
        type: 'SET_CLIMATE',
        payload: {
          location,
          data: result.data,
          source: result.source,
          dataset: result.dataset,
          startDate,
          endDate,
          loaded: true,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fetch failed';
      setError(`API Error: ${msg}. Using synthetic data.`);
      // Fallback to synthetic
      const preset = CLIMATE_PRESETS.find(p => p.id === selectedPreset);
      const synth = preset?.synthetic || { tempMin: -15, tempMax: 0, maxGHI: 600, windSpeedAvg: 3, humidityAvg: 30, cloudCoverAvg: 20 };
      const days = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1);
      const result = generateSyntheticData(location, startDate, days, synth);
      dispatch({
        type: 'SET_CLIMATE',
        payload: {
          location,
          data: result.data,
          source: 'synthetic',
          dataset: 'auto',
          startDate,
          endDate,
          loaded: true,
        },
      });
    } finally {
      setLoading(false);
    }
  }, [location, startDate, endDate, selectedPreset, dispatch]);

  const generateSynthetic = useCallback(() => {
    const preset = CLIMATE_PRESETS.find(p => p.id === selectedPreset);
    const synth = preset?.synthetic || { tempMin: -15, tempMax: 0, maxGHI: 600, windSpeedAvg: 3, humidityAvg: 30, cloudCoverAvg: 20 };
    const days = Math.max(1, Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1);
    const result = generateSyntheticData(location, startDate, days, synth);
    dispatch({
      type: 'SET_CLIMATE',
      payload: {
        location,
        data: result.data,
        source: 'synthetic',
        dataset: 'auto',
        startDate,
        endDate,
        loaded: true,
      },
    });
  }, [location, startDate, endDate, selectedPreset, dispatch]);

  const handleDatasetImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const isJson = file.name.toLowerCase().endsWith('.json');
        const result = isJson ? parseClimateJSON(text) : parseClimateCSV(text);

        if (result.warnings.length > 0) {
          setError(`Import warnings: ${result.warnings.join('; ')}`);
        }

        const startDateValue = result.data[0]?.time ? new Date(result.data[0].time).toISOString().split('T')[0] : state.climate.startDate;
        const endDateValue = result.data[result.data.length - 1]?.time ? new Date(result.data[result.data.length - 1].time).toISOString().split('T')[0] : state.climate.endDate;

        dispatch({
          type: 'SET_CLIMATE',
          payload: {
            location,
            data: result.data,
            source: 'real',
            dataset: 'archive',
            startDate: startDateValue,
            endDate: endDateValue,
            loaded: true,
          },
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Dataset import failed');
      }
    };
    reader.readAsText(file);
  }, [dispatch, location, state.climate.startDate, state.climate.endDate]);

  const sourceBadge = {
    real: 'badge badge-success',
    forecast: 'badge badge-info',
    synthetic: 'badge badge-warning',
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-6">Climate Data</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Controls */}
        <div className="space-y-4">
          {/* Preset Selector */}
          <div className="card">
            <div className="card-header">Location Presets</div>
            <select
              className="input-field"
              value={selectedPreset}
              onChange={e => applyPreset(e.target.value)}
            >
              <option value="">Select a preset...</option>
              {CLIMATE_PRESETS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {selectedPreset && (
              <p className="text-xs text-slate-500 mt-2">
                {CLIMATE_PRESETS.find(p => p.id === selectedPreset)?.description}
              </p>
            )}
          </div>

          {/* Location Form */}
          <div className="card">
            <div className="card-header">Location</div>
            <div className="space-y-3">
              <div>
                <label className="input-label">Name</label>
                <input className="input-field" value={location.name} onChange={e => setLocation({...location, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="input-label">Latitude [°]</label>
                  <input className="input-field" type="number" step="0.01" value={location.latitude} onChange={e => setLocation({...location, latitude: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="input-label">Longitude [°]</label>
                  <input className="input-field" type="number" step="0.01" value={location.longitude} onChange={e => setLocation({...location, longitude: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="input-label">Altitude [m]</label>
                  <input className="input-field" type="number" value={location.altitude} onChange={e => setLocation({...location, altitude: parseFloat(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="input-label">UTC Offset [h]</label>
                  <input className="input-field" type="number" step="0.5" value={location.utcOffset} onChange={e => setLocation({...location, utcOffset: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
            </div>
          </div>

          {/* Date Range */}
          <div className="card">
            <div className="card-header">Simulation Period</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="input-label">Start Date</label>
                <input className="input-field" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="input-label">End Date</label>
                <input className="input-field" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="card">
            <div className="card-header">Data Source</div>
            <div className="space-y-3">
              <div>
                <label className="input-label">Open-Meteo Dataset</label>
                <select
                  className="input-field"
                  value={dataset}
                  onChange={e => setDataset(e.target.value as OpenMeteoDataset)}
                >
                  <option value="auto">Auto (archive or forecast)</option>
                  <option value="archive">Historical archive</option>
                  <option value="forecast">Forecast API</option>
                </select>
              </div>
              <button onClick={fetchData} disabled={loading} className="btn-primary w-full">
                {loading ? 'Fetching...' : 'Fetch from Open-Meteo'}
              </button>
              <button onClick={generateSynthetic} className="btn-secondary w-full">
                Generate Synthetic Data
              </button>
              <div>
                <label className="btn-secondary w-full block text-center cursor-pointer">
                  Import Dataset (.csv / .json)
                  <input type="file" accept=".csv,.json" onChange={handleDatasetImport} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          {error && (
            <div className="card border-amber-800 bg-amber-900/20">
              <p className="text-xs text-amber-400">{error}</p>
            </div>
          )}
        </div>

        {/* Right: Data Preview & Charts */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status Bar */}
          <div className="card flex items-center justify-between">
            <div>
              <span className="text-sm text-slate-300">Data Points: </span>
              <span className="text-sm font-semibold text-white">{state.climate.data.length}</span>
              <span className="text-sm text-slate-500 ml-2">({(state.climate.data.length / 24).toFixed(0)} days)</span>
            </div>
            {state.climate.loaded && (
              <span className={sourceBadge[state.climate.source]}>
                {state.climate.source.toUpperCase()}
              </span>
            )}
          </div>

          {state.climate.data.length > 0 ? (
            <>
              {/* Temperature Chart */}
              <div className="card">
                <div className="card-header">Temperature [°C]</div>
                <div className="h-64">
                  <TemperatureChart data={state.climate.data} />
                </div>
              </div>

              {/* Solar Irradiance Chart */}
              <div className="card">
                <div className="card-header">Solar Irradiance [W/m²]</div>
                <div className="h-64">
                  <SolarChart data={state.climate.data} />
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="card text-center">
                  <div className="text-lg font-semibold text-blue-400">
                    {Math.min(...state.climate.data.map(d => d.temperature)).toFixed(1)}°C
                  </div>
                  <div className="text-[10px] text-slate-500">Min Temp</div>
                </div>
                <div className="card text-center">
                  <div className="text-lg font-semibold text-red-400">
                    {Math.max(...state.climate.data.map(d => d.temperature)).toFixed(1)}°C
                  </div>
                  <div className="text-[10px] text-slate-500">Max Temp</div>
                </div>
                <div className="card text-center">
                  <div className="text-lg font-semibold text-amber-400">
                    {Math.max(...state.climate.data.map(d => d.ghi)).toFixed(0)} W/m²
                  </div>
                  <div className="text-[10px] text-slate-500">Peak GHI</div>
                </div>
                <div className="card text-center">
                  <div className="text-lg font-semibold text-cyan-400">
                    {(state.climate.data.reduce((s, d) => s + d.windSpeed, 0) / state.climate.data.length).toFixed(1)} m/s
                  </div>
                  <div className="text-[10px] text-slate-500">Avg Wind</div>
                </div>
              </div>
            </>
          ) : (
            <div className="card h-64 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-3">☀</div>
                <p className="text-sm text-slate-400">Select a preset and fetch data, upload a CSV, or generate synthetic data.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
