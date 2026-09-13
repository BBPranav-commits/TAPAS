import { SimulationInput, executeSimulation, SimulationSummary } from '@/lib/simulation/runner';
import { MaterialLayer, Opening, PCMConfig } from '@/lib/physics/types';
import { ShelterShape, SHELTER_SHAPES } from '@/lib/geometry/calculator';
import { MATERIAL_DATABASE } from '@/lib/materials/database';
import { PCM_DATABASE } from '@/lib/materials/pcm-database';

export interface OptimizationBounds {
  lengthMin: number; lengthMax: number;
  widthMin: number; widthMax: number;
  heightMin: number; heightMax: number;
  shapes: ShelterShape[];
  azimuthMin: number; azimuthMax: number;
  insulationThicknessMin: number; insulationThicknessMax: number;
  windowAreaMin: number; windowAreaMax: number;
  doorAreaMin: number; doorAreaMax: number;
  pcmMassMin: number; pcmMassMax: number;
}

export interface OptimizationWeights {
  comfortWeight: number;  // 0-1, maximize comfort hours
  heatLossWeight: number; // 0-1, minimize heat loss
  heatingWeight: number;  // 0-1, minimize heating energy
  solarWeight: number;    // 0-1, maximize solar gain
}

export interface OptimizationConfig {
  populationSize: number;
  generations: number;
  crossoverRate: number;
  mutationRate: number;
  elitismCount: number;
  bounds: OptimizationBounds;
  weights: OptimizationWeights;
}

// Chromosome: numeric array encoding design parameters
interface Chromosome {
  genes: number[];
  fitness: number;
}

// Gene indices
const G_LENGTH = 0;
const G_WIDTH = 1;
const G_HEIGHT = 2;
const G_SHAPE = 3;
const G_AZIMUTH = 4;
const G_WALL_MATERIAL = 5;
const G_WALL_INSULATION = 6;
const G_WALL_INS_THICKNESS = 7;
const G_ROOF_MATERIAL = 8;
const G_ROOF_INSULATION = 9;
const G_ROOF_INS_THICKNESS = 10;
const G_FLOOR_MATERIAL = 11;
const G_FLOOR_INSULATION = 12;
const G_FLOOR_INS_THICKNESS = 13;
const G_WINDOW_AREA = 14;
const G_DOOR_AREA = 15;
const G_PCM_TYPE = 16;
const G_PCM_MASS = 17;
const GENE_COUNT = 18;

const structuralMaterials = MATERIAL_DATABASE.filter(m => m.category === 'structural');
const insulationMaterials = MATERIAL_DATABASE.filter(m => m.category === 'insulation');

export interface OptimizationResult {
  bestDesign: SimulationInput;
  bestSummary: SimulationSummary;
  baselineSummary: SimulationSummary;
  convergence: { generation: number; bestFitness: number; avgFitness: number }[];
  improvement: {
    comfortHoursChange: number;
    heatingEnergyChange: number;
    heatingReductionPercent: number;
    heatLossChange: number;
  };
}

export const DEFAULT_BOUNDS: OptimizationBounds = {
  lengthMin: 3, lengthMax: 15,
  widthMin: 3, widthMax: 12,
  heightMin: 2.4, heightMax: 5,
  shapes: ['box', 'dome', 'hemisphere', 'a-frame'],
  azimuthMin: 0, azimuthMax: 360,
  insulationThicknessMin: 0.02, insulationThicknessMax: 0.3,
  windowAreaMin: 0.5, windowAreaMax: 8,
  doorAreaMin: 1.5, doorAreaMax: 4,
  pcmMassMin: 0, pcmMassMax: 200,
};

export const DEFAULT_WEIGHTS: OptimizationWeights = {
  comfortWeight: 0.35,
  heatLossWeight: 0.25,
  heatingWeight: 0.30,
  solarWeight: 0.10,
};

export const DEFAULT_CONFIG: OptimizationConfig = {
  populationSize: 40,
  generations: 60,
  crossoverRate: 0.8,
  mutationRate: 0.15,
  elitismCount: 4,
  bounds: DEFAULT_BOUNDS,
  weights: DEFAULT_WEIGHTS,
};

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomInRange(min, max + 1));
}

function createRandomChromosome(bounds: OptimizationBounds): Chromosome {
  const genes = new Array(GENE_COUNT);
  genes[G_LENGTH] = randomInRange(bounds.lengthMin, bounds.lengthMax);
  genes[G_WIDTH] = randomInRange(bounds.widthMin, bounds.widthMax);
  genes[G_HEIGHT] = randomInRange(bounds.heightMin, bounds.heightMax);
  genes[G_SHAPE] = randomInt(0, bounds.shapes.length - 1);
  genes[G_AZIMUTH] = randomInRange(bounds.azimuthMin, bounds.azimuthMax);
  genes[G_WALL_MATERIAL] = randomInt(0, structuralMaterials.length - 1);
  genes[G_WALL_INSULATION] = randomInt(0, insulationMaterials.length - 1);
  genes[G_WALL_INS_THICKNESS] = randomInRange(bounds.insulationThicknessMin, bounds.insulationThicknessMax);
  genes[G_ROOF_MATERIAL] = randomInt(0, structuralMaterials.length - 1);
  genes[G_ROOF_INSULATION] = randomInt(0, insulationMaterials.length - 1);
  genes[G_ROOF_INS_THICKNESS] = randomInRange(bounds.insulationThicknessMin, bounds.insulationThicknessMax);
  genes[G_FLOOR_MATERIAL] = randomInt(0, structuralMaterials.length - 1);
  genes[G_FLOOR_INSULATION] = randomInt(0, insulationMaterials.length - 1);
  genes[G_FLOOR_INS_THICKNESS] = randomInRange(bounds.insulationThicknessMin, bounds.insulationThicknessMax);
  genes[G_WINDOW_AREA] = randomInRange(bounds.windowAreaMin, bounds.windowAreaMax);
  genes[G_DOOR_AREA] = randomInRange(bounds.doorAreaMin, bounds.doorAreaMax);
  genes[G_PCM_TYPE] = randomInt(0, PCM_DATABASE.length - 1);
  genes[G_PCM_MASS] = randomInRange(bounds.pcmMassMin, bounds.pcmMassMax);
  return { genes, fitness: 0 };
}

function chromosomeToInput(genes: number[], baseInput: SimulationInput, bounds: OptimizationBounds): SimulationInput {
  const shapeIdx = Math.min(Math.floor(genes[G_SHAPE]), bounds.shapes.length - 1);
  const shape = bounds.shapes[shapeIdx];

  const wallMatIdx = Math.min(Math.floor(genes[G_WALL_MATERIAL]), structuralMaterials.length - 1);
  const wallInsIdx = Math.min(Math.floor(genes[G_WALL_INSULATION]), insulationMaterials.length - 1);
  const roofMatIdx = Math.min(Math.floor(genes[G_ROOF_MATERIAL]), structuralMaterials.length - 1);
  const roofInsIdx = Math.min(Math.floor(genes[G_ROOF_INSULATION]), insulationMaterials.length - 1);
  const floorMatIdx = Math.min(Math.floor(genes[G_FLOOR_MATERIAL]), structuralMaterials.length - 1);
  const floorInsIdx = Math.min(Math.floor(genes[G_FLOOR_INSULATION]), insulationMaterials.length - 1);

  const makeLayers = (mat: typeof structuralMaterials[0], ins: typeof insulationMaterials[0], insThickness: number): MaterialLayer[] => [
    {
      name: mat.name,
      thickness: 0.2, // 200mm structural
      conductivity: mat.conductivity,
      density: mat.density,
      specificHeat: mat.specificHeat,
      emissivity: mat.emissivity,
      solarAbsorptivity: mat.solarAbsorptivity,
    },
    {
      name: ins.name,
      thickness: Math.max(0.02, insThickness),
      conductivity: ins.conductivity,
      density: ins.density,
      specificHeat: ins.specificHeat,
      emissivity: ins.emissivity,
      solarAbsorptivity: ins.solarAbsorptivity,
    },
  ];

  const pcmIdx = Math.min(Math.floor(genes[G_PCM_TYPE]), PCM_DATABASE.length - 1);
  const pcmMat = PCM_DATABASE[pcmIdx];
  const pcmMass = genes[G_PCM_MASS];

  let pcmConfig: PCMConfig | undefined;
  if (pcmMass > 5) { // Only use PCM if mass > 5 kg
    pcmConfig = {
      material: pcmMat.name,
      mass: pcmMass,
      meltingPoint: pcmMat.meltingPoint,
      transitionRange: pcmMat.transitionRange,
      latentHeat: pcmMat.latentHeat * 1000, // kJ/kg -> J/kg
      cpSolid: pcmMat.cpSolid,
      cpLiquid: pcmMat.cpLiquid,
      kSolid: pcmMat.kSolid,
      kLiquid: pcmMat.kLiquid,
      density: pcmMat.density,
    };
  }

  const windowArea = genes[G_WINDOW_AREA];
  const doorArea = genes[G_DOOR_AREA];

  // Create openings - south-facing window for cold regions
  const openings: Opening[] = [];
  if (windowArea > 0.1) {
    openings.push({
      type: 'window',
      area: windowArea,
      orientation: genes[G_AZIMUTH], // window faces same direction as shelter front
      uValue: 2.8, // double glazed
      shgc: 0.6,
      airLeakage: 0.0003 * windowArea,
    });
  }
  if (doorArea > 0.1) {
    openings.push({
      type: 'door',
      area: doorArea,
      orientation: genes[G_AZIMUTH],
      uValue: 3.0,
      shgc: 0.1,
      airLeakage: 0.001 * doorArea,
    });
  }

  return {
    ...baseInput,
    shape,
    length: genes[G_LENGTH],
    width: genes[G_WIDTH],
    height: genes[G_HEIGHT],
    azimuth: genes[G_AZIMUTH] % 360,
    wallLayers: makeLayers(structuralMaterials[wallMatIdx], insulationMaterials[wallInsIdx], genes[G_WALL_INS_THICKNESS]),
    roofLayers: makeLayers(structuralMaterials[roofMatIdx], insulationMaterials[roofInsIdx], genes[G_ROOF_INS_THICKNESS]),
    floorLayers: makeLayers(structuralMaterials[floorMatIdx], insulationMaterials[floorInsIdx], genes[G_FLOOR_INS_THICKNESS]),
    openings,
    pcmConfig,
  };
}

function evaluateFitness(
  genes: number[], baseInput: SimulationInput, 
  config: OptimizationConfig, maxHeatLoss: number, maxHeating: number, maxSolar: number, totalHours: number
): { fitness: number; summary: SimulationSummary } {
  const input = chromosomeToInput(genes, baseInput, config.bounds);
  const summary = executeSimulation(input);
  const r = summary.result;
  const w = config.weights;

  // Normalize objectives to 0-1
  const comfortScore = totalHours > 0 ? r.comfortableHours / totalHours : 0;
  const heatLossScore = maxHeatLoss > 0 ? 1 - (summary.avgHeatLoss / maxHeatLoss) : 1;
  const heatingScore = maxHeating > 0 ? 1 - (r.totalHeatingEnergy_kWh / maxHeating) : 1;
  const solarScore = maxSolar > 0 ? summary.avgSolarGain / maxSolar : 0;

  const fitness = w.comfortWeight * Math.max(0, comfortScore)
    + w.heatLossWeight * Math.max(0, heatLossScore)
    + w.heatingWeight * Math.max(0, heatingScore)
    + w.solarWeight * Math.max(0, solarScore);

  return { fitness, summary };
}

function crossover(parent1: Chromosome, parent2: Chromosome): [Chromosome, Chromosome] {
  const child1Genes = [...parent1.genes];
  const child2Genes = [...parent2.genes];
  // Two-point crossover
  const point1 = randomInt(0, GENE_COUNT - 2);
  const point2 = randomInt(point1 + 1, GENE_COUNT - 1);
  for (let i = point1; i <= point2; i++) {
    child1Genes[i] = parent2.genes[i];
    child2Genes[i] = parent1.genes[i];
  }
  return [
    { genes: child1Genes, fitness: 0 },
    { genes: child2Genes, fitness: 0 },
  ];
}

function mutate(chromosome: Chromosome, bounds: OptimizationBounds, rate: number): void {
  const g = chromosome.genes;
  if (Math.random() < rate) g[G_LENGTH] = randomInRange(bounds.lengthMin, bounds.lengthMax);
  if (Math.random() < rate) g[G_WIDTH] = randomInRange(bounds.widthMin, bounds.widthMax);
  if (Math.random() < rate) g[G_HEIGHT] = randomInRange(bounds.heightMin, bounds.heightMax);
  if (Math.random() < rate) g[G_SHAPE] = randomInt(0, bounds.shapes.length - 1);
  if (Math.random() < rate) g[G_AZIMUTH] = randomInRange(bounds.azimuthMin, bounds.azimuthMax);
  if (Math.random() < rate) g[G_WALL_MATERIAL] = randomInt(0, structuralMaterials.length - 1);
  if (Math.random() < rate) g[G_WALL_INSULATION] = randomInt(0, insulationMaterials.length - 1);
  if (Math.random() < rate) g[G_WALL_INS_THICKNESS] = randomInRange(bounds.insulationThicknessMin, bounds.insulationThicknessMax);
  if (Math.random() < rate) g[G_ROOF_MATERIAL] = randomInt(0, structuralMaterials.length - 1);
  if (Math.random() < rate) g[G_ROOF_INSULATION] = randomInt(0, insulationMaterials.length - 1);
  if (Math.random() < rate) g[G_ROOF_INS_THICKNESS] = randomInRange(bounds.insulationThicknessMin, bounds.insulationThicknessMax);
  if (Math.random() < rate) g[G_FLOOR_MATERIAL] = randomInt(0, structuralMaterials.length - 1);
  if (Math.random() < rate) g[G_FLOOR_INSULATION] = randomInt(0, insulationMaterials.length - 1);
  if (Math.random() < rate) g[G_FLOOR_INS_THICKNESS] = randomInRange(bounds.insulationThicknessMin, bounds.insulationThicknessMax);
  if (Math.random() < rate) g[G_WINDOW_AREA] = randomInRange(bounds.windowAreaMin, bounds.windowAreaMax);
  if (Math.random() < rate) g[G_DOOR_AREA] = randomInRange(bounds.doorAreaMin, bounds.doorAreaMax);
  if (Math.random() < rate) g[G_PCM_TYPE] = randomInt(0, PCM_DATABASE.length - 1);
  if (Math.random() < rate) g[G_PCM_MASS] = randomInRange(bounds.pcmMassMin, bounds.pcmMassMax);
}

function tournamentSelect(population: Chromosome[], tournamentSize: number = 3): Chromosome {
  let best = population[randomInt(0, population.length - 1)];
  for (let i = 1; i < tournamentSize; i++) {
    const contender = population[randomInt(0, population.length - 1)];
    if (contender.fitness > best.fitness) best = contender;
  }
  return best;
}

export function runOptimization(
  baselineInput: SimulationInput,
  config: OptimizationConfig = DEFAULT_CONFIG,
  onProgress?: (gen: number, bestFitness: number, totalGens: number) => void
): OptimizationResult {
  // Run baseline
  const baselineSummary = executeSimulation(baselineInput);
  const totalHours = baselineSummary.totalSimulationHours;
  
  // Reference values for normalization (use 2x baseline as rough max)
  const maxHeatLoss = Math.max(baselineSummary.avgHeatLoss * 3, 1000);
  const maxHeating = Math.max(baselineSummary.result.totalHeatingEnergy_kWh * 3, 100);
  const maxSolar = Math.max(baselineSummary.avgSolarGain * 3, 500);

  // Initialize population
  let population: Chromosome[] = [];
  for (let i = 0; i < config.populationSize; i++) {
    population.push(createRandomChromosome(config.bounds));
  }

  const convergence: { generation: number; bestFitness: number; avgFitness: number }[] = [];
  let bestOverall: Chromosome | null = null;
  let bestSummary: SimulationSummary | null = null;

  for (let gen = 0; gen < config.generations; gen++) {
    // Evaluate fitness
    for (const chrom of population) {
      try {
        const { fitness, summary } = evaluateFitness(
          chrom.genes, baselineInput, config, maxHeatLoss, maxHeating, maxSolar, totalHours
        );
        chrom.fitness = fitness;
        if (!bestOverall || fitness > bestOverall.fitness) {
          bestOverall = { ...chrom, genes: [...chrom.genes] };
          bestSummary = summary;
        }
      } catch {
        chrom.fitness = 0; // Invalid design
      }
    }

    // Sort by fitness (descending)
    population.sort((a, b) => b.fitness - a.fitness);

    const avgFitness = population.reduce((s, c) => s + c.fitness, 0) / population.length;
    convergence.push({ generation: gen, bestFitness: population[0].fitness, avgFitness });

    if (onProgress) {
      onProgress(gen, population[0].fitness, config.generations);
    }

    // Create next generation
    const nextPop: Chromosome[] = [];

    // Elitism
    for (let i = 0; i < config.elitismCount && i < population.length; i++) {
      nextPop.push({ genes: [...population[i].genes], fitness: population[i].fitness });
    }

    // Fill rest with crossover + mutation
    while (nextPop.length < config.populationSize) {
      if (Math.random() < config.crossoverRate) {
        const p1 = tournamentSelect(population);
        const p2 = tournamentSelect(population);
        const [c1, c2] = crossover(p1, p2);
        mutate(c1, config.bounds, config.mutationRate);
        mutate(c2, config.bounds, config.mutationRate);
        nextPop.push(c1);
        if (nextPop.length < config.populationSize) nextPop.push(c2);
      } else {
        const parent = tournamentSelect(population);
        const child = { genes: [...parent.genes], fitness: 0 };
        mutate(child, config.bounds, config.mutationRate);
        nextPop.push(child);
      }
    }

    population = nextPop;
  }

  // Final best
  if (!bestOverall || !bestSummary) {
    // Fallback to baseline if optimization failed
    return {
      bestDesign: baselineInput,
      bestSummary: baselineSummary,
      baselineSummary,
      convergence,
      improvement: { comfortHoursChange: 0, heatingEnergyChange: 0, heatingReductionPercent: 0, heatLossChange: 0 },
    };
  }

  const bestInput = chromosomeToInput(bestOverall.genes, baselineInput, config.bounds);

  return {
    bestDesign: bestInput,
    bestSummary,
    baselineSummary,
    convergence,
    improvement: {
      comfortHoursChange: bestSummary.result.comfortableHours - baselineSummary.result.comfortableHours,
      heatingEnergyChange: bestSummary.result.totalHeatingEnergy_kWh - baselineSummary.result.totalHeatingEnergy_kWh,
      heatingReductionPercent: baselineSummary.result.totalHeatingEnergy_kWh > 0
        ? ((baselineSummary.result.totalHeatingEnergy_kWh - bestSummary.result.totalHeatingEnergy_kWh) / baselineSummary.result.totalHeatingEnergy_kWh) * 100
        : 0,
      heatLossChange: bestSummary.avgHeatLoss - baselineSummary.avgHeatLoss,
    },
  };
}
