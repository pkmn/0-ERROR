#!/usr/bin/env node
'use strict';

import 'source-map-support/register';

import {execFileSync} from 'child_process';
import * as path from 'path';

import {Actions} from '@pkmn/login';
import WebSocket from 'ws';

const ROOT = path.resolve(__dirname, '..', '..');

const sh = (cmd: string, args: string[]) =>
  execFileSync(cmd, args, {encoding: 'utf8', cwd: ROOT});

