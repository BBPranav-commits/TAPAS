/** Material definition for a single layer in a building assembly */
export interface Material {
  id: string;
  name: string;
  category: 'structural' | 'insulation' | 'finish' | 'glazing' | 'custom';
  /** Thermal conductivity [W/(m·K)] */
  conductivity: number;
  /** Density [kg/m³] */
  density: number;
  /** Specific heat capacity [J/(kg·K)] */
  specificHeat: number;
  /** Thermal emissivity [-] (0-1) */
  emissivity: number;
  /** Solar absorptivity [-] (0-1) */
  solarAbsorptivity: number;
  /** Description/notes */
  description?: string;
}

/** Phase Change Material definition */
export interface PCMMaterial {
  id: string;
  name: string;
  category: 'organic-paraffin' | 'inorganic-salt-hydrate' | 'custom';
  /** Melting point [°C] */
  meltingPoint: number;
  /** Transition range (solidus to liquidus) [°C] */
  transitionRange: number;
  /** Latent heat of fusion [kJ/kg] */
  latentHeat: number;
  /** Specific heat in solid phase [J/(kg·K)] */
  cpSolid: number;
  /** Specific heat in liquid phase [J/(kg·K)] */
  cpLiquid: number;
  /** Thermal conductivity in solid phase [W/(m·K)] */
  kSolid: number;
  /** Thermal conductivity in liquid phase [W/(m·K)] */
  kLiquid: number;
  /** Density [kg/m³] */
  density: number;
  description?: string;
}
