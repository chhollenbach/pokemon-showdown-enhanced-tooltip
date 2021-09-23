import damage_calc_wrapper from './damage_calc_wrapper';

let enhanced_move_tooltip = {};

// majority of this code is identical to code in https://github.com/smogon/pokemon-showdown-client, as we are going to overwrite the method for the tooltip class
enhanced_move_tooltip.showMoveTooltip = function showMoveTooltip(move, isZOrMax, pokemon, serverPokemon, gmaxMove) {
    let text = '';
  
    let zEffect = '';
    let foeActive = pokemon.side.foe.active;
    if (this.battle.gameType === 'freeforall') {
      foeActive = [...foeActive, ...pokemon.side.active].filter(active => active !== pokemon);
    }
    // TODO: move this somewhere it makes more sense
    if (pokemon.ability === '(suppressed)') serverPokemon.ability = '(suppressed)';
    let ability = toID(serverPokemon.ability || pokemon.ability || serverPokemon.baseAbility);
    let item = this.battle.dex.items.get(serverPokemon.item);
  
    let value = new ModifiableValue(this.battle, pokemon, serverPokemon);
    let [moveType, category] = this.getMoveType(move, value, gmaxMove || isZOrMax === 'maxmove');
  
    if (isZOrMax === 'zmove') {
      if (item.zMoveFrom === move.name) {
        move = this.battle.dex.moves.get(item.zMove);
      } else if (move.category === 'Status') {
        move = new Move(move.id, "", {
          ...move,
          name: 'Z-' + move.name,
        });
        zEffect = this.getStatusZMoveEffect(move);
      } else {
        let moveName = BattleTooltips.zMoveTable[item.zMoveType];
        let zMove = this.battle.dex.moves.get(moveName);
        let movePower = move.zMove.basePower;
        // the different Hidden Power types don't have a Z power set, fall back on base move
        if (!movePower && move.id.startsWith('hiddenpower')) {
          movePower = this.battle.dex.moves.get('hiddenpower').zMove.basePower;
        }
        if (move.id === 'weatherball') {
          switch (this.battle.weather) {
          case 'sunnyday':
          case 'desolateland':
            zMove = this.battle.dex.moves.get(BattleTooltips.zMoveTable['Fire']);
            break;
          case 'raindance':
          case 'primordialsea':
            zMove = this.battle.dex.moves.get(BattleTooltips.zMoveTable['Water']);
            break;
          case 'sandstorm':
            zMove = this.battle.dex.moves.get(BattleTooltips.zMoveTable['Rock']);
            break;
          case 'hail':
            zMove = this.battle.dex.moves.get(BattleTooltips.zMoveTable['Ice']);
            break;
          }
        }
        move = new Move(zMove.id, zMove.name, {
          ...zMove,
          category: move.category,
          basePower: movePower,
        });
      }
    } else if (isZOrMax === 'maxmove') {
      if (move.category === 'Status') {
        move = this.battle.dex.moves.get('Max Guard');
      } else {
        let maxMove = this.getMaxMoveFromType(moveType, gmaxMove);
        const basePower = ['gmaxdrumsolo', 'gmaxfireball', 'gmaxhydrosnipe'].includes(maxMove.id) ?
          maxMove.basePower : move.maxMove.basePower;
        move = new Move(maxMove.id, maxMove.name, {
          ...maxMove,
          category: move.category,
          basePower,
        });
      }
    }
  
    text += '<h2>' + move.name + '<br />';
  
    text += Dex.getTypeIcon(moveType);
    text += ` ${Dex.getCategoryIcon(category)}</h2>`;
  
    // Check if there are more than one active Pokémon to check for multiple possible BPs.
    let showingMultipleBasePowers = false;
    if (category !== 'Status' && foeActive.length > 1) {
      // We check if there is a difference in base powers to note it.
      // Otherwise, it is just shown as in singles.
      // The trick is that we need to calculate it first for each Pokémon to see if it changes.
      let prevBasePower = null;
      let basePower = '';
      let difference = false;
      let basePowers = [];
      for (const active of foeActive) {
        if (!active) continue;
        value = this.getMoveBasePower(move, moveType, value, active);
        basePower = '' + value;
        if (prevBasePower === null) prevBasePower = basePower;
        if (prevBasePower !== basePower) difference = true;
        basePowers.push('Base power vs ' + active.name + ': ' + basePower);
      }
      if (difference) {
        text += '<p>' + basePowers.join('<br />') + '</p>';
        showingMultipleBasePowers = true;
      }
      // Falls through to not to repeat code on showing the base power.
    }
    if (!showingMultipleBasePowers && category !== 'Status') {
      let activeTarget = foeActive[0] || foeActive[1] || foeActive[2];
      value = this.getMoveBasePower(move, moveType, value, activeTarget);
      text += '<p>Base power: ' + value + '</p>';
    }
  
    let accuracy = this.getMoveAccuracy(move, value);
  
    // Deal with Nature Power special case, indicating which move it calls.
    if (move.id === 'naturepower') {
      let calls;
      if (this.battle.gen > 5) {
        if (this.battle.hasPseudoWeather('Electric Terrain')) {
          calls = 'Thunderbolt';
        } else if (this.battle.hasPseudoWeather('Grassy Terrain')) {
          calls = 'Energy Ball';
        } else if (this.battle.hasPseudoWeather('Misty Terrain')) {
          calls = 'Moonblast';
        } else if (this.battle.hasPseudoWeather('Psychic Terrain')) {
          calls = 'Psychic';
        } else {
          calls = 'Tri Attack';
        }
      } else if (this.battle.gen > 3) {
        // In gens 4 and 5 it calls Earthquake.
        calls = 'Earthquake';
      } else {
        // In gen 3 it calls Swift, so it retains its normal typing.
        calls = 'Swift';
      }
      let calledMove = this.battle.dex.moves.get(calls);
      text += 'Calls ' + Dex.getTypeIcon(this.getMoveType(calledMove, value)[0]) + ' ' + calledMove.name;
    }
  
    text += '<p>Accuracy: ' + accuracy + '</p>';
    if (zEffect) text += '<p>Z-Effect: ' + zEffect + '</p>';
    
    /**********************************/
    /* START Damage Calc Modification */
    /**********************************/

    // Right now limiting scope to random battles, 1v1, non hardcore mode. Multiple opponents and variable EVs makes things much trickier
    if (move.category !== "Status" && this.battle.gameType === 'singles' && !this.battle.hardcoreMode && this.battle.id.includes("random")) {

      let result = damage_calc_wrapper(pokemon, pokemon.side.foe.active[0], this.battle.farSide, serverPokemon, move, this.battle)
      
      // generate % ranges
      let low_end = 0
      let high_end = 0
      if (result.damage === 0) {
        low_end = 0
        high_end = 0
      }
      else {
        low_end = Math.round((result.damage[0] / result.defender.stats.hp) * 100)
        high_end = Math.round((result.damage[15] / result.defender.stats.hp) * 100)
      }
      

      text += '<p class="section"> Damage Range (per hit): ' + low_end + '% - ' + high_end + '%' + '</p>';
    }

    /********************************/
    /* END Damage Calc Modification */
    /********************************/

    if (this.battle.hardcoreMode) {
      text += '<p class="section">' + move.shortDesc + '</p>';
    } else {
      text += '<p class="section">';
      if (move.priority > 1) {
        text += 'Nearly always moves first <em>(priority +' + move.priority + ')</em>.</p><p>';
      } else if (move.priority <= -1) {
        text += 'Nearly always moves last <em>(priority &minus;' + (-move.priority) + ')</em>.</p><p>';
      } else if (move.priority === 1) {
        text += 'Usually moves first <em>(priority +' + move.priority + ')</em>.</p><p>';
      } else {
        if (move.id === 'grassyglide' && this.battle.hasPseudoWeather('Grassy Terrain')) {
          text += 'Usually moves first <em>(priority +1)</em>.</p><p>';
        }
      }
  
      text += '' + (move.desc || move.shortDesc || '') + '</p>';
  
      if (this.battle.gameType === 'doubles' || this.battle.gameType === 'multi') {
        if (move.target === 'allAdjacent') {
          text += '<p>&#x25ce; Hits both foes and ally.</p>';
        } else if (move.target === 'allAdjacentFoes') {
          text += '<p>&#x25ce; Hits both foes.</p>';
        }
      } else if (this.battle.gameType === 'triples') {
        if (move.target === 'allAdjacent') {
          text += '<p>&#x25ce; Hits adjacent foes and allies.</p>';
        } else if (move.target === 'allAdjacentFoes') {
          text += '<p>&#x25ce; Hits adjacent foes.</p>';
        } else if (move.target === 'any') {
          text += '<p>&#x25ce; Can target distant Pok&eacute;mon in Triples.</p>';
        }
      } else if (this.battle.gameType === 'freeforall') {
        if (move.target === 'allAdjacent' || move.target === 'allAdjacentFoes') {
          text += '<p>&#x25ce; Hits all foes.</p>';
        } else if (move.target === 'adjacentAlly') {
          text += '<p>&#x25ce; Can target any foe in Free-For-All.</p>';
        }
      }
  
      if (move.flags.defrost) {
        text += `<p class="movetag">The user thaws out if it is frozen.</p>`;
      }
      if (!move.flags.protect && !['self', 'allySide'].includes(move.target)) {
        text += `<p class="movetag">Not blocked by Protect <small>(and Detect, King's Shield, Spiky Shield)</small></p>`;
      }
      if (move.flags.bypasssub) {
        text += `<p class="movetag">Bypasses Substitute <small>(but does not break it)</small></p>`;
      }
      if (!move.flags.reflectable && !['self', 'allySide'].includes(move.target) && move.category === 'Status') {
        text += `<p class="movetag">&#x2713; Not bounceable <small>(can't be bounced by Magic Coat/Bounce)</small></p>`;
      }
  
      if (move.flags.contact) {
        text += `<p class="movetag">&#x2713; Contact <small>(triggers Iron Barbs, Spiky Shield, etc)</small></p>`;
      }
      if (move.flags.sound) {
        text += `<p class="movetag">&#x2713; Sound <small>(doesn't affect Soundproof pokemon)</small></p>`;
      }
      if (move.flags.powder && this.battle.gen > 5) {
        text += `<p class="movetag">&#x2713; Powder <small>(doesn't affect Grass, Overcoat, Safety Goggles)</small></p>`;
      }
      if (move.flags.punch && ability === 'ironfist') {
        text += `<p class="movetag">&#x2713; Fist <small>(boosted by Iron Fist)</small></p>`;
      }
      if (move.flags.pulse && ability === 'megalauncher') {
        text += `<p class="movetag">&#x2713; Pulse <small>(boosted by Mega Launcher)</small></p>`;
      }
      if (move.flags.bite && ability === 'strongjaw') {
        text += `<p class="movetag">&#x2713; Bite <small>(boosted by Strong Jaw)</small></p>`;
      }
      if ((move.recoil || move.hasCrashDamage) && ability === 'reckless') {
        text += `<p class="movetag">&#x2713; Recoil <small>(boosted by Reckless)</small></p>`;
      }
      if (move.flags.bullet) {
        text += `<p class="movetag">&#x2713; Bullet-like <small>(doesn't affect Bulletproof pokemon)</small></p>`;
      }
    }
    return text;
  }

  export default enhanced_move_tooltip