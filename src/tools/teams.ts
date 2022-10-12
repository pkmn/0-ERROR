import 'source-map-support/register';

import * as fs from 'fs';
import * as path from 'path';

import minimist from 'minimist';

import {Generations, GenerationNum, PokemonSet} from '@pkmn/data';
import {Dex} from '@pkmn/sim';

import {Sizes, read} from './logs';
import {encode, decode} from './sets';

const usage = (msg?: string): void => {
  if (msg) console.error(msg);
  console.error('Usage: teams <display|compute> --gen=<GEN> --logs=<LOGS?> --num=<NUM?>');
  process.exit(1);
};

if (process.argv.length < 3) usage();
const cmd = process.argv[2];
const argv = minimist(process.argv.slice(3), {default: {num: 10000}});

if (!argv.gen || argv.gen < 1 || argv.gen > 8) {
  usage(argv.gen ? `Invalid gen ${argv.gen as number}` : 'No --gen provided');
}
const gens = new Generations(Dex as any);
const gen = gens.get(argv.gen as GenerationNum);
if (gen.num >= 3) usage(`Unsupported gen ${gen.num}`); // TODO

const N = 6 * Sizes[gen.num as keyof typeof Sizes];

switch (cmd) {
case 'display': {
  const db = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'src', 'lib', `gen${gen.num}`, 'data', 'teams.db')
  );
  if (db.length % N !== 0) {
    usage(`Corrupted teams.db of size ${db.length} (${N})`);
  }

  for (let i = 0; i < db.length; i += N) {
    console.log(JSON.stringify(decode(gen, db, i)));
  }
  break;
}
case 'compute': {
  const TEAMS: { [team: string]: number } = {};
  for (const data of read(gen, argv as {logs?: string}, usage)) {
    for (const player of [data.winner, data.loser]) {
      const rating = player.rating ? player.rating.rpr - player.rating.rprd : 0;
      const team = gen.num === 1
        ? player.team.map(s => `${s.species!}|${s.moves!.join(',')}`).join(']')
        : player.team.map(s => `${s.species!}|${s.item || ''}|${s.moves!.join(',')}`).join(']');
      TEAMS[team] = Math.max(TEAMS[team] || 0, rating);
    }
  }

  const sorted = Object.entries(TEAMS).sort((a, b) => b[1] - a[1]);
  if (sorted.length < argv.num) {
    console.error(`Requested ${argv.num as number} teams but only ${sorted.length} unique teams`);
    process.exit(1);
  }

  for (let i = 0; i < argv.num; i++) {
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
  break;
}
default: usage(`Unknown command: ${cmd}`);
}
