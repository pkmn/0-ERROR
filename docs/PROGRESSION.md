# Progression

TODO

- meta parameters with genetic programming/evoluationary algorithm
- storage = intrusive list, actions in nodes
- algorithm (MCTS vs. Expectiminimax)
  - parallelism
  - selection policy
    - random
    - UCT
    - EXP3
    - NN
  simulation policy
    - random
    - MAST (from tree vs. weighted from X(tree) + Y(sim)?)
    - NN (use for playout vs. weighted vs. skip playout)
  backpropagation policy
    - normal
    - weighted

---

opening (book?)
midgame (ISMCTS vs determinization)
endgame (Nash?/expectiminimax)

---

compare everything with and without perfect info (then mcts = determinization = root parallelsim)


---


Eager matrix = 100 branches
Lazy matrix = pointer/handle to where the first child is but then init all 100 siblings
Intrusive list pointer to sibling
No tree, just hash table (TT)

Store state at each node
Store state at root, store only actions at node (or actions applied by position in the case of decision node)
Reversible functions of state
Store PERCEIVED state with unknowns and usage stats and compute equilibrium based on those stats!

SUCT (sequential, can see opponents move)
Tri matrix (p1, p2, chance)

Levels of "cheating" (information)
Distinction between observed/perceived vs inferred vs heuristically knowm bayesian

Determinize at roots, play whole tree from that determization
Sample at root each iteration of each tree - need to deal with desyncs?

Random simulation policy
Heavy policy guides by HCE
Heavy playout based on learned policy (still simulate, but make choices based on function instead of random)
Skip simulation entirely and just read eval function