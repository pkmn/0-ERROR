import 'source-map-support/register';

import * as fs from 'fs';
import * as path from 'path';

import {Generations, GenerationNum} from '@pkmn/data';
import {Lookup} from '@pkmn/engine';
import {Dex} from '@pkmn/sim';

import {Sizes, deserialize} from './logs';

interface Pokemon {
  lead: number;
  usage: number;
  moves: {[num: number]: number};
  items: {[num: number]: number};
  abilities: {[num: number]: number};
}

function weighting(rating: number, deviation: number, cutoff: number) {
  if (deviation > 100 && cutoff > 1500) return 0;
  return (erf((rating - cutoff) / deviation / Math.sqrt(2.0)) + 1.0) / 2.0;
}

function erf(x: number) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);

  // A&S formula 7.1.26
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

if (require.main === module) {
  const usage = (msg?: string): void => {
    if (msg) console.error(msg);
    console.error('Usage: stats <GEN> <LOGS?>');
    process.exit(1);
  };

  if (process.argv.length < 3 || +process.argv[2] < 1 || +process.argv > 8) {
    usage(`Invalid gen ${process.argv[2]}`);
  }
  const gens = new Generations(Dex as any);
  const gen = gens.get(+process.argv[2] as GenerationNum);
  if (gen.num >= 3) usage(`Unsupported gen ${gen.num}`); // TODO

  const SIZES = {
    Species: Array.from(gen.species).length,
    Moves: Array.from(gen.moves).length,
    Items: gen.num < 2 ? 0 : Array.from(gen.items).length,
    Abilities: gen.num < 3 ? 0 : Array.from(gen.abilities).length,
  };

  if (process.argv.length === 3) {
    const db = fs.readFileSync(
      path.resolve(__dirname, '..', '..', 'src', 'lib', `gen${gen.num}`, 'data', 'stats.db')
    );
    // if (db.length !== 0) {
    //   usage(`Corrupted stats.db of size ${db.length} (${N})`);
    // }

    // for (let i = 0; i < db.length; i += N) {
    //   console.log(display(gen, decode(gen, db, i)));
    // }
  } else {
    if (process.argv.length < 4 || !fs.existsSync(process.argv[3])) {
      usage(`Invalid logs.db ${process.argv[3]}`);
    }

    const db = fs.readFileSync(process.argv[3]);
    const N = 6 * Sizes[gen.num as keyof typeof Sizes];
    const row = 17 + 2 * N;
    if (db.length % row !== 0) {
      usage(`Corrupted logs.db of size ${db.length} (${row})`);
    }

    const pokemon = new Array(SIZES.Species);
    const teammates = new Array(SIZES.Species).fill(new Array(SIZES.Species));

    // Bigrams
    const move_move =
      new Array(SIZES.Moves).fill(new Array(SIZES.Moves));
    // const move_item =
    //   gen.num >= 3 ? new Array(SIZES.Items).fill(new Array(SIZES.Moves)) : [];
    // const move_ability =
    //   gen.num >= 3 ? new Array(SIZES.Abilities).fill(new Array(SIZES.Moves)) : [];
    // const item_ability =
    //   gen.num >= 3 ? new Array(SIZES.Abilities).fill(new Array(SIZES.Items)) : [];

    for (let i = 0; i < db.length; i += row) {
      const data = deserialize(gen, db, i);
      // TODO
    }
  }
}

