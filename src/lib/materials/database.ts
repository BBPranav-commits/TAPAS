import { Material } from './types';

/**
 * Built-in material library with thermophysical properties.
 * Sources: ASHRAE Handbook, ISO 10456, CIBSE Guide A
 */
export const MATERIAL_DATABASE: Material[] = [
  // === STRUCTURAL ===
  {
    id: 'mud-brick',
    name: 'Mud Brick (Adobe)',
    category: 'structural',
    conductivity: 0.75,
    density: 1700,
    specificHeat: 900,
    emissivity: 0.90,
    solarAbsorptivity: 0.70,
    description: 'Traditional sun-dried mud brick, common in Ladakh'
  },
  {
    id: 'stone-granite',
    name: 'Stone (Granite)',
    category: 'structural',
    conductivity: 2.8,
    density: 2650,
    specificHeat: 790,
    emissivity: 0.90,
    solarAbsorptivity: 0.55,
    description: 'Dense ignite rock'
  },
  {
    id: 'stone-limestone',
    name: 'Stone (Limestone)',
    category: 'structural',
    conductivity: 1.5,
    density: 2300,
    specificHeat: 840,
    emissivity: 0.90,
    solarAbsorptivity: 0.55,
    description: 'Sedimentary limestone'
  },
  {
    id: 'stone-sandstone',
    name: 'Stone (Sandstone)',
    category: 'structural',
    conductivity: 1.6,
    density: 2300,
    specificHeat: 920,
    emissivity: 0.90,
    solarAbsorptivity: 0.60,
    description: 'Sedimentary sandstone'
  },
  {
    id: 'concrete-dense',
    name: 'Concrete (Dense)',
    category: 'structural',
    conductivity: 1.4,
    density: 2300,
    specificHeat: 880,
    emissivity: 0.90,
    solarAbsorptivity: 0.65,
    description: 'Standard dense concrete'
  },
  {
    id: 'concrete-aac',
    name: 'Autoclaved Aerated Concrete (AAC)',
    category: 'structural',
    conductivity: 0.16,
    density: 550,
    specificHeat: 1000,
    emissivity: 0.90,
    solarAbsorptivity: 0.60,
    description: 'Lightweight aerated concrete block'
  },
  {
    id: 'brick-fired',
    name: 'Brick (Fired Clay)',
    category: 'structural',
    conductivity: 0.72,
    density: 1920,
    specificHeat: 835,
    emissivity: 0.93,
    solarAbsorptivity: 0.70,
    description: 'Standard fired clay brick'
  },
  {
    id: 'rammed-earth',
    name: 'Rammed Earth',
    category: 'structural',
    conductivity: 0.80,
    density: 1900,
    specificHeat: 880,
    emissivity: 0.90,
    solarAbsorptivity: 0.65,
    description: 'Compacted earth wall'
  },
  {
    id: 'wood-softwood',
    name: 'Wood (Softwood / Pine)',
    category: 'structural',
    conductivity: 0.13,
    density: 500,
    specificHeat: 1700,
    emissivity: 0.90,
    solarAbsorptivity: 0.60,
    description: 'Pine, spruce, or fir timber'
  },
  {
    id: 'wood-hardwood',
    name: 'Wood (Hardwood / Oak)',
    category: 'structural',
    conductivity: 0.18,
    density: 700,
    specificHeat: 1600,
    emissivity: 0.90,
    solarAbsorptivity: 0.65,
    description: 'Oak, teak, or similar hardwood'
  },
  {
    id: 'bamboo',
    name: 'Bamboo',
    category: 'structural',
    conductivity: 0.16,
    density: 600,
    specificHeat: 1600,
    emissivity: 0.90,
    solarAbsorptivity: 0.55,
    description: 'Compressed bamboo panels'
  },
  {
    id: 'steel',
    name: 'Steel',
    category: 'structural',
    conductivity: 50.0,
    density: 7800,
    specificHeat: 500,
    emissivity: 0.40,
    solarAbsorptivity: 0.60,
    description: 'Structural steel'
  },

  // === INSULATION ===
  {
    id: 'eps',
    name: 'EPS (Expanded Polystyrene)',
    category: 'insulation',
    conductivity: 0.035,
    density: 25,
    specificHeat: 1400,
    emissivity: 0.60,
    solarAbsorptivity: 0.40,
    description: 'Expanded polystyrene foam board'
  },
  {
    id: 'xps',
    name: 'XPS (Extruded Polystyrene)',
    category: 'insulation',
    conductivity: 0.034,
    density: 35,
    specificHeat: 1400,
    emissivity: 0.60,
    solarAbsorptivity: 0.40,
    description: 'Extruded polystyrene foam board'
  },
  {
    id: 'mineral-wool',
    name: 'Mineral Wool / Rock Wool',
    category: 'insulation',
    conductivity: 0.038,
    density: 80,
    specificHeat: 840,
    emissivity: 0.90,
    solarAbsorptivity: 0.50,
    description: 'Rock wool insulation batts'
  },
  {
    id: 'polyurethane-foam',
    name: 'Polyurethane Foam (PUF)',
    category: 'insulation',
    conductivity: 0.025,
    density: 35,
    specificHeat: 1400,
    emissivity: 0.90,
    solarAbsorptivity: 0.50,
    description: 'Closed-cell polyurethane spray/board'
  },
  {
    id: 'aerogel',
    name: 'Aerogel Insulation Blanket',
    category: 'insulation',
    conductivity: 0.015,
    density: 150,
    specificHeat: 1000,
    emissivity: 0.90,
    solarAbsorptivity: 0.30,
    description: 'Ultra-high-performance aerogel blanket'
  },
  {
    id: 'sheep-wool',
    name: 'Sheep Wool Insulation',
    category: 'insulation',
    conductivity: 0.038,
    density: 25,
    specificHeat: 1720,
    emissivity: 0.90,
    solarAbsorptivity: 0.50,
    description: 'Natural sheep wool insulation, sustainable option for cold regions'
  },
  {
    id: 'straw-bale',
    name: 'Straw Bale',
    category: 'insulation',
    conductivity: 0.065,
    density: 100,
    specificHeat: 1000,
    emissivity: 0.90,
    solarAbsorptivity: 0.55,
    description: 'Compressed straw bales for wall insulation'
  },

  // === FINISH ===
  {
    id: 'cement-plaster',
    name: 'Cement Plaster / Render',
    category: 'finish',
    conductivity: 0.72,
    density: 1760,
    specificHeat: 840,
    emissivity: 0.90,
    solarAbsorptivity: 0.40,
    description: 'Cement-sand plaster finish'
  },
  {
    id: 'lime-plaster',
    name: 'Lime Plaster',
    category: 'finish',
    conductivity: 0.50,
    density: 1300,
    specificHeat: 840,
    emissivity: 0.90,
    solarAbsorptivity: 0.35,
    description: 'Traditional lime plaster, common in Ladakh'
  },
  {
    id: 'mud-plaster',
    name: 'Mud Plaster',
    category: 'finish',
    conductivity: 0.60,
    density: 1500,
    specificHeat: 880,
    emissivity: 0.90,
    solarAbsorptivity: 0.65,
    description: 'Traditional earth/mud plaster coating'
  },
  {
    id: 'gypsum-board',
    name: 'Gypsum Board / Plasterboard',
    category: 'finish',
    conductivity: 0.25,
    density: 900,
    specificHeat: 1000,
    emissivity: 0.90,
    solarAbsorptivity: 0.40,
    description: 'Standard interior gypsum wallboard'
  },

  // === GLAZING ===
  {
    id: 'glass-single',
    name: 'Glass (Single Pane)',
    category: 'glazing',
    conductivity: 1.0,
    density: 2500,
    specificHeat: 840,
    emissivity: 0.84,
    solarAbsorptivity: 0.08,
    description: 'Single pane clear glass, 4-6mm'
  },
  {
    id: 'glass-double',
    name: 'Glass (Double Pane)',
    category: 'glazing',
    conductivity: 0.5, // effective
    density: 2500,
    specificHeat: 840,
    emissivity: 0.84,
    solarAbsorptivity: 0.10,
    description: 'Double glazed unit with air gap'
  },
  {
    id: 'glass-triple',
    name: 'Glass (Triple Pane)',
    category: 'glazing',
    conductivity: 0.33, // effective
    density: 2500,
    specificHeat: 840,
    emissivity: 0.84,
    solarAbsorptivity: 0.12,
    description: 'Triple glazed unit, high performance'
  },
];

/** Get a material by ID */
export function getMaterialById(id: string): Material | undefined {
  return MATERIAL_DATABASE.find(m => m.id === id);
}

/** Get materials by category */
export function getMaterialsByCategory(category: Material['category']): Material[] {
  return MATERIAL_DATABASE.filter(m => m.category === category);
}

/** Create a custom material */
export function createCustomMaterial(props: Omit<Material, 'id' | 'category'>): Material {
  return {
    id: `custom-${Date.now()}`,
    category: 'custom',
    ...props,
  };
}
