import {Battle, PRNG, PRNGSeed} from '@pkmn/sim';
import {Request} from './request';
import {choices} from './choices';
import {Random} from './mcts';

// const RE = /^>p(\d) (\S+) ?/;

export class State {
  battle: Battle;
  cache: {hash?: string} = {};
  player: 1 | -1; // TODO need to support plaing as p2
  action?: string;

  constructor(battle: Battle, choice?: string) {
    this.battle  = battle;
    this.player = choice ? -1 : 1;
    this.action = choice;
  }

  // get hash() {
  //   if (!this.cache.hash) {
  //     const hash = [];
  //     for (const line of this.battle.inputLog) {
  //       const m = RE.exec(line);
  //       if (!m) continue;
  //       const choice = m[2] === 'shift' ? 'X' : m[2].charAt(0).toUpperCase();
  //       hash.push(`${m[1]}${choice}${line.slice(m[0].length)}`);
  //     }
  //     this.cache.hash = hash.join(';') + this.player;
  //   }
  //   return this.cache.hash;
  // }

  get winner(): 1 | 0 | -1 | null {
    if (!this.battle.ended) return null;
    if (!this.battle.winner) return 0;
    return this.battle.sides[0].name === this.battle.winner ? 1 : -1;
  }

  get actions() {
    // TODO when terminal, report []!
    // TODO problem = non terminal but `wait`! -> need to avoid waits
    return choices(this.battle.sides[this.player === 1 ? 0 : 1].activeRequest as Request);
  }


  next(choice: string, seed?: PRNGSeed) {
    // We could apply p1's choice to battle, but this saves a toJSON copy each turn
    if (this.player === 1) return new State(this.battle, choice);
    // No need to restart because we don't care about rewiring send
    const battle = Battle.fromJSON(this.battle.toJSON());
    if (seed) battle.prng = new PRNG(seed);
    battle.choose('p1', this.action!);
    battle.choose('p2', choice);
    return new State(battle);
  }

  simulate(random: Random) {
    // FIXME rollout with choose()
    // const battle = Battle.fromJSON(this.battle.toJSON());
    // while (!battle.ended) {

    // }

    let state: State = this;
    let winner = this.winner;

    while (winner === undefined) {
      const action = random.sample(state.actions);
      state = state.next(action);
      winner = this.winner;
    }

    return winner;
  }
}