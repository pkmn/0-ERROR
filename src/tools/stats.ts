import 'source-map-support/register';

import * as fs from 'fs';
import * as path from 'path';

import minimist from 'minimist';

import {Generations, Generation, GenerationNum, ID} from '@pkmn/data';
import {Lookup} from '@pkmn/engine';
import {Dex} from '@pkmn/sim';

import {Read, Write} from './data';
import {read} from './logs';

interface Statistics {
  total: {lead: number; usage: number};
  species: number[];
  species_lead: number[];
  move_species: {[num: number]: number}[];
  item_species: {[num: number]: number}[];
  // ability_species: {[num: number]: number}[];
  species_species: number[][];
  // move_move: number[][];
  // move_item: number[][];
  // move_ability: number[][];
  // item_ability: number[][];
}

function setup(gen: Generation) {
  return {
    lookup: Lookup.get(gen),
    sizes: {
      Species: Array.from(gen.species).length,
      Moves: Array.from(gen.moves).length,
      Items: gen.num < 2 ? 0 : Array.from(gen.items).length + 1,
      Abilities: gen.num < 3 ? 0 : Array.from(gen.abilities).length,
    },
  };
}

function compute(gen: Generation, options: {logs?: string; cutoff: number}) {
  const {sizes, lookup} = setup(gen);

  const stats: Statistics = {
    total: {lead: 0, usage: 0},
    species: new Array(sizes.Species),
    species_lead: new Array(sizes.Species),
    move_species: new Array(sizes.Species),
    item_species: new Array(sizes.Species),
    species_species: new Array(sizes.Species),
  };

  for (let i = 0; i < sizes.Species; i++) {
    stats.species[i] = 0;
    stats.species_lead[i] = 0;
    stats.move_species[i] = {};
    stats.item_species[i] = {};
    stats.species_species[i] = new Array(sizes.Species);
    for (let j = 0; j < sizes.Species; j++) {
      stats.species_species[i][j] = 0;
    }
  }

  for (const data of read(gen, options, exit)) {
    for (const player of [data.winner, data.loser] as const) {
      if (!player.rating) continue;
      const weight = weighting(player.rating.rpr, player.rating.rprd, options.cutoff);
      if (!weight) continue;

      for (const [index, set] of player.team.entries()) {
        const s = lookup.specieByID(set.species as ID) - 1;

        stats.species[s] += weight;
        stats.total.usage += weight;

        // FIXME: want to track only NON lead statistics for other pokemon! = then divide by 5 and not 6
        if (gen.num >= 5 && index === 0) {
          stats.species_lead[s] += weight;
          stats.total.lead += weight;
        }

        for (let j = 0; j < index; j++) {
          const t = lookup.specieByID(player.team[j].species as ID) - 1;
          stats.species_species[s][t] = (stats.species_species[t][s] += weight);
        }

        for (const move of set.moves!) {
          const m = lookup.moveByID(move as ID);
          stats.move_species[s][m] = (stats.move_species[s][m] || 0) + weight;
        }

        if (gen.num >= 2) {
          const i = set.item ? lookup.itemByID(set.item as ID) : 0;
          stats.item_species[s][i] = (stats.item_species[s][i] || 0) + weight;
        }
      }
    }
  }

  return {sizes, lookup, stats};
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

function exit(msg?: string) {
  if (msg) console.error(msg);
  console.error('Usage: stats <compute|display|sizes|cutoff> ...');
  process.exit(1);
}

if (require.main === module) {
  if (process.argv.length < 3) exit();
  const cmd = process.argv[2];
  const argv = minimist(process.argv.slice(3));

  if (!argv.gen || argv.gen < 1 || argv.gen > 8) {
    exit(argv.gen ? `Invalid gen ${argv.gen as number}` : 'No --gen provided');
  }
  const gens = new Generations(Dex as any);
  const gen = gens.get(argv.gen as GenerationNum);
  if (gen.num >= 3) exit(`Unsupported gen ${gen.num}`); // TODO

  argv.moves = argv.moves || (gen.num === 1 ? 15 : 20);
  argv.items = argv.items || 5;

  switch (cmd) {
  case 'display': {
    // display --gen=1 --report=<pokemon|teammates>
    const {sizes, lookup} = setup(gen);

    const db = fs.readFileSync(
      path.resolve(__dirname, '..', '..', 'src', 'lib', `gen${gen.num}`, 'data', 'stats.db')
    );

    const N = (sizes.Species * 2) + (sizes.Species * 2) +
      (sizes.Species * argv.moves * 3) +
      (gen.num >= 2 ? sizes.Species * argv.items * 3 : 0);
      // (sizes.Species * sizes.Species * 2);
    if (db.length !== N) {
      exit(`Corrupted stats.db of size ${db.length} (${N})`);
    }

    switch (argv.report) {
    case 'pokemon': {
      const pokemon: Array<{
        id: ID;
        usage: number;
        lead?: number;
        moves: {[id: string]: number};
        items?: {[id: string]: number};
      }> = [];

      for (let i = 0; i < sizes.Species; i++) {
        let offset = 0;
        const id = lookup.specieByNum(i + 1);
        const usage = db.readUInt16LE(offset + (i * 2)) / 100;
        offset += sizes.Species * 2;

        let lead: number | undefined = undefined;
        if (gen.num >= 5) {
          db.readUInt16LE(offset + (i * 2)) / 100;
          offset += sizes.Species * 2;
        }

        const moves: {[id: string]: number} = {};
        for (let j = 0; j < argv.moves; j++) {
          const off = offset + (i * argv.moves * 3) + (j * 3);
          const move = db.readUint8(off);
          if (move === 0) break;
          moves[lookup.moveByNum(move)] = db.readUint16LE(off + 1) / 100;
        }
        offset += sizes.Species * argv.moves * 3;

        let items: {[id: string]: number} | undefined = undefined;
        if (gen.num >= 2) {
          items = {};
          for (let j = 0; j < argv.moves; j++) {
            const off = offset + (i * argv.moves * 3) + (j * 3);
            const item = db.readUint8(off);
            const val = db.readUint16LE(off + 1);
            if (item === 0 && val === 0) break;
            moves[lookup.itemByNum(item)] = val / 100;
          }
          offset += sizes.Species * argv.items * 3;
        }

        pokemon.push({id, usage, lead, moves, items});
      }

      for (const p of pokemon.sort((a, b) => b.usage - a.usage)) {
        console.log(JSON.stringify(p, null, 2));
      }

      break;
    }
    case 'teammates': {
      break;
    }
    default: exit(`Unknown report type ${argv.report as string || ''}`);
    }
    break;
  }
  case 'cutoff': {
    // cutoff --gen=1 -logs=logs.db --percentile=0.5
    if (!argv.percentile || argv.percentile < 0 || argv.percentile > 100) {
      exit(argv.percentile
        ? `Invalid percentile ${argv.percentile as number}` : 'No --percentile provided');
    }
    const ratings = [];
    for (const data of read(gen, argv as {logs?: string}, exit)) {
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
      exit(argv.cutoff ? `Invalid cutoff ${argv.cutoff as number}` : 'No --cutoff provided');
    }

    const {stats} = compute(gen, argv as any as {logs?: string; cutoff: number});

    const sizes: {moves: number[]; items: number[]} = {moves: [], items: []};
    for (let i = 0; i < stats.species.length; i++) {
      let move = 0;
      for (const weight of Object.values(stats.move_species[i])) {
        if (round(weight / stats.species[i]) > 100) move++;
      }
      sizes.moves.push(move);

      if (gen.num >= 2) {
        let item = 0;
        for (const weight of Object.values(stats.item_species[i])) {
          if (round(weight / stats.species[i]) > 100) item++;
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
      exit(argv.cutoff ? `Invalid cutoff ${argv.cutoff as number}` : 'No --cutoff provided');
    }

    const {sizes, stats} =
      compute(gen, argv as any as {logs?: string; cutoff: number});

    const BY_VAL = (a: [string, number], b: [string, number]) => b[1] - a[1];

    let buf = Buffer.alloc(sizes.Species * 2);
    for (let i = 0; i < stats.species.length; i++) {
      Write.u16(buf, round((stats.species[i] / stats.total.usage) * 6), i * 2);
    }
    process.stdout.write(buf);

    if (gen.num >= 5) {
      buf = Buffer.alloc(sizes.Species * 2);
      for (let i = 0; i < stats.species_lead.length; i++) {
        Write.u16(buf, round(stats.species_lead[i] / stats.total.lead), i * 2);
      }
      process.stdout.write(buf);
    }

    buf = Buffer.alloc(sizes.Species * argv.moves * 3);
    for (let i = 0; i < stats.move_species.length; i++) {
      const moves = Object.entries(stats.move_species[i]).sort(BY_VAL);
      for (let j = 0; j < Math.min(moves.length, argv.moves); j++) {
        const [key, weight] = moves[j];
        const offset = (i * argv.moves * 3) + (j * 3);
        Write.u8(buf, +key, offset);
        Write.u16(buf, round(weight / stats.species[i]), offset + 1);
      }
    }
    process.stdout.write(buf);

    if (gen.num >= 2) {
      buf = Buffer.alloc(sizes.Species * argv.items * 3);
      for (let i = 0; i < stats.item_species.length; i++) {
        const items = Object.entries(stats.item_species[i]).sort(BY_VAL);
        for (let j = 0; j < Math.min(items.length, argv.items); j++) {
          const [key, weight] = items[j];
          const offset = (i * argv.items * 3) + (j * 3);
          Write.u8(buf, +key, offset);
          Write.u16(buf, round(weight / stats.species[i]), offset + 1);
        }
      }
      process.stdout.write(buf);
    }

    // buf = Buffer.alloc(sizes.Species * sizes.Species * 2);
    // for (let i = 0; i < sizes.Species; i++) {
    //   for (let j = 0; j < sizes.Species; j++) {
    //     const offset = (i * sizes.Species) + (j * 2);
    //     const weight = stats.species[i];
    //     const w = stats.species_species[i][j];
    //     const usage = (stats.species[j] / stats.total.usage) * 6;
    //     Write.u16(buf, round((w - weight * usage) / weight), offset);
    //   }
    // }
    // process.stdout.write(buf);
    break;
  }
  default: exit(`Unknown command: ${cmd}`);
  }
}

