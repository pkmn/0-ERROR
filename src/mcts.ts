import {State} from './state';

export interface Random {
  next(): number;
  sample<T>(items: readonly T[]): T;
}

export interface MCTSParams {
  timeout: number;
  workers: number;
  reseed: boolean;
  uct: {
    c: number;
    // temperature: (t: number) => number;
  }
  // gamma: number; // reward discount factor
  // Dirichlet exploration noise
  // noise: {
  //   e: number; // ϵ, 0.25
  //   a: number; // α, should = 10 / n (where n = maximum number of branches)
  // }
}

const DEFAULT: MCTSParams = {
  timeout: 30,
  workers: 0,
  reseed: false,
  uct: {c: Math.sqrt(2)},
};

export class MCTS {
  readonly root: MCTSNode;
  readonly random: Random;
  readonly params: MCTSParams;

  constructor(state: State, random: Random, params: MCTSParams = DEFAULT) {
    this.root = new MCTSNode(null, null, state, state.actions);
    this.random = random;
    this.params = params;
  }

  // TODO multi root
  search() {
    let draws = 0
    let simulations = 0

    const end = Date.now() + this.params.timeout * 1000;
    while (Date.now() < end) {
      let node = this.select();
      let winner = node.state.winner;
      if (node.children.size && winner === null) {
        node = this.expand(node);
        winner = this.simulate(node);
      }
      this.backpropagate(node, winner!)

      if (winner === 0) draws++
      simulations++
    }

    return {runtime: this.params.timeout, simulations, draws};
  }

  // TODO with root parallel MCTS this needs to do a merge!
  /** Determines the best move given the available statistics. */
  best() {
    if (!this.root.isFullyExpanded()) throw new Error('Not enough information');
    let best: string;
    let max = -Infinity;
    for (const action of this.root.children.keys()) {
      const child = this.root.child(action);
      if (child.visits > max) {
        max = child.visits;
        best = action;
      }
    }
    return best!;
  }

  /** Selects child nodes until a leaf node is reached using the UCB1 formula. */
  select() {
    let node = this.root;
    while (!node.isFullyExpanded() && node.children.size) {
      let best: string;
      let max = -Infinity;
      for (const action of node.children.keys()) {
        const score = MCTS.UCB1(node.child(action), this.params.uct.c);
        if (score > max) {
          max = score;
          best = action;
        }
      }
      node = node.child(best!);
    }
    return node;
  }

  /** Expand a random unexpanded child of `node`. */
  expand(node: MCTSNode) {
    const action = this.random.sample(node.unexpanded());
    const state = node.state.next(action, newSeed(this.random, this.params.reseed));
    return node.expand(action, state, state.actions);
  }

  /** Play the state until a terminal state is reached from `node` and return the winner. */
  simulate(node: MCTSNode) {
    return node.state.simulate(this.random);
  }

  /** Propagate the number of visits and wins back to the `node`'s ancestors. */
  backpropagate(node: MCTSNode | null, winner: -1 | 0 | 1) {
    while (node !== null) {
      node.visits++;
      if (node.state.player === -winner) {
        node.wins++;
      }
      node = node.parent;
    }
  }

  static UCB1(node: MCTSNode, c = Math.sqrt(2)) {
    return (node.wins / node.n) + c * Math.sqrt(Math.log(node.parent!.n) / node.n);
  }
}

class MCTSNode {
  readonly last: string | null;
  readonly state: State;

  readonly parent: MCTSNode | null;
  readonly children: Map<string, MCTSNode | null>;

  visits: number;
  wins: number;

  constructor(parent: MCTSNode | null, last: string | null, state: State, actions: string[]) {
    this.last = last;
    this.state = state;

    this.parent = parent;
    this.children = new Map();
    for (const action of actions) {
      this.children.set(action, null);
    }

    this.visits = 0;
    this.wins = 0;
  }

  // get q() {
  //   return this.wins / (1 + this.visits);
  // }

  get n() {
    return this.visits;
  }

  child(action: string) {
    const child = this.children.get(action);
    if (child === undefined) throw new Error('Invalid play');
    if (child === null) throw new Error(`Child '${action}' is not expanded`);
    return child;
  }

  expand(action: string, state: State, actions: string[]) {
    if (!this.children.has(action)) throw new Error('Invalid play');
    const child = new MCTSNode(this, action, state, actions);
    this.children.set(action, child);
    return child;
  }

  unexpanded() {
    const actions = [];
    for (const [action, child] of this.children.entries()) {
      if (!child) actions.push(action);
    }
    return actions;
  }

  isFullyExpanded() {
    for (const child of this.children.values()) {
      if (!child) return false;
    }
    return true;
  }
}

function newSeed(random: Random, reseed?: boolean) {
  if (!reseed) return undefined;
  return [
    Math.floor(random.next() * 0x10000),
    Math.floor(random.next() * 0x10000),
    Math.floor(random.next() * 0x10000),
    Math.floor(random.next() * 0x10000),
  ] as [number, number, number, number];
}
