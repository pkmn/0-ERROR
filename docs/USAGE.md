# Usage

TODO mention license

### Bot

TODO

https://github.com/pkmn-archive/bot/blob/master/package.json
https://github.com/pkmn-archive/POSHO-9000/blob/master/index.ts

```sh
npm install
npm start
```

```json
{
  "id": "showdown",
  "server": "sim.smogon.com",
  "port": "8000",
  "username": "0 ERROR",
  "password": "1H3rdUl13kmuDk1pZ",
}
```

Looks for config.json in root, if required fields are missing prompts for them (like @pkmn/login script)
- only plays one battle at a time, either ladder or accepting challenges
- by default if avatar is not specificed will change
- defaults to youngster for the gen in question
- traps SIGINT and finish current battles but don't accept more
- if restarts/reconnents: able to resume battling
- switching between ladders and accepting challenges requires restart
- only ever plays a single battle at once
- can accept a list must be formats to play - if in ladder mode will attempt to round robin
- can allowlist certain names for challenges

<details><summary>Default Avatar</summary><table>
<tr>
  <th><center>I</center></th>
  <th><center>II</center></th>
  <th><center>III</center></th>
  <th><center>IV</center></th>
  <th><center>V</center></th>
  <th><center>VI</center></th>
  <th><center>VII</center></th>
  <th><center>VIII</center></th>
  <th><center>IX</center></th>
</tr>
<tr>
  <td><img src="https://psim.us/sprites/trainers/youngster-gen1rb.png" alt="youngster-gen1rb" /></td>
  <td><img src="https://psim.us/sprites/trainers/youngster-gen2.png" alt="youngster-gen2" /></td>
  <td><img src="https://psim.us/sprites/trainers/youngster-gen3rs.png" alt="youngster-gen3rs" /></td>
  <td><img src="https://psim.us/sprites/trainers/youngster-gen4.png" alt="youngster-gen4" /></td>
  <td><img src="https://psim.us/sprites/trainers/youngster.png" alt="youngster" /></td>
  <td><img src="https://psim.us/sprites/trainers/youngster-gen6.png" alt="youngster-gen6" /></td>
  <td><img src="https://psim.us/sprites/trainers/youngster-gen7.png" alt="youngster-gen7" /></td>
  <td><img src="https://psim.us/sprites/trainers/youngster-gen8.png" alt="youngster-gen8" /></td>
  <td><img src="https://psim.us/sprites/trainers/youngster-gen9.png" alt="youngster-gen9" /></td>
</tr>
</table></details>


### Web

TODO

just WASM around engine

PocketMon https://play.pkmn.cc

```json
"dependencies": {
  "@pkmn/ai": "https://pkmn.cc/0-ERROR.tar.gz",
  ...
}
```
