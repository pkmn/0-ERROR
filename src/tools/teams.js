#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFileSync} = require('child_process');

const {Team} = require('@pkmn/sets');

const sh = (cmd, args) => execFileSync(cmd, args, {encoding: 'utf8'});

const format = process.argv[2];
const root = process.argv[3];

const toID = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

const pack = team => {
  if (format.startsWith('gen1') || format.startsWith('gen2')) {
    const buf = [];
    for (const set of team) {
      const item = format.startsWith('gen2') ? `${toID(set.item)}|` : '';
      buf.push(`${toID(set.species)}|${item}${set.moves.map(toID).sort().join(',')}`);
    }
    return `${buf[0]}]${buf.slice(1).sort().join(']')}`;
  }

  for (const set of team) {
    for (const key in set) {
      if (typeof set[key] === 'string' && !SKIP.has(key)) {
        set[key] = toID(set[key]);
      }
    }
    set.name = set.species
    set.moves = set.moves.map(toID);
  }
  return new Team(team).pack();
};

const TEAMS = {};

let tmp;
try {
  (async () => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pkmn'));
    const archives = path.join(tmp, 'archives');
    const logs = path.join(tmp, 'logs');

    fs.mkdirSync(archives);
    fs.mkdirSync(logs);

    for (const month of fs.readdirSync(root)) {
      console.error(month);
      sh('tar', ['xf', path.join(root, month), '--strip-components=1', '-C', archives, `${format}/*.7z`]);

      for (const archive of fs.readdirSync(archives)) {
        sh('7z', ['x', path.join(archives, archive), `-o${logs}`]);
        fs.unlinkSync(path.join(archives, archive));
        for (const log of fs.readdirSync(logs)) {
          try {
            const json = JSON.parse(fs.readFileSync(path.join(logs, log)));
            if (json.p1rating) {
              const team = pack(json.p1team);
              TEAMS[team] = Math.max(TEAMS[team] || 0, json.p1rating.elo);
            }
            if (json.p2rating) {
              const team = pack(json.p2team);
              TEAMS[team] = Math.max(TEAMS[team] || 0, json.p2rating.elo);
            }
          } catch (e) {
            console.error(` - ${path.join(logs, log)}`);
          }
          fs.unlinkSync(path.join(logs, log));
        }
      }
    }
    for (const [key, val] of Object.entries(TEAMS).sort((a, b) => b[1] - a[1])) {
      console.log(`${Math.round(val)}\t${key}`);
    }
  })().catch(e => {
    console.error(e);
    process.exit(1);
  });
} finally {
  if (tmp) fs.rmSync(tmp, { recursive: true });
}
