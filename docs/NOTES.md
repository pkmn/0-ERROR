## AlphaGo

- **Playing Atari with Deep Reinforcement Learning**
- **Move Evaluation in Go Using Deep Convolutional Neural Networks**
- **Mastering the game of Go with deep neural networks and tree search**
- **Mastering the game of Go without human knowledge**
- **Training Deep Convolutional Neural Networks to Play Go**
- **Mastering Chess and Shogi by Self-Play with a General Reinforcement Learning Algorithm**
- **Lessons From Implementing AlphaZero**
- **Better computer Go player with neural network and long-term prediction**
- **Exploration exploitation in Go: UCT for Monte-Carlo Go**
- **brilee/MuGo**
- **tensorflow/minigo**
- **pytorch/ELF**
- **leela-zero/leela-zero**
- **LeelaChessZero/lc0**
- **suragnair/alpha-zero-general**
  - **Learning to Play Othello Without Human Knowledge**
  - **A Simple Alpha(Go) Zero Tutorial**

## MCTS

- **A Survey of Monte Carlo Tree Search Methods**
- **Monte-Carlo Tree Search**
- **Monte Carlo Tree Search: a review of recent modifications and applications**
- **Efficient Selectivity and Backup Operators in Monte-Carlo Tree Search**
- **Information Set Monte Carlo Tree Search**
- **Reducing the burden of knowledge: Simulation-based methods in imperfect information games**
  - **Information Set Monte Carlo Tree Search**
- **Multiple Tree for Partially Observable Monte-Carlo Tree Search**
- **Monte-Carlo Tree Search for the Simultaneous Move Game Tron**
- **Monte Carlo Tree Search for Simultaneous Move Games: A Case Study in the Game of Tron**
- **Comparison of Different Selection Strategies in Monte-Carlo Tree Search for the Game of Tron**
- **Convergence of Monte Carlo Tree Search in Simultaneous Move Games**
- **MCTS-Minimix Hybrids**
- **Time Management for Monte Carlo Tree Search**
- **Memory-Augmented Monte Carlo Tree Search**
- **Thompson Sampling for Monte Carlo Tree Search and Maxi-min Action Identification**
- **Confidence Bound Algorithms in Game Trees**
- **Understanding the Success of Perfect Information Monte Carlo Sampling in Game Tree Search**
- **MCTS Based on Simple Regret**
- **jbradberry/mcts**
- **int8/monte-carlo-tree-search**
  - **Monte Carlo Tree Search - beginners guide**
- **A Deep Dive into Monte Carlo Tree Search**
- **Analysis of Hannan Consistent Selection for Monte Carlo Tree Search in Simultaneous Move
  Games**

### Parallel

- **Massively Parallel Monte Carlo Tree Search**
- **A New Method for Parallel Monte Carlo Tree Search**
- **Parallel Monte Carlo Tree Search on GPU**
- **Structured Parallel Programming for Monte Carlo Tree Search**
- **A Lock-free Multithreaded Monte-Carlo Tree Search Algorithm**
- **Scalable Distributed Monte-Carlo Tree Search**

## Miscellaneous

- **Comparing UCT versus CFR in Simultaneous Games**
- **Heads-up Limit Hold’em Poker is Solved**
- **A Tutorial on Thomson Sampling**
- **Introduction to Thompson Sampling: the Bernoulli bandit**
- **Finite-time Analysis of the Multiarmed Bandit Problem**
- **Regret Minimization in Games with Incomplete Information (CFR)**
- **The Multi-Armed Bandit Problem and Its Solutions**
- **Regret Minimization in Games with Incomplete Information**
- **Chess Programming Wiki - Time Management**
- **Leela Chess — Test40, Test50, and beyond**
- **Search in games with incomplete information: a case study using Bridge card play**
- **Lower Bounding Klondike Solitaire with Monte-Carlo Planning**
- **Ensemble Monte-Carlo Planning: An Empirical Study**
- **Mastering the Game of Stratego with Model-Free Multiagent Reinforcement Learning**
- **Matrix games with bandit feedback**
- **From Poincaré Recurrence to Convergence in Imperfect Information Games:
  Finding Equilibrium via Regularization**
- **Efficiently Updatable Neural-Network-based Evaluation Functions for Computer
  Shogi**
- **Enumeration of Nash equilibria for two-player games**

## Pokémon

### Agents

| Technique    | Description                                                                          |
| ------------ | ------------------------------------------------------------------------------------ |
| **EMM** | [expectiminimax](https://en.wikipedia.org/wiki/Expectiminimax)             |
| **αβ**       | [alpha-beta pruning](https://en.wikipedia.org/wiki/Alpha%E2%80%93beta_pruning)       |
| **TT**       | [transposition table](https://en.wikipedia.org/wiki/Transposition_table)             |
| **HCE**      | [handcrafted evaluation function](https://en.wikipedia.org/wiki/Evaluation_function) |
| **NE**       | [Nash equilibrium](https://en.wikipedia.org/wiki/Nash_equilibrium)                   |

#### [Technical Machine](https://github.com/davidstone/technical-machine)

| Approach               | Engine | Formats | Rating | Language | License |
| ---------------------- | ------ | ------- | ------ | -------- | ------- |
| EMM + αβ + [TT](https://github.com/davidstone/technical-machine/blob/main/source/tm/evaluate/transposition.cpp) + [HCE](https://github.com/davidstone/technical-machine/blob/main/source/tm/evaluate/evaluate.cpp) | Custom | Gen 4-5 | ???    | C++      | BSL-1.0 |

#### [showdown](https://github.com/pmariglia/showdown)

| Approach                                                                                         | Engine                                                                | Formats | Rating | Language | License |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- | ------- | ------ | -------- | ------- |
| EMM(2)/NE + [HCE](https://github.com/pmariglia/showdown/blob/master/showdown/engine/evaluate.py) | [Custom](https://github.com/pmariglia/showdown/blob/master/ENGINE.md) | Gen 3-8 | ???    | Python   | GPL-3.0 |

#### [Future Sight](https://www.pokemonbattlepredictor.com/FSAI/how-fsai-works)

- engine: custom / [poke-sim](https://github.com/aed3/poke-sim)

#### [Taurus](https://github.com/baskuit/taurus)/[Surskit](https://github.com/baskuit/surskit)


#### [Metagrok](https://github.com/yuzeh/metagrok)



#### [pokemonshowdown-ai](https://github.com/taylorhansen/pokemonshowdown-ai)

#### [Percymon](https://github.com/rameshvarun/showdownbot)

#### [*Hokkaido*](papers/pkmn-ismcts.pdf)

### Tools


#### [Poke2Vec](https://aturfah.github.io/poke2vec/)


#### [poke-env](https://github.com/hsahovic/poke-env)

#### [Leftovers Again](https://github.com/dramamine/leftovers-again)

---


- **Optimal Battle Strategy in Pokemon using Reinforcement Learning**
  - model-free Reinforcement Learning (softmax exploration strategy with Q-Learning)
  - handwritten deterministic Generation I similator
  - epsilon-greedy strategy to begin with (10% chance of choosing random move)
  - discretizes Pokémon into 10 buckets of 10% each to reduce state space
  - only 4 action states? (no switching?)
  - 5000 games training resulted in only 60% win rate vs. random opponent. After changing to
    soft-max and performing 20K training games achieved 70% win rate vs. random in a format
    approximating `gen1challengecup`



Selection (Policy)

Evaluation (Value)
- random playout/rollout ("Pure" MCTS) = always means calling `update` to the end
  - "heavy" rollout (eg. minimize switches), 
- (HCE) handcrafted eval
- deep NN
- shallow NN (NNUE)


- MCTS
  - assumption: using a bandit algorithm for selection
  - assumption: using something other than random playouts