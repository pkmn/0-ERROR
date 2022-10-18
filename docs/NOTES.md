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

## Pokémon

- **Future Sight AI**
- **aturfah/poke2vec**
  - **Poke2Vec: Vector Embeddings of Pokemon**
- **yuzeh/metagrok**
  - **A Self-Play Policy Optimization Approach to Battling Pokemon**
    - self-play Reinforcement Learning (actor-critic two-headed neural network with > 1B params)
    - reward of 1 for win and -1 for lose, but uses fractional auxiliary rewards to speed up
      training
    - uses Proximal Policy Optimization + Generalized Advantage Estimation
    - ~4M self-play matches over 6 days = $91 on Google Compute Engine
    - 99.5% win rate vs. purely random, 61.2% win rate vs. pmariglia, 1677 Glicko-1 in
      `gen7randombattle` after thousands of battles
    - able to acheive high win rates vs. pmariglia in restricted custom non-random format but
      required retraining on the specific format (approach generalizes, but training doesn't)
    - suggests the use of experimenting with LSTM to better model human memory
- **pmariglia/showdown**
- **davidstone/technical-machine**
  - **Technical Machine**
    - Expectiminimax with depth 3 + transposition tables to avoid reevaluation of identical states
- **Optimal Battle Strategy in Pokemon using Reinforcement Learning**
  - model-free Reinforcement Learning (softmax exploration strategy with Q-Learning)
  - handwritten deterministic Generation I similator
  - epsilon-greedy strategy to begin with (10% chance of choosing random move)
  - discretizes Pokémon into 10 buckets of 10% each to reduce state space
  - only 4 action states? (no switching?)
  - 5000 games training resulted in only 60% win rate vs. random opponent. After changing to
    soft-max and performing 20K training games acheived 70% win rate vs. random in a format
    approximating `gen1challengecup`
- **hsahovic/poke-env**
- **dramamine/leftovers-again**
- **taylorhansen/pokemonshowdown-ai**
- **blue-sky-sea/Pokemon-MCTS-AI-Master**
- **rameshvarun/showdownbot**
  - **Percymon: A Pokemon Showdown Artificial Intelligence**
    - Minimax with depth 2, Alpha-Beta pruning, Move Ordering (eg. super effective before not very
      effective), ~5s to move (though 40s long tail), adjusted Technical Machine weights
    - Generation VI w/ no team building
    - mega-evolves greedily to prune state space as much as possible
    - sequentializes game (player A maximizes, player B minimizes etc)
    - assumes unrevealed Pokémon are non-existent for simplicity, and assumes 7 most common moves
      (pruning to 4 once all are revealed)
    - 1540±31 Glicko-1 in `gen6randombattle` after 134 battles (minor improvement over greedy
      ranking heuristic algorithm)
- **Implementation and Evaluation of Information Set Monte Carlo Tree Search for Pokemon**
  - `gen6battlestadiumsingles` (6 choose 3, level 50, 1 minute turns)
  - uses Pokémon Global Link usage statistics
  - custom simulator, "node class" vs. "simulator class" (actual state, used to determine next
    state), some sort of pruning (?)
  - used UCB for all agents except DMCTS test-agent using EXP3
  - ISMCTS wins only ~25% of the time against "cheating" (omniscient) MCTS test agents, but 57.5% of
    the time against determinized MCTS
