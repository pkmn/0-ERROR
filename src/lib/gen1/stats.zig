const pkmn = @import("pkmn");

const Species = pkmn.gen1.Species;

const STATS = @embedFile("../data/stats.db");

// TODO padding/alignment?
const Statistics = extern struct {
  species_lead: [Species.size]u16,
  species_nonlead: [Species.size]u16,
  move_species: [Species.size]u16,
  species_species: [Species.size][Species.size]u16,
};