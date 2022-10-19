import {Generation, toID, ID, PokemonSet, TypeName} from '@pkmn/data';
import {Lookup} from '@pkmn/engine';
import {Team} from '@pkmn/sets';

import {Read, Write} from './data';

export function encode(gen: Generation, team: Partial<PokemonSet>[], buf: Buffer, offset = 0) {
  const canonical = Team.canonicalize(team, gen.dex);

  const lookup = Lookup.get(gen);
  switch (gen.num) {
  case 1: {
    for (const set of canonical) {
      Write.u8(buf, lookup.specieByID(set.species as ID), offset++);
      for (let i = 0; i < 4; i++) {
        Write.u8(buf, i < set.moves!.length ? lookup.moveByID(set.moves![i] as ID) : 0, offset++);
      }
    }
    return offset;
  }
  case 2: {
    for (const set of canonical) {
      Write.u8(buf, lookup.specieByID(set.species as ID), offset++);
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

  let byte = 0;
  const lookup = Lookup.get(gen);
  switch (gen.num) {
  case 1: {
    for (let i = offset; i < offset + 6 * 5; i += 5) {
      byte = Read.u8(buf, i);
      if (!byte) return team;
      const set: Partial<PokemonSet> = {};
      set.species = lookup.specieByNum(byte);
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
    for (let i = offset; i < offset + 6 * 7; i += 7) {
      byte = Read.u8(buf, i);
      if (!byte) return team;
      const set: Partial<PokemonSet> = {};
      set.species = lookup.specieByNum(byte);
      byte = Read.u8(buf, i + 1);
      set.item = byte ? lookup.itemByNum(byte) : undefined;
      set.moves = [];
      const type = toID(lookup.typeByNum(Read.u8(buf, i + 6)));
      for (let j = 0; j < 4; j++) {
        byte = Read.u8(buf, i + 2 + j);
        if (!byte) break;
        const move = lookup.moveByNum(byte);
        set.moves.push(move === 'hiddenpower' ? `${move}${type}` : move);
      }
      team.push(set);
    }
    return team;
  }
  default: throw new Error(`Unsupported gen ${gen.num}`);
  }
}
