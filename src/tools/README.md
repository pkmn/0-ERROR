This folder contains miscellaneous scripts and tools useful for working on 0 ERROR:

- [`logs.ts`](logs.ts): Processes data from
  [compressed](https://github.com/pkmn/stats/blob/main/tools/compress) archives of Pokémon Showdown
  battle logs into a compact binary format for a given generation:

      $ npm run compile && node build/tools/logs <GEN> <LOGS>

  The `LOGS` argument expects a directory containing logs archived in the following format:

      YYYY-MM.tar
      └── format
          └── YYYY-MM-DD.7z
              └── battle-format-N.log.json

  The script then writes a row for each log to standard out in the binary format detailed below:

  | Start | End    | Data                                                    |
  | ----- | ------ | ------------------------------------------------------- |
  | 0     | 8      | Number of milliseconds elapsed since the Unix epoch     |
  | 8     | 10     | Turns                                                   |
  | 10    | 11     | End Type (normal, tie, forfeit, forced win, forced tie) |
  | 11    | 13     | Winner's provisional Glicko-1 rating (`rpr`)            |
  | 13    | 14     | Winner's provisional Glicko-1 rating deviation (`rprd`) |
  | 14    | 16     | Loser's provisional Glicko-1 rating (`rpr`)             |
  | 16    | 17     | Losers's provisional Glicko-1 rating deviation (`rprd`) |
  | 17    | 17+N   | Winner's team (*encoding depends on generation*)        |
  | 17+N  | 17+2×N | Losers's team (*encoding depends on generation*)        |

  This resulting database can then be consumed by the `teams.ts` and `stats.ts` scripts detailed
  below.

- [`teams.ts`](teams.ts): Produces a `teams.db` file of the `NUM` (default 10,000) top teams from
  `GEN` as found in the `LOGS` database (where the logs database is the output of `logs.ts`):

      $ npm run compile && node build/tools/teams <GEN> <LOGS> <NUM?> > src/lib/gen<GEN>/data/teams.db

  The resulting binary `teams.db` can then be inspected with the same tool:

      $ npm run compile && node build/tools/teams <GEN>

- [`stats.ts`](stats.ts): TODO
