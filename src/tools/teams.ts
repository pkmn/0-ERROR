import 'source-map-support/register';

import * as fs from 'fs';
import * as path from 'path';

import {Generations, Generation, GenerationNum, PokemonSet} from '@pkmn/data';
import {Dex} from '@pkmn/sim';

import {Sizes, deserialize} from './logs';
import {encode, decode} from './sets';

const usage = (msg?: string): void => {
  if (msg) console.error(msg);
  console.error('Usage: teams <GEN> <LOGS?> <NUM?>');
  process.exit(1);
};

const display = (gen: Generation, team: Partial<PokemonSet>[]) => gen.num === 1
  ? team.map(s => `${s.species!}|${s.moves!.join(',')}`).join(']')
  : team.map(s => `${s.species!}|${s.item || ''}|${s.moves!.join(',')}`).join(']');

if (process.argv.length < 3 || +process.argv[2] < 1 || +process.argv > 8) {
  usage(`Invalid gen ${process.argv[2]}`);
}
const gens = new Generations(Dex as any);
const gen = gens.get(+process.argv[2] as GenerationNum);
if (gen.num >= 3) usage(`Unsupported gen ${gen.num}`); // TODO

const N = 6 * Sizes[gen.num as keyof typeof Sizes];

if (process.argv.length === 3) {
  const db = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'src', 'lib', `gen${gen.num}`, 'data', 'teams.db')
  );
  if (db.length % N !== 0) {
    usage(`Corrupted teams.db of size ${db.length} (${N})`);
  }

  for (let i = 0; i < db.length; i += N) {
    console.log(display(gen, decode(gen, db, i)));
  }
} else {
  if (process.argv.length < 4 || !fs.existsSync(process.argv[3])) {
    usage(`Invalid logs.db ${process.argv[3]}`);
  }

  const db = fs.readFileSync(process.argv[3]);
  const row = 17 + 2 * N;
  if (db.length % row !== 0) {
    usage(`Corrupted logs.db of size ${db.length} (${row})`);
  }

  let num = 10000;
  if (process.argv.length > 4) {
    if (process.argv.length > 5) usage();
    num = +process.argv[4];
    if (isNaN(num)) usage(`Invalid num ${process.argv[4]}`);
  }

  const TEAMS: {[team: string]: number} = {};
  for (let i = 0; i < db.length; i += row) {
    const data = deserialize(gen, db, i);
    for (const player of [data.winner, data.loser]) {
      const rating = player.rating ? player.rating.rpr - player.rating.rprd : 0;
      const team = display(gen, player.team);
      TEAMS[team] = Math.max(TEAMS[team] || 0, rating);
    }
  }

  const sorted = Object.entries(TEAMS).sort((a, b) => b[1] - a[1]);
  if (sorted.length < num) {
    console.error(`Requested ${num} teams but only ${sorted.length} unique teams`);
    process.exit(1);
  }

  for (let i = 0; i < num; i++) {
    const team: Partial<PokemonSet>[] = [];
    for (const s of sorted[i][0].split(']')) {
      const set: Partial<PokemonSet> = {};
      if (gen.num === 1) {
        const [species, moves] = s.split('|');
        set.species = species;
        set.moves = moves.split(',');
      } else {
        const [species, item, moves] = s.split('|');
        set.species = species;
        set.item = item;
        set.moves = moves.split(',');
      }
      team.push(set);
    }
    const buf = Buffer.alloc(N);
    encode(gen, team, buf);
    process.stdout.write(buf);
  }
}
