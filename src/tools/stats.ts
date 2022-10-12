import 'source-map-support/register';

import * as fs from 'fs';
import * as path from 'path';

import minimist from 'minimist';

import {Generations, Generation, GenerationNum, ID} from '@pkmn/data';
import {Lookup} from '@pkmn/engine';
import {Dex} from '@pkmn/sim';

import {read} from './logs';

interface Pokemon {
  lead: number;
  usage: number;
  moves: {[num: number]: number};
  items: {[num: number]: number};
  // abilities: {[num: number]: number};
}

function compute(gen: Generation, options: {logs?: string; cutoff: number}) {
  const sizes = {
    Species: Array.from(gen.species).length + 1,
    Moves: Array.from(gen.moves).length + 1,
    Items: gen.num < 2 ? 0 : Array.from(gen.items).length + 1,
    Abilities: gen.num < 3 ? 0 : Array.from(gen.abilities).length + 1,
  };

  const lookup = Lookup.get(gen);
  const total = {lead: 0, usage: 0};
  const species: Pokemon[] = new Array(sizes.Species);
  for (let i = 0; i < species.length; i++) {
    species[i] = {usage: 0, lead: 0, moves: {}, items: {}};
  }

  const species_species =
    new Array(sizes.Species).fill(new Array(sizes.Species).fill(0));
  // const move_move =
  //   new Array(sizes.Moves).fill(new Array(sizes.Moves).fill(0));
  // const move_item =
  //   gen.num >= 3 ? new Array(sizes.Items).fill(new Array(sizes.Moves).fill(0)) : [];
  // const move_ability =
  //   gen.num >= 3 ? new Array(sizes.Abilities).fill(new Array(sizes.Moves).fill(0)) : [];
  // const item_ability =
  //   gen.num >= 3 ? new Array(sizes.Abilities).fill(new Array(sizes.Items).fill(0)) : [];

  for (const data of read(gen, options, usage)) {
    for (const player of [data.winner, data.loser] as const) {
      if (!player.rating) continue;
      const weight = weighting(player.rating.rpr, player.rating.rprd, options.cutoff);
      if (!weight) continue;

      for (const [index, set] of player.team.entries()) {
        const s = lookup.specieByID(set.species as ID);
        const pokemon = species[s];
        pokemon.usage += weight;
        total.usage += weight;
        if (index === 0) {
          pokemon.lead += weight;
          total.lead += weight;
        }

        for (let j = 0; j < index; j++) {
          const t = lookup.specieByID(player.team[j].species as ID);
          species_species[s][t] = (species_species[s][t] || 0) + weight;
        }

        for (const move of set.moves!) {
          const m = lookup.moveByID(move as ID);
          pokemon.moves[m] = (pokemon.moves[m] || 0) + weight;
        }

        if (gen.num >= 2) {
          const i = set.item ? lookup.itemByID(set.item as ID) : 0;
          pokemon.items[i] = (pokemon.items[i] || 0) + weight;
        }
      }
    }
  }

  return {sizes, lookup, total, species, species_species};
}

function weighting(rating: number, deviation: number, cutoff: number) {
  if (deviation > 100 && cutoff > 1500) return 0;
  return (erf((rating - cutoff) / deviation / Math.sqrt(2.0)) + 1.0) / 2.0;
}

function round(v: number, p = 1e4) {
  return Math.round(v * p);
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

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

function ptile(arr: number[], p: number): number {
  if (!arr.length) return 0;
  if (p <= 0) return arr[0];
  if (p >= 1) return arr[arr.length - 1];

  const index = (arr.length - 1) * p;
  const lower = Math.floor(index);
  const upper = lower + 1;
  const weight = index % 1;

  if (upper >= arr.length) return arr[lower];
  return arr[lower] * (1 - weight) + arr[upper] * weight;
}

function usage(msg?: string) {
  if (msg) console.error(msg);
  console.error('Usage: stats <compute|display|sizes|cutoff> ...');
  process.exit(1);
}

if (require.main === module) {
  if (process.argv.length < 3) usage();
  const cmd = process.argv[2];
  const argv = minimist(process.argv.slice(3));

  if (!argv.gen || argv.gen < 1 || argv.gen > 8) {
    usage(argv.gen ? `Invalid gen ${argv.gen as number}` : 'No --gen provided');
  }
  const gens = new Generations(Dex as any);
  const gen = gens.get(argv.gen as GenerationNum);
  if (gen.num >= 3) usage(`Unsupported gen ${gen.num}`); // TODO

  switch (cmd) {
  case 'display': {
    // display --gen=1
    const db = fs.readFileSync(
      path.resolve(__dirname, '..', '..', 'src', 'lib', `gen${gen.num}`, 'data', 'stats.db')
    );
      // if (db.length !== 0) {
      //   usage(`Corrupted stats.db of size ${db.length} (${N})`);
      // }

    // for (let i = 0; i < db.length; i += N) {
    //   console.log(display(gen, decode(gen, db, i)));
    // }
    break;
  }
  case 'cutoff': {
    // cutoff --gen=1 -logs=logs.db --percentile=0.5
    if (!argv.percentile || argv.percentile < 0 || argv.percentile > 100) {
      usage(argv.percentile
        ? `Invalid percentile ${argv.percentile as number}` : 'No --percentile provided');
    }
    const ratings = [];
    for (const data of read(gen, argv as {logs?: string}, usage)) {
      for (const player of [data.winner, data.loser]) {
        if (player.rating) ratings.push(player.rating.rpr);
      }
    }
    console.log(ptile(ratings.sort(), argv.percentile));
    break;
  }
  case 'sizes': {
    // sizes --gen=1 --logs=logs.db --cutoff=1500
    if (!argv.cutoff || argv.cutoff < 1000) {
      usage(argv.cutoff ? `Invalid cutoff ${argv.cutoff as number}` : 'No --cutoff provided');
    }

    const {species} = compute(gen, argv as any as {logs?: string; cutoff: number});

    const sizes: {moves: number[]; items: number[]} = {moves: [], items: []};
    for (let i = 1; i < species.length; i++) {
      const pokemon = species[i];

      let move = 0;
      for (const weight of Object.values(pokemon.moves)) {
        if (round(weight / pokemon.usage) > 100) move++;
      }
      sizes.moves.push(move);

      if (gen.num >= 2) {
        let item = 0;
        for (const weight of Object.values(pokemon.items)) {
          if (round(weight / pokemon.usage) > 100) item++;
        }
        sizes.items.push(item);
      }
    }

    sizes.moves.sort((a, b) => a - b);
    sizes.items.sort((a, b) => a - b);
    for (let i = 0; i < 101; i++) {
      let msg = `${i}%: ${ptile(sizes.moves, i / 100)}`;
      if (gen.num >= 2) msg = `${msg} ${ptile(sizes.items, i / 100)}`;
      console.log(msg);
    }
    break;
  }
  case 'compute': {
    // compute --gen=1 --logs=logs.db --cutoff=1500 --moves=10 --items=5
    if (!argv.cutoff || argv.cutoff < 1000) {
      usage(argv.cutoff ? `Invalid cutoff ${argv.cutoff as number}` : 'No --cutoff provided');
    }

    if (!argv.moves) usage('No --moves provided');
    if (gen.num >= 2 && !argv.item) usage('No --items provided');

    const {lookup, sizes, total, species, species_species} =
      compute(gen, argv as any as {logs?: string; cutoff: number});

    for (let i = 1; i < species.length; i++) {
      const pokemon = species[i];
      const name = lookup.specieByNum(i);
      const use = round((pokemon.usage / total.usage) * 6);
      const lead = round(pokemon.lead / total.lead);
      const moves: {[id: string]: number} = {};
      const items: {[id: string]: number} = {};

      let move = 0;
      for (const [key, weight] of Object.entries(pokemon.moves).sort((a, b) => b[1] - a[1])) {
        moves[lookup.moveByNum(+key)] = round(weight / pokemon.usage);
        if (move++ > argv.move) break;
      }

      if (gen.num >= 2) {
        let item = 0;
        for (const [key, weight] of Object.entries(pokemon.items).sort((a, b) => b[1] - a[1])) {
          items[lookup.moveByNum(+key)] = round(weight / pokemon.usage);
          if (item++ > argv.item) break;
        }
      }

      // console.debug({name, use, lead, moves});
    }
    for (let i = 1; i < sizes.Species; i++) {
      for (let j = 1; j < sizes.Species; j++) {
        const w = species_species[i][j];
        const use = (species[i].usage / total.usage) * 6;
        const foo = round((w - species[i].usage * use) / species[i].usage);
        if (lookup.specieByNum(i) === 'tauros') {
          console.debug(lookup.specieByNum(j), foo);
        }
      }
    }

    break;
  }
  default: usage(`Unknown command: ${cmd}`);
  }
}

