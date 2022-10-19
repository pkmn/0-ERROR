import {Generation, PokemonSet, toID, ID, HPTypeName, StatsTable} from '@pkmn/data';
import {Lookup} from '@pkmn/engine';

import {Read, Write} from './data';

const HP: {[type in HPTypeName]: {ivs: Partial<StatsTable>; dvs: Partial<StatsTable>}} = {
  Bug: {ivs: {atk: 30, def: 30, spd: 30}, dvs: {atk: 13, def: 13}},
  Dark: {ivs: {}, dvs: {}},
  Dragon: {ivs: {atk: 30}, dvs: {def: 14}},
  Electric: {ivs: {spa: 30}, dvs: {atk: 14}},
  Fighting: {ivs: {def: 30, spa: 30, spd: 30, spe: 30}, dvs: {atk: 12, def: 12}},
  Fire: {ivs: {atk: 30, spa: 30, spe: 30}, dvs: {atk: 14, def: 12}},
  Flying: {ivs: {hp: 30, atk: 30, def: 30, spa: 30, spd: 30}, dvs: {atk: 12, def: 13}},
  Ghost: {ivs: {def: 30, spd: 30}, dvs: {atk: 13, def: 14}},
  Grass: {ivs: {atk: 30, spa: 30}, dvs: {atk: 14, def: 14}},
  Ground: {ivs: {spa: 30, spd: 30}, dvs: {atk: 12}},
  Ice: {ivs: {atk: 30, def: 30}, dvs: {def: 13}},
  Poison: {ivs: {def: 30, spa: 30, spd: 30}, dvs: {atk: 12, def: 14}},
  Psychic: {ivs: {atk: 30, spe: 30}, dvs: {def: 12}},
  Rock: {ivs: {def: 30, spd: 30, spe: 30}, dvs: {atk: 13, def: 12}},
  Steel: {ivs: {spd: 30}, dvs: {atk: 13}},
  Water: {ivs: {atk: 30, def: 30, spa: 30}, dvs: {atk: 14, def: 13}},
};

// NOTE: to properly dedupe you still must compare computed stats
export function canonicalize(gen: Generation, team: Partial<PokemonSet>[]) {
  let lead: Partial<PokemonSet> | undefined = undefined;
  const rest: Array<[ID, Partial<PokemonSet>]> = [];
  for (const set of team) {
    const species = gen.species.get(set.species!)!;
    set.species = species.battleOnly ? toID(species.baseSpecies) : species.id;
    set.name = set.species;

    set.item = gen.num >= 2 && set.item ? toID(set.item) : undefined;
    set.ability =
      gen.num >= 3 ? toID(set.ability ? set.ability : species.abilities[0]) : undefined;
    set.gender = gen.num >= 2 && set.gender !== species.gender ? set.gender : undefined;
    set.level = set.level || 100;

    let maxed = true;
    if (!set.ivs) {
      set.ivs = gen.stats.fill({}, 31);
    } else {
      for (const stat of gen.stats) {
        set.ivs[stat] = set.ivs[stat] ?? 31;
        if (gen.num < 3) set.ivs[stat] = gen.stats.toIV(gen.stats.toDV(set.ivs[stat]));
        if (set.ivs[stat] !== 31) maxed = false;
      }
    }

    const nature = gen.num < 3 ? gen.natures.get(set.nature || 'serious') : undefined;
    set.nature = nature?.id;

    let hpType = set.hpType as HPTypeName | undefined;
    let happiness = '';
    let swordsdance = false;
    const moves = [];
    for (const move of set.moves!) {
      let id = toID(move);
      if (id === 'return' || id === 'frustration') {
        happiness = id;
      } else if (id === 'swordsdance') {
        swordsdance = true;
      } else if (id.startsWith('hiddenpower')) {
        if (id === 'hiddenpower') {
          const type = set.hpType || gen.types.getHiddenPower(set.ivs)!.type;
          id = `${id}${type}` as ID;
        } else {
          hpType = (id.substr(11, 1).toUpperCase() + id.substr(12)) as HPTypeName;
        }
      }
      moves.push(id);
    }
    set.moves = moves.sort((a, b) => a.localeCompare(b));

    const base = gen.species.get(set.species)!.baseStats;
    set.evs = set.evs || {} as any as StatsTable;
    for (const stat of gen.stats) {
      if (gen.num < 3) {
        set.evs[stat] = set.evs[stat] ?? 252;
      } else {
        if (!set.evs[stat]) {
          set.evs[stat] = 0;
        } else {
          const val =
            gen.stats.calc(stat, base[stat], set.ivs[stat], set.evs[stat], set.level, nature);
          if (stat === 'hp') {
            set.evs[stat] = base[stat] === 1 ? 0
              : Math.max(0, (Math.ceil(((val - set.level - 10) * 100) / set.level) -
                2 * base[stat] - set.ivs[stat]) * 4);
          } else {
            const n = !nature ? 1 : nature.plus === stat ? 1.1 : nature.minus === stat ? 0.9 : 1;
            set.evs[stat] = Math.max(0, (Math.ceil(((Math.ceil(val / n) - 5) * 100) / set.level) -
              2 * base[stat] - set.ivs[stat]) * 4);
          }
        }
      }
    }

    if (gen.num === 2 && set.species === 'marowak' && set.item === 'thickclub' &&
      swordsdance && set.level === 100) {
      const iv = Math.floor(set.ivs.atk / 2) * 2;
      while (set.evs.atk > 0 && 2 * 80 + iv + Math.floor(set.evs.atk / 4) + 5 > 255) {
        set.evs.atk -= 4;
      }
    }

    const canBottle = gen.num >= 7 && set.level === 100;
    if (hpType && maxed) {
      const ivs = gen.num === 2 ? HP[hpType].dvs : HP[hpType].ivs;
      for (const stat of gen.stats) {
        if (gen.num === 2) {
          set.ivs[stat] = stat in ivs ? gen.stats.toIV(ivs[stat]!) : 31;
        } else if (!canBottle) {
          set.ivs[stat] = ivs[stat] ?? 31;
        }
      }
      if (gen.num === 2) set.ivs.hp = gen.stats.toIV(gen.stats.getHPDV(set.ivs));
    }

    set.hpType = canBottle && maxed ? hpType : undefined;

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
      for (let i = 0; i < 4; i++) {
        Write.u8(buf, i < set.moves!.length ? lookup.moveByID(set.moves![i] as ID) : 0, offset++);
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
    for (let i = offset; i < offset + 6 * 6; i += 6) {
      byte = Read.u8(buf, i);
      if (!byte) return team;
      const set: Partial<PokemonSet> = {};
      set.species = lookup.specieByNum(byte);
      byte = Read.u8(buf, i + 1);
      set.item = byte ? lookup.itemByNum(byte) : undefined;
      set.moves = [];
      for (let j = 0; j < 4; j++) {
        byte = Read.u8(buf, i + 2 + j);
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
