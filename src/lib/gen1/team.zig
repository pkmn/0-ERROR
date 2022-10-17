const pkmn = @import("pkmn");

const Species = pkmn.gen1.Species;
const Move = pkmn.gen1.Move;

const TEAMS = @embedFile("../data/teams.db");

const PokemonSet = struct {
  species: Species,
  moves: [4]Move,
};

const Team = [6]PokemonSet;
