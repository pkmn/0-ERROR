import 'source-map-support/register';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {execFileSync} from 'child_process';

import minimist from 'minimist';

import {Generations, Generation, PokemonSet} from '@pkmn/data';
import {Dex} from '@pkmn/sim';

import {Read, Write} from './data';
import {encode, decode, Sizes} from './sets';

interface Log {
  timestamp: string;
  winner: string;
  endType?: 'normal' | 'forced' | 'forfeit';
  turns: number;
  p1: string;
  p2: string;
  p1team: Array<PokemonSet>;
  p2team: Array<PokemonSet>;
  p1rating: {rpr: number; rprd: number} | null;
  p2rating: {rpr: number; rprd: number} | null;
}

export interface Data {
  timestamp: bigint;
  turns: number;
  endType: number;
  winner: {
    team: Array<Partial<PokemonSet>>;
    rating?: {rpr: number; rprd: number};
  };
  loser: {
    team: Array<Partial<PokemonSet>>;
    rating?: {rpr: number; rprd: number};
  };
}

export const EndType = {
  Normal: 0,
  Tie: 1,
  Forfeit: 2,
  ForcedWin: 3,
  ForcedTie: 4,
} as const;

export function *read(gen: Generation, options: {logs?: string}, usage: (m?: string) => void) {
  if (!options.logs || !fs.existsSync(options.logs)) {
    usage(options.logs ? `Invalid logs.db ${options.logs}` : '--logs not provided');
  }

  const db = fs.readFileSync(options.logs!);
  const N = 6 * Sizes[gen.num as keyof typeof Sizes];
  const row = 17 + 2 * N;
  if (db.length % row !== 0) {
    usage(`Corrupted logs.db of size ${db.length} (${row})`);
  }

  for (let i = 0; i < db.length; i += row) {
    yield deserialize(gen, db, i);
  }
}

function serialize(gen: Generation, log: Log) {
  if (gen.num >= 3) throw new Error(`Unsupported gen ${gen.num}`); // TODO

  const N = 6 * Sizes[gen.num as keyof typeof Sizes];
  const buf = Buffer.alloc(17 + 2 * N);

  Write.u64(buf, new Date(log.timestamp).getTime(), 0);
  Write.u16(buf, log.turns, 8);

  const winner: 'p1' | 'p2' = log.winner === log.p2 ? 'p2' : 'p1';
  const loser: 'p1' | 'p2' = winner === 'p1' ? 'p2' : 'p1';
  let endType: typeof EndType[keyof typeof EndType] = EndType.Normal;
  if (!log.winner || log.winner === 'tie') {
    endType = EndType.Tie;
  }
  if (log.endType === 'forced') {
    endType = endType === EndType.Normal ? EndType.ForcedWin : EndType.ForcedTie;
  } else if (log.endType === 'forfeit') {
    endType = EndType.Forfeit;
  }
  Write.u8(buf, endType, 10);

  if (log[`${winner}rating`]) {
    Write.u16(buf, Math.round(log[`${winner}rating`]!.rpr), 11);
    Write.u8(buf, Math.round(log[`${winner}rating`]!.rprd), 13);
  }
  if (log[`${loser}rating`]) {
    Write.u16(buf, Math.round(log[`${loser}rating`]!.rpr), 14);
    Write.u8(buf, Math.round(log[`${loser}rating`]!.rprd), 16);
  }

  encode(gen, log[`${winner}team`], buf, 17);
  encode(gen, log[`${loser}team`], buf, 17 + N);

  return buf;
}

export function deserialize(gen: Generation, buf: Buffer, offset = 0) {
  if (gen.num >= 3) throw new Error(`Unsupported gen ${gen.num}`); // TODO

  const N = 6 * Sizes[gen.num as keyof typeof Sizes];

  const data: Data = {
    timestamp: 0n,
    turns: 0,
    endType: EndType.Normal,
    winner: {
      team: undefined!,
      rating: undefined,
    },
    loser: {
      team: undefined!,
      rating: undefined,
    },
  };

  data.timestamp = Read.u64(buf, offset);
  data.turns = Read.u16(buf, offset + 8);
  data.endType = Read.u8(buf, offset + 10);
  let byte = Read.u16(buf, offset + 11);
  if (byte) data.winner.rating = {rpr: byte, rprd: Read.u8(buf, offset + 13)};
  byte = Read.u16(buf, offset + 14);
  if (byte) data.loser.rating = {rpr: byte, rprd: Read.u8(buf, offset + 16)};

  data.winner.team = decode(gen, buf, offset + 17);
  data.loser.team = decode(gen, buf, offset + 17 + N);

  return data;
}

if (require.main === module) {
  const sh = (cmd: string, args?: string[]) => execFileSync(cmd, args, {encoding: 'utf8'});

  const usage = (msg?: string): void => {
    if (msg) console.error(msg);
    console.error('Usage: logs --gen=<GEN> --logs=<LOGS>');
    process.exit(1);
  };

  const argv = minimist(process.argv.slice(2));
  if (!argv.gen) usage('No --gen provided');
  const gens = new Generations(Dex as any);
  const gen = gens.get(argv.gen);
  if (gen.num >= 3) usage(`Unsupported gen ${gen.num}`); // TODO
  const format = `gen${gen.num}ou`;

  if (!argv.logs || !fs.lstatSync(argv.logs).isDirectory()) {
    usage(argv.logs ? `Invalid logs directory ${argv.logs as string}` : '--logs not provided');
  }

  let tmp;
  try {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pkmn'));
    const archives = path.join(tmp, 'archives');
    const logs = path.join(tmp, 'logs');

    fs.mkdirSync(archives);
    fs.mkdirSync(logs);

    for (const month of fs.readdirSync(argv.logs)) {
      sh('tar', [
        'xf', path.join(argv.logs, month), '--strip-components=1', '-C', archives, `${format}/*.7z`,
      ]);
      console.error(month);
      for (const archive of fs.readdirSync(archives)) {
        sh('7z', ['x', path.join(archives, archive), `-o${logs}`]);
        fs.unlinkSync(path.join(archives, archive));
        for (const log of fs.readdirSync(logs)) {
          try {
            const json = JSON.parse(fs.readFileSync(path.join(logs, log), {encoding: 'utf8'}));
            process.stdout.write(serialize(gen, json as Log));
          } catch (e) {
            console.error(` - ${path.join(logs, log)}`);
          } finally {
            fs.unlinkSync(path.join(logs, log));
          }
        }
      }
    }
  } finally {
    if (tmp) fs.rmSync(tmp, {recursive: true});
  }
}
