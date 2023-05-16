
Game

- "turn"
- stochastic
- simultaneous vs. sequential
- extensive form
- game tree (chance nodes, action nodes)
- complete informaiton
- ways of modelling (game with Chance player)


Engine

- https://github.com/pkmn/engine/blob/main/docs/RESEARCH.md#simulators
- representation / layout
- supported API (Simulate, Transitions, Calculate)
- reversible?
- completeness (which generatons)
- accuracy (might be faster to be less accurate?)
- save states, input log, reversible?

Client

- perspective
- login in (challenges, ladder) = PROTOCOL.md
- parse SIM-PROTOCOL and build up client representation (perceived/observed representation)
 
Inference
- constraint satisfaction
- reverse damage calculator
- usage stats

Search

Evaluation


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