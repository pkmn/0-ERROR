
---

### Build

- integrated with its own custom compiled version of @pkmn/engine, addons are a superset
- @pkmn/engine ALSO used for testing/training (installed with -Dlog by default) - so BOTH addon.node/wasm and libpkmn.node/wasm can be active at the same time
- not configurable, always release (unless DEBUG_PKMN_ENGINE is set)
- pkmn engine
  -  `internal` exposes wasm/node bindings helpers to avoid duplication
  - `Battle` stores an addon that contains all the methods for it - even better = dynamically bind all of the methods so allow for extension


| Option     | Description                                                                                                                       |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `advance`  | Turn any spurious RNG advances into nops                                                                                          |
| `ebc`      | Only enforce the 1000 turn limit restriction of the [Endless Battle Clause](https://dex.pokemonshowdown.com/articles/battlerules) |
| `internal` | Provides access to internal engine data methods and data structures                                                               |

### Algorithm

1. At the beginning of the battle, prediction possibility tables are initialized and the worker pool
   is initialized with (**TODO** constant) workers
2. Each turn, [`@pkmn/protocol`](https://github.com/pkmn/ps/tree/master/protocol) is used to parse
   the protocol logs
3. The protocol logs and `|request|` information is fed into 0 ERRORs client representation to track
   revealed information
4. The client representation is improved with inferred information from
   [EPOké](https://github.com/EPOke) - prediction state is updated based on this information
5. The true timer is updated based off of `|inactive|` messages
6. If only a single choice is available (i.e. forced actions or passing), that choice is returned
7. [Prediction tables](#team-prediction) and [time budget](#time-management) are passed to workers
   by the manager
8. Workers perform [Information Set Monte Carlo Tree Search](papers/information-set-mcts.pdf),
   populating the [search tree](tree) and performing playouts using the
   [`@pkmn/engine`](https://github.com/pkmn/engine)
9. Every (**TODO** constant) reporting interval the workers share the latest information about their
   search progress which the manager then uses to decide whether to terminate early and updates the
   workers with the latest timer information
10. Once the time budget has been reached the manager tells workers to cease work and makes a choice
    based on the final results of their searches

The preliminary steps in the manager are implemented with TypeScript code as the overhead is
minimized due to these steps only happening once per turn. The core work of traversing the game tree
and executing playouts occurs in Zig as this work executes thousands if not millions of times per
turn.

TODO

```txt
save game trees from chosen action - after making final selection, build tree for next turn from subtrees of trees for this turn - only works with perfect info
complication - state could have changed and options could be different when you actually play out
Sharing state from past runs in worker + start operating on old predictor pools before new predictor pools ready = both provide more data but less accurate data! Game may change substantially from what theory was before - could have a lot of bad data. Need to measure impact
```

---

### Tree

The search tree is stored in a fixed-size (**TODO** constant) buffer in order to avoid dynamic
allocation overhead and space spent on po inters (i.e. instead of requiring 8 byte pointers, indexes
into the buffer need to only be 2-4 bytes). Each time a node in the tree is allocated we reserve
space for handles to all potential children (which for single battles before Generation VI is 11
options - `pass`, `move 0` - `move 4`, `switch 2` - `switch 6`) and use a simple mapping function to
convert from the actual action space (at most 9) to child index. In the event that the max buffer
size is reached and no further nodes can be added the search algorithm will switch from exploring
new node to attempting to exploit existing node (i.e. improve the estimates it has on their reward).

---

### Time Management

TODO timer might not be turned on - need to revert to (**TODO** constant)
(manager calculates how much time to spend based on formula and past expected turns left info)

---

For comparison purposes, 0 ERROR can be configured to run in "omniscient" mode (alternatively
referred to in the literature as "cheating"). There are several "levels" of omniscience:

1. Knowledge of **available choices** (whether the player's active Pokémon is trapped or disabled)
   - this is mostly a development convenience (allows you to be fully aware of the available choices
     without having to deal with uncertainty) and has relatively minor implications to actual
     playing strength or realism
2. Knowledge of an **opponent's HP** (either exact HP or increased accuracy via the `HP Percentage Clause Mod`)
   - helpful for being able to perform reverse damage calculation and more quickly infer the
     opponent's sets, but still minor enough to not have dramatic gameplay implications
3. Full knowledge of the **opponent's team** makeup and configuration
   - this is significantly more artificial as it removes the aspect of information gathering/hiding
     and provides a significant advantage to the player, but as the battle progresses well developed
     [team prediction](#team-prediction) will eventually determine this information anyway
4. Knowledge of the actual **original seed** (which both provides full information on existing
   unknown information such as duration of various statuses and limited knowledge of immediate
   future outcomes)
    - this helps determinize the game tree and removes a large amount of the stochasticity, though
      the amount of unknowns revealed means that game play starts to get too artificial
5. Knowledge of the **opponent's upcoming move** during the current turn
    - this is interesting in that it sequentializes the game (thus removing the complications of
      dealing with simultaneity), but signficantly changes both [time management](#time-management)
      and realism to the point where it is uninteresting to pursue

---

### Team Prediction

**Usage statistics** computed from human players are required in order to accurately predict what an
opponent's team might look like. The [usage statistics produced by
Smogon](https://www.smogon.com/forums/posts/9419389/show/) are acceptable for per-Pokémon
information, but in order to predict sets more realistically 0 ERROR relies on global information
about combination **correlation** in the metagame - naive use of the generally available usage
statistics cannot prevent unrealistic and suboptimal sets (e.g. sets with both Flamethrower and Fire
Blast or multiple Hidden Powers, sets invested in Attack with no physical moves, etc). 0 ERROR
computes its own [stats](https://github.com/pkmn/stats/tree/main/tools#stats) based on an extensive
database of human battle logs and relies on this data to make predictions.

Over the course of battle, 0 ERROR also maintains information about the **possibilities** for each
of their opponent's Pokémon's sets. These possibilities are narrowed down as information is revealed
(through the battle protocol or inferred via [EPOké](https://github.com/pkmn/EPOke), possibly with
the help of reverse damage calculation). These possibilities are stored as "masks" over the data in
the usage statistics (symmetrical tables which only contain the value 0 or 1) - when options are
eliminated the matching indexes are masked off. These tables are then combined with the original
usage statistics to remove impossible options, after which the team prediction/generation process
begins over the remaining options:

1. For each unrevealed team member, update the **species** statistics for each team member (either
   revealed or predicted) based on the correlation deltas and sample from the updated statistics.
2. For each species, select a spread and level (**stats**) - combinations which are not possible
   given the ranges revealed will have already been removed, if all ranges were already masked off
   then [`@pkmn/spreads`](https://github.com/pkmn/EPOke/tree/main/spreads) can be used to fix a
   specific spread.[^1] For Generation I & II this step will be skipped as determining optimal
   spreads is effectively deterministic (maximum stats, outside of edge cases such as Attack DVs for
   Pokémon without physical attacks, Hidden Power, Marowak, etc). in Generation III and onward the
   Pokémon's '**bias**' is computed for the spread based on the two stats with the highest
   investment (eg. `6 HP / 252 Atk / 252 Spe` = `(atk, spe)`).
3. In Generation III and onward, select the **ability** after modifying the options based on the
   correlation delta of the bias. Ability is chosen early on as certain abilities can dramatically
   change the rest of the set of a Pokémon (eg. Zen Mode).
4. In Generation II and onward, select the **item** after modifying the available options based on
   the correlation deltas for both bias and ability.
5. **Moves** are then selected after adjusting for bias, ability, and item where present and then
   based on other revealed or predicted moves in the set.

In order the amortize of cost of generating a predicted team each search iteration, 0 ERROR performs
(**TODO** constant) searches with the same predicted team. Furthermore, team generation performance
is improved through several optimizations:

- [Vose's alias method](https://en.wikipedia.org/wiki/Alias_method) can be used to sample the first
  unknown species for each team (subsequent choices all depend on the first choice and thus their
  weights get dynamically updated, but the first choice base purely off of revealed/inferred battle
  state can be optimized with the prebuilt alias tables)
- the total weights for each option pool can be saved and updated at the same time the weights are
  updated, such that each step only requires at worst $2N$ iterations
- the choices for each option at each step begin sorted which increases the likelihood that sampling
  will be able to arrive at the sampled pick early on in its iteration. Reweighting based on
  Correlation deltas could cause large changes to the original weights which render this to no
  longer be true, though in practice this property should roughly hold or could be fairly easily
  maintained with some local reranking if desirable

The combination of (local, per-Pokémon) usage statistics and possiblity masks with (global,
per-metagame) correlation deltas aims to ensure realistic sets with a minimum amount of space
overhead. The key simplifying assumption is that information about combination correlations is
likely to hold globally across all Pokémon in a metagame (or even across metagames), and that
generating [more detailed local
information](https://www.smogon.com/forums/threads/a-new-kind-of-usage-stats.3694691/#post-9052656)
is unnecessary.

This method of predicting teams generally fails at ensuring **team synergy** beyond simply resulting
in a plausible grouping of species - important teambuilding concerns such as hazards, type balance,
win conditions, etc are not accounted for. Furthermore, teams (and individual sets) generated by
this process are not guaranteed to actually be valid - Pokémon validity is [extremely difficult and
computationally expensive](https://en.wikipedia.org/wiki/NP-hardness). The assumption here is that
any small improvements to realism or correctness with respect to team generation is not worth the
impact on overall system performance and that improving the number of [nodes per
second](https://www.chessprogramming.org/Nodes_per_Second) visited is more important to be able to
take advantage of the [law of large numbers](https://en.wikipedia.org/wiki/Law_of_large_numbers).

[^1]: Technically the spreads may be suboptimal (wasted EVs, poor HP divisibility, etc) and we could
do a pass to optimize them, but this is expected to have relatively minor impact

---

### Parameters

| Constant | Description                                                | Default |
| -------- | ---------------------------------------------------------- | ------- |
| TODO     | The size of the buffer used to store a single search tree  | 0       |
| TODO     | Whether to reveal the actual seed to 0 ERROR               | 0       |
| TODO     | Whether to reveal the opponent's team to 0 ERROR           | 0       |
| TODO     | The number of times to reuse a predicted team for searches | 0       |
| TODO     | The maximum decision duration when the timer is disabled   | 0       |
| TODO     | Maximum number of workers to use (can be 0)                | 0       |
| TODO     | How often the workers report results to the manager        | 0       |
| TODO     | Exploration constant from the UCB algorithm                | 0       |
