import {Generation, PokemonSet, toID, ID} from '@pkmn/data';
import {Lookup} from '@pkmn/engine';

export function canonicalize(gen: Generation, team: Partial<PokemonSet>[]) {
  if (gen.num >= 3) throw new Error(`Unsupported gen ${gen.num}`); // TODO

  let lead: Partial<PokemonSet> | undefined = undefined;
  const rest: Array<[ID, Partial<PokemonSet>]> = [];
  for (const set of team) {
    const species = gen.species.get(set.species!)!;
    set.species = species.battleOnly ? toID(species.baseSpecies) : species.id;
    set.name = set.species;

    set.item = gen.num >= 2 && set.item ? toID(set.item) : undefined;
    set.ability = gen.num >= 3 && set.ability ? toID(set.ability) : undefined;
    set.gender = gen.num >= 2 && set.gender !== species.gender ? set.gender : undefined;
    set.level = set.level || 100;

    // TODO: IVs/EVs/Nature/hpType

    let happiness = '';
    const moves = [];
    for (const move of set.moves!) {
      const id = toID(move);
      moves.push(id);
      if (id === 'return' || id === 'frustration') happiness = id;
    }
    set.moves = moves.sort((a, b) => a.localeCompare(b));

    if (happiness === 'return') {
      set.happiness = 255;
    } else if (happiness === 'frustration') {
      set.happiness = 0;
    } else {
      set.happiness = undefined;
    }

    set.shiny = gen.num >= 2 && set.shiny ? set.shiny : undefined;
    set.pokeball = undefined;
    set.dynamaxLevel = gen.num === 8 ? set.dynamaxLevel : undefined;
    set.gigantamax = gen.num === 8 && set.gigantamax ? set.gigantamax : undefined;

    if (lead) {
      rest.push([species.id, set]);
    } else {
      lead = set;
    }
  }

  return [lead!, ...rest.sort((a, b) => a[0].localeCompare(b[0])).map(([, set]) => set)];
}

export function encode(gen: Generation, team: Partial<PokemonSet>[], buf: Buffer, offset = 0) {
  const canonical = canonicalize(gen, team);

  const lookup = Lookup.get(gen);
  switch (gen.num) {
  case 1: {
    for (const set of canonical) {
      buf.writeUInt8(lookup.specieByID(set.species as ID), offset++);
      for (let i = 0; i < 4; i++) {
        buf.writeUint8(i < set.moves!.length ? lookup.moveByID(set.moves![i] as ID) : 0, offset++);
      }
    }
    return offset;
  }
  case 2: {
    for (const set of canonical) {
      buf.writeUInt8(lookup.specieByID(set.species as ID), offset++);
      buf.writeUInt8(set.item ? lookup.itemByID(set.item as ID) : 0, offset++);
      for (let i = 0; i < 4; i++) {
        buf.writeUint8(i < set.moves!.length ? lookup.moveByID(set.moves![i] as ID) : 0, offset++);
      }
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
      byte = buf.readUint8(i);
      if (!byte) return team;
      const set: Partial<PokemonSet> = {};
      set.species = lookup.specieByNum(byte);
      set.moves = [];
      for (let j = 0; j < 4; j++) {
        byte = buf.readUint8(i + 1 + j);
        if (!byte) break;
        set.moves.push(lookup.moveByNum(byte));
      }
      team.push(set);
    }
    return team;
  }
  case 2: {
    for (let i = offset; i < offset + 6 * 6; i += 6) {
      byte = buf.readUint8(i);
      if (!byte) return team;
      const set: Partial<PokemonSet> = {};
      set.species = lookup.specieByNum(byte);
      byte = buf.readUint8(i + 1);
      set.item = byte ? lookup.itemByNum(byte) : undefined;
      set.moves = [];
      for (let j = 0; j < 4; j++) {
        byte = buf.readUint8(i + 2 + j);
        if (!byte) break;
        set.moves.push(lookup.moveByNum(byte));
      }
      team.push(set);
    }
    return team;
  }
  default: throw new Error(`Unsupported gen ${gen.num}`);
  }
}
