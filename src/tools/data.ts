import {Generation, toID, ID, PokemonSet, TypeName} from '@pkmn/data';
import {Lookup} from '@pkmn/engine';
import {Team} from '@pkmn/sets';

export const LE = (() => {
  const u8 = new Uint8Array(4);
  const u16 = new Uint16Array(u8.buffer);
  return !!((u16[0] = 1) & u16[0]);
})();

export class Read {
  private constructor() {}

  static u8(buf: Buffer, offset: number) {
    return buf.readUInt8(offset);
  }

  static u16(buf: Buffer, offset: number) {
    return LE ? buf.readUInt16LE(offset) : buf.readUInt16BE(offset);
  }

  static u32(buf: Buffer, offset: number) {
    return LE ? buf.readUInt32LE(offset) : buf.readUInt32BE(offset);
  }

  static u64(buf: Buffer, offset: number) {
    return LE ? buf.readBigInt64LE(offset) : buf.readBigInt64BE(offset);
  }
}

export class Write {
  private constructor() {}

  static u8(buf: Buffer, value: number, offset: number) {
    return buf.writeUInt8(offset);
  }

  static u16(buf: Buffer, value: number, offset: number) {
    return LE ? buf.writeUInt16LE(value, offset) : buf.writeUInt16BE(value, offset);
  }

  static u32(buf: Buffer, value: number, offset: number) {
    return LE ? buf.writeUInt32LE(value, offset) : buf.writeUInt32BE(value, offset);
  }

  static u64(buf: Buffer, value: number, offset: number) {
    return LE ? buf.writeBigInt64LE(BigInt(value), offset)
      : buf.writeBigInt64BE(BigInt(value), offset);
  }
}

export const Sizes = {1: 5, 2: 7, 3: 24, 4: 24, 5: 24, 6: 25, 7: 26, 8: 25};

export function encode(gen: Generation, team: Partial<PokemonSet>[], buf: Buffer, offset = 0) {
  const canonical = Team.canonicalize(team, gen.dex);

  const lookup = Lookup.get(gen);
  switch (gen.num) {
  case 1: {
    for (const set of canonical) {
      Write.u8(buf, lookup.speciesByID(set.species as ID), offset++);
      for (let i = 0; i < 4; i++) {
        Write.u8(buf, i < set.moves!.length ? lookup.moveByID(set.moves![i] as ID) : 0, offset++);
      }
    }
    return offset;
  }
  case 2: {
    for (const set of canonical) {
      Write.u8(buf, lookup.speciesByID(set.species as ID), offset++);
      Write.u8(buf, set.item ? lookup.itemByID(set.item as ID) : 0, offset++);
      let type: TypeName = 'Normal';
      for (let i = 0; i < 4; i++) {
        let move = set.moves![i];
        if (set.moves![i].startsWith('hiddenpower')) {
          move = 'hiddenpower';
          type = (move.charAt(11).toUpperCase() + move.slice(12)) as TypeName;
        }
        Write.u8(buf, i < set.moves!.length ? lookup.moveByID(move as ID) : 0, offset++);
      }
      Write.u8(buf, lookup.typeByName(type), offset++);
    }
    return offset;
  }
  default: throw new Error(`Unsupported gen ${gen.num}}`);
  }
}

export function decode(gen: Generation, buf: Buffer, offset = 0) {
  const team: Partial<PokemonSet>[] = [];
  const N = Sizes[gen.num as keyof typeof Sizes];

  let byte = 0;
  const lookup = Lookup.get(gen);
  switch (gen.num) {
  case 1: {
    for (let i = offset; i < offset + 6 * N; i += N) {
      byte = Read.u8(buf, i);
      if (!byte) return team;
      const set: Partial<PokemonSet> = {};
      set.species = lookup.speciesByNum(byte);
      set.moves = [];
      for (let j = 0; j < 4; j++) {
        byte = Read.u8(buf, i + 1 + j);
        if (!byte) break;
        set.moves.push(lookup.moveByNum(byte));
      }
      team.push(set);
    }
    return team;
  }
  case 2: {
    for (let i = offset; i < offset + 6 * N; i += N) {
      byte = Read.u8(buf, i);
      if (!byte) return team;
      const set: Partial<PokemonSet> = {};
      set.species = lookup.speciesByNum(byte);
      byte = Read.u8(buf, i + 1);
      set.item = byte ? lookup.itemByNum(byte) : undefined;
      set.moves = [];
      for (let j = 0; j < 4; j++) {
        byte = Read.u8(buf, i + 2 + j);
        if (!byte) break;
        const move = lookup.moveByNum(byte);
        set.moves.push(move === 'hiddenpower'
          ? `${move}${toID(lookup.typeByNum(Read.u8(buf, i + 6)))}`
          : move);
      }
      team.push(set);
    }
    return team;
  }
  default: throw new Error(`Unsupported gen ${gen.num}`);
  }
}
