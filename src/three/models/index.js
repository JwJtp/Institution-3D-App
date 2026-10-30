import { heart, brain, neuron } from './heartbrain.js';
import { animalCell, plantCell, chloroplast, mitosis } from './cells.js';
import { dna, translation, mendel, fission } from './genetics.js';
import { digestive, lungs, kidney, eye, joints } from './organs.js';
import { flower, embryosac, repro, cycle, embryo } from './reproduction.js';

export const BUILDERS = {
  heart, brain, neuron, animalCell, plantCell, chloroplast, mitosis,
  dnaStructure: () => dna('structure'), dnaReplication: () => dna('replication'), translation, mendel, fission,
  digestive, lungs: () => lungs('organ'), alveoli: () => lungs('alveoli'), kidney, eye, joints,
  flower: () => flower('parts'), pollination: () => flower('pollination'), embryosac, repro, cycle, embryo,
};
