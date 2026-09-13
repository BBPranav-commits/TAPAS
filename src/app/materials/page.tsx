'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { MaterialLayer, Opening, PCMConfig } from '@/lib/physics/types';
import { MATERIAL_DATABASE } from '@/lib/materials/database';
import { PCM_DATABASE, getPCMsForTempRange } from '@/lib/materials/pcm-database';
import { calculateLayerR, calculateAssemblyR, calculateUValue } from '@/lib/physics/conduction';

type AssemblyTab = 'wall' | 'roof' | 'floor';

function LayerEditor({ layers, onUpdate, assemblyType }: { layers: MaterialLayer[]; onUpdate: (layers: MaterialLayer[]) => void; assemblyType: AssemblyTab }) {
  const addLayer = () => {
    const defaultMat = MATERIAL_DATABASE[0];
    onUpdate([...layers, {
      name: defaultMat.name,
      thickness: 0.1,
      conductivity: defaultMat.conductivity,
      density: defaultMat.density,
      specificHeat: defaultMat.specificHeat,
      emissivity: defaultMat.emissivity,
      solarAbsorptivity: defaultMat.solarAbsorptivity,
    }]);
  };

  const removeLayer = (idx: number) => {
    onUpdate(layers.filter((_, i) => i !== idx));
  };

  const updateLayer = (idx: number, changes: Partial<MaterialLayer>) => {
    const updated = layers.map((l, i) => i === idx ? { ...l, ...changes } : l);
    onUpdate(updated);
  };

  const selectMaterial = (idx: number, matId: string) => {
    const mat = MATERIAL_DATABASE.find(m => m.id === matId);
    if (!mat) return;
    updateLayer(idx, {
      name: mat.name,
      conductivity: mat.conductivity,
      density: mat.density,
      specificHeat: mat.specificHeat,
      emissivity: mat.emissivity,
      solarAbsorptivity: mat.solarAbsorptivity,
    });
  };

  const moveLayer = (idx: number, direction: -1 | 1) => {
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= layers.length) return;
    const updated = [...layers];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    onUpdate(updated);
  };

  const rTotal = calculateAssemblyR(layers, assemblyType);
  const uValue = calculateUValue(rTotal);

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex gap-4 text-sm">
        <div><span className="text-slate-400">R-total:</span> <span className="font-semibold text-white">{rTotal.toFixed(3)} m²K/W</span></div>
        <div><span className="text-slate-400">U-value:</span> <span className="font-semibold text-white">{uValue.toFixed(3)} W/m²K</span></div>
        <div><span className="text-slate-400">Layers:</span> <span className="font-semibold text-white">{layers.length}</span></div>
      </div>

      {/* Layer List */}
      {layers.map((layer, idx) => {
        const layerR = calculateLayerR(layer.thickness, layer.conductivity);
        return (
          <div key={idx} className="bg-slate-900/50 border border-slate-700 rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-300">Layer {idx + 1}: {layer.name}</span>
              <div className="flex gap-1">
                <button onClick={() => moveLayer(idx, -1)} className="text-xs text-slate-500 hover:text-white px-1" title="Move up">↑</button>
                <button onClick={() => moveLayer(idx, 1)} className="text-xs text-slate-500 hover:text-white px-1" title="Move down">↓</button>
                <button onClick={() => removeLayer(idx)} className="text-xs text-red-500 hover:text-red-400 px-1" title="Remove">✕</button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="col-span-2">
                <label className="input-label">Material</label>
                <select
                  className="input-field text-xs"
                  value={MATERIAL_DATABASE.find(m => m.name === layer.name)?.id || ''}
                  onChange={e => selectMaterial(idx, e.target.value)}
                >
                  <option value="">Custom</option>
                  {MATERIAL_DATABASE.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="input-label">Thickness [m]</label>
                <input className="input-field text-xs" type="number" min="0.001" max="2" step="0.01" value={layer.thickness} onChange={e => updateLayer(idx, { thickness: parseFloat(e.target.value) || 0.01 })} />
              </div>
              <div>
                <label className="input-label">k [W/mK]</label>
                <input className="input-field text-xs" type="number" min="0.001" step="0.01" value={layer.conductivity} onChange={e => updateLayer(idx, { conductivity: parseFloat(e.target.value) || 0.01 })} />
              </div>
              <div>
                <label className="input-label">ρ [kg/m³]</label>
                <input className="input-field text-xs" type="number" min="1" step="10" value={layer.density} onChange={e => updateLayer(idx, { density: parseFloat(e.target.value) || 1 })} />
              </div>
              <div>
                <label className="input-label">Cp [J/kgK]</label>
                <input className="input-field text-xs" type="number" min="100" step="50" value={layer.specificHeat} onChange={e => updateLayer(idx, { specificHeat: parseFloat(e.target.value) || 100 })} />
              </div>
              <div>
                <label className="input-label">ε [-]</label>
                <input className="input-field text-xs" type="number" min="0" max="1" step="0.05" value={layer.emissivity} onChange={e => updateLayer(idx, { emissivity: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="input-label">α₀ [-]</label>
                <input className="input-field text-xs" type="number" min="0" max="1" step="0.05" value={layer.solarAbsorptivity} onChange={e => updateLayer(idx, { solarAbsorptivity: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">R = {layerR.toFixed(4)} m²K/W ({((layerR / rTotal) * 100).toFixed(0)}% of total)</div>
          </div>
        );
      })}

      <button onClick={addLayer} className="btn-secondary w-full text-xs">+ Add Layer</button>
    </div>
  );
}

function OpeningsEditor({ openings, onUpdate }: { openings: Opening[]; onUpdate: (openings: Opening[]) => void }) {
  const addOpening = (type: 'window' | 'door') => {
    onUpdate([...openings, {
      type,
      area: type === 'window' ? 1.5 : 1.8,
      orientation: 180,
      uValue: type === 'window' ? 2.8 : 3.5,
      shgc: type === 'window' ? 0.6 : 0.1,
      airLeakage: type === 'window' ? 0.0005 : 0.001,
    }]);
  };

  const removeOpening = (idx: number) => onUpdate(openings.filter((_, i) => i !== idx));

  const updateOpening = (idx: number, changes: Partial<Opening>) => {
    onUpdate(openings.map((o, i) => i === idx ? { ...o, ...changes } : o));
  };

  return (
    <div className="space-y-3">
      {openings.map((op, idx) => (
        <div key={idx} className="bg-slate-900/50 border border-slate-700 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-300">
              {op.type === 'window' ? '🔳' : '🚪'} {op.type.charAt(0).toUpperCase() + op.type.slice(1)} {idx + 1}
            </span>
            <button onClick={() => removeOpening(idx)} className="text-xs text-red-500 hover:text-red-400">✕</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div>
              <label className="input-label">Area [m²]</label>
              <input className="input-field text-xs" type="number" min="0.1" step="0.1" value={op.area} onChange={e => updateOpening(idx, { area: parseFloat(e.target.value) || 0.1 })} />
            </div>
            <div>
              <label className="input-label">Orient [°]</label>
              <input className="input-field text-xs" type="number" min="0" max="360" step="5" value={op.orientation} onChange={e => updateOpening(idx, { orientation: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="input-label">U [W/m²K]</label>
              <input className="input-field text-xs" type="number" min="0.1" step="0.1" value={op.uValue} onChange={e => updateOpening(idx, { uValue: parseFloat(e.target.value) || 0.1 })} />
            </div>
            <div>
              <label className="input-label">SHGC [-]</label>
              <input className="input-field text-xs" type="number" min="0" max="1" step="0.05" value={op.shgc} onChange={e => updateOpening(idx, { shgc: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="input-label">Leak [m³/s]</label>
              <input className="input-field text-xs" type="number" min="0" step="0.0001" value={op.airLeakage} onChange={e => updateOpening(idx, { airLeakage: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <button onClick={() => addOpening('window')} className="btn-secondary text-xs flex-1">+ Add Window</button>
        <button onClick={() => addOpening('door')} className="btn-secondary text-xs flex-1">+ Add Door</button>
      </div>
    </div>
  );
}

function PCMEditor({ config, onUpdate }: { config: PCMConfig | undefined; onUpdate: (config: PCMConfig | undefined) => void }) {
  const enablePCM = () => {
    const pcm = PCM_DATABASE[1]; // RT18 default
    onUpdate({
      material: pcm.name,
      mass: 50,
      meltingPoint: pcm.meltingPoint,
      transitionRange: pcm.transitionRange,
      latentHeat: pcm.latentHeat * 1000, // kJ/kg -> J/kg
      cpSolid: pcm.cpSolid,
      cpLiquid: pcm.cpLiquid,
      kSolid: pcm.kSolid,
      kLiquid: pcm.kLiquid,
      density: pcm.density,
    });
  };

  const selectPCM = (pcmId: string) => {
    const pcm = PCM_DATABASE.find(p => p.id === pcmId);
    if (!pcm || !config) return;
    onUpdate({
      ...config,
      material: pcm.name,
      meltingPoint: pcm.meltingPoint,
      transitionRange: pcm.transitionRange,
      latentHeat: pcm.latentHeat * 1000,
      cpSolid: pcm.cpSolid,
      cpLiquid: pcm.cpLiquid,
      kSolid: pcm.kSolid,
      kLiquid: pcm.kLiquid,
      density: pcm.density,
    });
  };

  if (!config) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-slate-400 mb-3">No PCM configured</p>
        <button onClick={enablePCM} className="btn-primary text-xs">Enable PCM Thermal Storage</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <label className="input-label">PCM Material</label>
          <select className="input-field text-xs" value={PCM_DATABASE.find(p => p.name === config.material)?.id || ''} onChange={e => selectPCM(e.target.value)}>
            <option value="">Custom</option>
            {PCM_DATABASE.map(p => (<option key={p.id} value={p.id}>{p.name} (Tm={p.meltingPoint}°C)</option>))}
          </select>
        </div>
        <div>
          <label className="input-label">Mass [kg]</label>
          <input className="input-field text-xs" type="number" min="1" step="5" value={config.mass} onChange={e => onUpdate({ ...config, mass: parseFloat(e.target.value) || 1 })} />
        </div>
        <div>
          <label className="input-label">Melting Point [°C]</label>
          <input className="input-field text-xs" type="number" step="1" value={config.meltingPoint} onChange={e => onUpdate({ ...config, meltingPoint: parseFloat(e.target.value) || 0 })} />
        </div>
        <div>
          <label className="input-label">Latent Heat [kJ/kg]</label>
          <input className="input-field text-xs" type="number" min="0" step="10" value={config.latentHeat / 1000} onChange={e => onUpdate({ ...config, latentHeat: (parseFloat(e.target.value) || 0) * 1000 })} />
        </div>
        <div>
          <label className="input-label">Transition Range [°C]</label>
          <input className="input-field text-xs" type="number" min="0.5" step="0.5" value={config.transitionRange} onChange={e => onUpdate({ ...config, transitionRange: parseFloat(e.target.value) || 1 })} />
        </div>
      </div>
      <div className="text-xs text-slate-500">
        Total latent capacity: {((config.latentHeat * config.mass) / 3600000).toFixed(2)} kWh
      </div>
      <button onClick={() => onUpdate(undefined)} className="text-xs text-red-400 hover:text-red-300">Remove PCM</button>
    </div>
  );
}

export default function MaterialsPage() {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<AssemblyTab | 'openings' | 'pcm'>('wall');

  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: 'wall', label: 'Wall' },
    { id: 'roof', label: 'Roof' },
    { id: 'floor', label: 'Floor' },
    { id: 'openings', label: 'Openings' },
    { id: 'pcm', label: 'PCM' },
  ];

  const applyColdClimatePreset = () => {
    const wallLayers: MaterialLayer[] = [
      { name: 'Mud Brick (Adobe)', thickness: 0.25, conductivity: 0.75, density: 1700, specificHeat: 900, emissivity: 0.9, solarAbsorptivity: 0.7 },
      { name: 'Polyurethane Foam (PUF)', thickness: 0.12, conductivity: 0.025, density: 35, specificHeat: 1400, emissivity: 0.9, solarAbsorptivity: 0.5 },
      { name: 'Wood (Softwood / Pine)', thickness: 0.04, conductivity: 0.13, density: 500, specificHeat: 1700, emissivity: 0.9, solarAbsorptivity: 0.6 },
    ];
    const roofLayers: MaterialLayer[] = [
      { name: 'Concrete (Dense)', thickness: 0.12, conductivity: 1.4, density: 2300, specificHeat: 880, emissivity: 0.9, solarAbsorptivity: 0.65 },
      { name: 'Polyurethane Foam (PUF)', thickness: 0.15, conductivity: 0.025, density: 35, specificHeat: 1400, emissivity: 0.9, solarAbsorptivity: 0.5 },
      { name: 'Wood (Softwood / Pine)', thickness: 0.04, conductivity: 0.13, density: 500, specificHeat: 1700, emissivity: 0.9, solarAbsorptivity: 0.6 },
    ];
    const floorLayers: MaterialLayer[] = [
      { name: 'Concrete (Dense)', thickness: 0.15, conductivity: 1.4, density: 2300, specificHeat: 880, emissivity: 0.9, solarAbsorptivity: 0.65 },
      { name: 'Polyurethane Foam (PUF)', thickness: 0.1, conductivity: 0.025, density: 35, specificHeat: 1400, emissivity: 0.9, solarAbsorptivity: 0.5 },
    ];

    dispatch({ type: 'SET_WALL_LAYERS', payload: wallLayers });
    dispatch({ type: 'SET_ROOF_LAYERS', payload: roofLayers });
    dispatch({ type: 'SET_FLOOR_LAYERS', payload: floorLayers });
    dispatch({ type: 'SET_OPENINGS', payload: [
      { type: 'window', area: 1.2, orientation: state.shelter.azimuth || 180, uValue: 1.8, shgc: 0.48, airLeakage: 0.00025 },
      { type: 'door', area: 1.6, orientation: state.shelter.azimuth || 180, uValue: 1.8, shgc: 0.08, airLeakage: 0.0008 },
    ] });
  };

  const applyRecommendedPCM = () => {
    const targetMin = state.simulation.targetTempMin;
    const targetMax = state.simulation.targetTempMax;
    const candidates = getPCMsForTempRange(targetMin - 4, targetMax + 4);
    const palette = candidates.length ? candidates : PCM_DATABASE;
    const selected = palette[Math.min(1, palette.length - 1)] ?? PCM_DATABASE[1];

    dispatch({
      type: 'SET_PCM',
      payload: {
        material: selected.name,
        mass: 60,
        meltingPoint: selected.meltingPoint,
        transitionRange: selected.transitionRange,
        latentHeat: selected.latentHeat * 1000,
        cpSolid: selected.cpSolid,
        cpLiquid: selected.cpLiquid,
        kSolid: selected.kSolid,
        kLiquid: selected.kLiquid,
        density: selected.density,
      },
    });
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-6">Materials & Assemblies</h1>

      <div className="card mb-6">
        <div className="card-header">Recommended Design presets</div>
        <div className="flex flex-wrap gap-3">
          <button className="btn-primary text-xs" onClick={applyColdClimatePreset}>Cold-climate insulation preset</button>
          <button className="btn-secondary text-xs" onClick={applyRecommendedPCM}>PCM match for target range</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 mb-6 border-b border-slate-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-2 text-sm font-medium ${activeTab === tab.id ? 'tab-active' : 'tab-inactive'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="card">
        {activeTab === 'wall' && (
          <>
            <div className="card-header">Wall Assembly (Outside → Inside)</div>
            <LayerEditor
              layers={state.materials.wallLayers}
              onUpdate={layers => dispatch({ type: 'SET_WALL_LAYERS', payload: layers })}
              assemblyType="wall"
            />
          </>
        )}
        {activeTab === 'roof' && (
          <>
            <div className="card-header">Roof Assembly (Outside → Inside)</div>
            <LayerEditor
              layers={state.materials.roofLayers}
              onUpdate={layers => dispatch({ type: 'SET_ROOF_LAYERS', payload: layers })}
              assemblyType="roof"
            />
          </>
        )}
        {activeTab === 'floor' && (
          <>
            <div className="card-header">Floor Assembly (Ground → Inside)</div>
            <LayerEditor
              layers={state.materials.floorLayers}
              onUpdate={layers => dispatch({ type: 'SET_FLOOR_LAYERS', payload: layers })}
              assemblyType="floor"
            />
          </>
        )}
        {activeTab === 'openings' && (
          <>
            <div className="card-header">Windows & Doors</div>
            <OpeningsEditor
              openings={state.openings}
              onUpdate={openings => dispatch({ type: 'SET_OPENINGS', payload: openings })}
            />
          </>
        )}
        {activeTab === 'pcm' && (
          <>
            <div className="card-header">Phase Change Material (PCM) Thermal Storage</div>
            <PCMEditor
              config={state.pcmConfig}
              onUpdate={config => dispatch({ type: 'SET_PCM', payload: config })}
            />
          </>
        )}
      </div>
    </div>
  );
}
