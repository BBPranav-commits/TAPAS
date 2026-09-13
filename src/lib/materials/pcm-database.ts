import { PCMMaterial } from './types';

/**
 * Built-in PCM (Phase Change Material) library.
 * Sources: Rubitherm datasheets, Zalba et al. (2003), Sharma et al. (2009)
 */
export const PCM_DATABASE: PCMMaterial[] = [
  {
    id: 'rt10',
    name: 'Rubitherm RT10',
    category: 'organic-paraffin',
    meltingPoint: 10,
    transitionRange: 4,
    latentHeat: 150,
    cpSolid: 2000,
    cpLiquid: 2200,
    kSolid: 0.20,
    kLiquid: 0.15,
    density: 880,
    description: 'Low-temp paraffin, suitable for cold-climate floor heating storage'
  },
  {
    id: 'rt18',
    name: 'Rubitherm RT18',
    category: 'organic-paraffin',
    meltingPoint: 18,
    transitionRange: 4,
    latentHeat: 190,
    cpSolid: 2000,
    cpLiquid: 2200,
    kSolid: 0.20,
    kLiquid: 0.15,
    density: 880,
    description: 'Comfort-range paraffin for maintaining 18°C in cold shelters'
  },
  {
    id: 'rt21',
    name: 'Rubitherm RT21',
    category: 'organic-paraffin',
    meltingPoint: 21,
    transitionRange: 4,
    latentHeat: 155,
    cpSolid: 2000,
    cpLiquid: 2200,
    kSolid: 0.20,
    kLiquid: 0.15,
    density: 880,
    description: 'Room-temperature paraffin PCM for comfort range'
  },
  {
    id: 'rt25',
    name: 'Rubitherm RT25HC',
    category: 'organic-paraffin',
    meltingPoint: 25,
    transitionRange: 4,
    latentHeat: 230,
    cpSolid: 2000,
    cpLiquid: 2200,
    kSolid: 0.20,
    kLiquid: 0.15,
    density: 880,
    description: 'High-capacity paraffin for warm-climate thermal regulation'
  },
  {
    id: 'rt28',
    name: 'Rubitherm RT28HC',
    category: 'organic-paraffin',
    meltingPoint: 28,
    transitionRange: 4,
    latentHeat: 245,
    cpSolid: 2000,
    cpLiquid: 2200,
    kSolid: 0.20,
    kLiquid: 0.15,
    density: 880,
    description: 'High-latent-heat paraffin for hot-climate cooling'
  },
  {
    id: 'cacl2-6h2o',
    name: 'CaCl₂·6H₂O (Calcium Chloride Hexahydrate)',
    category: 'inorganic-salt-hydrate',
    meltingPoint: 29,
    transitionRange: 3,
    latentHeat: 190,
    cpSolid: 1400,
    cpLiquid: 2100,
    kSolid: 1.09,
    kLiquid: 0.54,
    density: 1710,
    description: 'Inorganic salt hydrate with high density and thermal conductivity'
  },
  {
    id: 'na2so4-10h2o',
    name: 'Na₂SO₄·10H₂O (Glauber\'s Salt)',
    category: 'inorganic-salt-hydrate',
    meltingPoint: 32,
    transitionRange: 2,
    latentHeat: 254,
    cpSolid: 1900,
    cpLiquid: 2800,
    kSolid: 0.56,
    kLiquid: 0.45,
    density: 1460,
    description: 'Classic salt hydrate PCM, high latent heat, inexpensive'
  },
  {
    id: 'sp21ek',
    name: 'Rubitherm SP21EK',
    category: 'inorganic-salt-hydrate',
    meltingPoint: 21,
    transitionRange: 3,
    latentHeat: 160,
    cpSolid: 2000,
    cpLiquid: 2000,
    kSolid: 0.60,
    kLiquid: 0.60,
    density: 1500,
    description: 'Commercial salt-hydrate PCM for room-temperature storage'
  },
];

/** Get a PCM material by ID */
export function getPCMById(id: string): PCMMaterial | undefined {
  return PCM_DATABASE.find(m => m.id === id);
}

/** Get PCMs suitable for a target temperature range */
export function getPCMsForTempRange(minTemp: number, maxTemp: number): PCMMaterial[] {
  return PCM_DATABASE.filter(m =>
    m.meltingPoint >= minTemp && m.meltingPoint <= maxTemp
  );
}
