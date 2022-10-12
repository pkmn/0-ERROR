import 'source-map-support/register';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {execFileSync} from 'child_process';

import {Generations, Generation, GenerationNum, PokemonSet} from '@pkmn/data';
import {Dex} from '@pkmn/sim';

import {encode, decode} from './sets';

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

export const Sizes = {
  1: 5,
  2: 6,
};

function serialize(gen: Generation, log: Log) {
  if (gen.num >= 3) throw new Error(`Unsupported gen ${gen.num}`); // TODO

  const N = 6 * Sizes[gen.num as keyof typeof Sizes];
  const buf = Buffer.alloc(17 + 2 * N);

  buf.writeBigUint64LE(BigInt(new Date(log.timestamp).getTime()), 0);
  buf.writeUint16LE(log.turns, 8);

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
  buf.writeUInt8(endType, 10);

  if (log[`${winner}rating`]) {
    buf.writeUint16LE(Math.round(log[`${winner}rating`]!.rpr), 11);
    buf.writeUInt8(Math.round(log[`${winner}rating`]!.rprd), 13);
  }
  if (log[`${loser}rating`]) {
    buf.writeUint16LE(Math.round(log[`${loser}rating`]!.rpr), 14);
    buf.writeUInt8(Math.round(log[`${loser}rating`]!.rprd), 16);
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

  data.timestamp = buf.readBigUInt64LE(offset);
  data.turns = buf.readUint16LE(offset + 8);
  data.endType = buf.readUint8(offset + 10);
  let byte = buf.readUint16LE(offset + 11);
  if (byte) data.winner.rating = {rpr: byte, rprd: buf.readUInt8(offset + 13)};
  byte = buf.readUint16LE(offset + 14);
  if (byte) data.loser.rating = {rpr: byte, rprd: buf.readUInt8(offset + 16)};

  data.winner.team = decode(gen, buf, offset + 17);
  data.loser.team = decode(gen, buf, offset + 17 + N);

  return data;
}

if (require.main === module) {
  const sh = (cmd: string, args?: string[]) => execFileSync(cmd, args, {encoding: 'utf8'});

  const usage = (msg?: string): void => {
    if (msg) console.error(msg);
    console.error('Usage: logs <GEN> <LOGS>');
    process.exit(1);
  };

  if (process.argv.length < 3 || +process.argv[2] < 1 || +process.argv > 8) {
    usage(`Invalid gen ${process.argv[2]}`);
  }
  const gens = new Generations(Dex as any);
  const gen = gens.get(+process.argv[2] as GenerationNum);
  const format = `gen${gen.num}ou`;

  if (process.argv.length < 4 || !fs.lstatSync(process.argv[3]).isDirectory()) {
    usage(`Invalid logs directory ${process.argv[3]}`);
  }
  const root = process.argv[3];

  let tmp;
  try {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pkmn'));
    const archives = path.join(tmp, 'archives');
    const logs = path.join(tmp, 'logs');

    fs.mkdirSync(archives);
    fs.mkdirSync(logs);

    for (const month of fs.readdirSync(root)) {
      sh('tar', [
        'xf', path.join(root, month), '--strip-components=1', '-C', archives, `${format}/*.7z`,
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
