import {MoveName, PokemonHPStatus, PokemonIdent, PokemonDetails} from '@pkmn/protocol';
import {StatsTable, SideID, ID, MoveTarget} from '@pkmn/types';

export type Request = MoveRequest | SwitchRequest | TeamRequest | WaitRequest;

export interface MoveRequest {
  side: Request.SideInfo;
  active: Array<Request.ActivePokemon | null>;
  noCancel?: boolean;
}

export interface SwitchRequest {
  side: Request.SideInfo;
  forceSwitch: [true] & boolean[];
  noCancel?: boolean;
}

export interface TeamRequest {
  teamPreview: true;
  side: Request.SideInfo;
  maxTeamSize?: number;
  noCancel?: boolean;
}

export interface WaitRequest {
  wait: true;
  side: undefined;
  noCancel?: boolean;
}

export namespace Request {
  export interface SideInfo {
    name: string;
    id: SideID;
    pokemon: Pokemon[];
  }

  export interface ActivePokemon {
    moves: Array<{
      move: MoveName;
      pp: number;
      maxpp: number;
      target: MoveTarget;
      disabled?: boolean;
    }>;
    maxMoves?: {
      gigantamax?: boolean;
      maxMoves: Array<{
        move: string;
        target: MoveTarget;
        disabled?: boolean;
      }>;
    };
    canZMove?: Array<{
      move: MoveName;
      target: MoveTarget;
    } | null>;
    canDynamax?: boolean;
    canMegaEvo?: boolean;
    canUltraBurst?: boolean;
    trapped?: boolean;
    maybeTrapped?: boolean;
    maybeDisabled?: boolean;
    fainted?: boolean;
  }

  export interface Pokemon {
    active?: boolean;
    details: PokemonDetails;
    ident: PokemonIdent;
    pokeball: ID;
    ability?: ID;
    baseAbility?: ID;
    condition: PokemonHPStatus;
    item: ID;
    moves: ID[];
    stats: Omit<StatsTable, 'hp'>;
  }
}
