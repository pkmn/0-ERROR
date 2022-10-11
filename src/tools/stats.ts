import 'source-map-support/register';

import * as fs from 'fs';
import * as path from 'path';

import {Generations, GenerationNum} from '@pkmn/data';
import {Dex} from '@pkmn/sim';

import {Sizes, deserialize} from './logs';


// TODO: problem - how to know how many moves/items are relevant for most pokemon? = need to do
// pass at some point to figure out where diminishing returns
// NB: always weighted!
// interface Pokemon {
//   lead: number; // = u16
//   usage: number; // = u16
//   items: [number, number][]; // [NumItems = 5][name, weight] => assoc array
//   moves: [number, number][]; // [NumMoves = 10 for gen 1][move, weight] => assoc array
// }

// [151]Pokemon = pokemon
// [151][151]u16 = teammates (Species | Species)
// [165][165]u16 = Move | Move

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

    for (let i = 0; i < db.length; i += row) {
      const data = deserialize(gen, db, i);
      // TODO
    }
  }
}
