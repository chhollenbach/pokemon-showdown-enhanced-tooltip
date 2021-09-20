// ensure page is loaded
if( document.readyState !== 'loading' ) {
  console.log( 'Document is already ready, feel free to execute code' );
} else {
  document.addEventListener('DOMContentLoaded', (event) => {
    console.log('DOM content fully loaded and parsed')
  })
}

// testing script running at all
let test = 'Hello World!!!';
console.log(`${test}`);

// testing if damage calc imported correctly
import {calculate, Generations, Pokemon, Move} from '../node_modules/@smogon/calc';
const gen = Generations.get(8); // alternatively: const gen = 8;
const result = calculate(
  gen,
  new Pokemon(gen, 'Gengar', {
    item: 'Choice Specs',
    nature: 'Timid',
    evs: {spa: 252},
    boosts: {spa: 1},
  }),
  new Pokemon(gen, 'Chansey', {
    item: 'Eviolite',
    nature: 'Calm',
    evs: {hp: 252, spd: 252},
  }),
  new Move(gen, 'Focus Blast')
);
console.log(result)


// testing overwriting battletooltip methods
let ShowdownEnhancementSuite = {};

// recreating this function because it's not working properly in pokemon prototype
function getHPText(pokemon, precision = 1) {
  if (pokemon.maxhp === 100) return pokemon.hp + '%';
  if (pokemon.maxhp !== 48) return (100 * pokemon.hp / pokemon.maxhp).toFixed(precision) + '%';
  let range = Pokemon.getPixelRange(pokemon.hp, pokemon.hpcolor);
  return Pokemon.getFormattedRange(range, precision, '–');
}

ShowdownEnhancementSuite.showPokemonTooltip = function showPokemonTooltip(clientPokemon, serverPokemon, isActive, illusionIndex) {
  const pokemon = clientPokemon || serverPokemon;
  let text = '';
  let genderBuf = '';
  const gender = pokemon.gender;
  if (gender === 'M' || gender === 'F') {
    genderBuf = ` <img src="${Dex.resourcePrefix}fx/gender-${gender.toLowerCase()}.png" alt="${gender}" width="7" height="10" class="pixelated" /> `;
  }

  let name = BattleLog.escapeHTML(pokemon.name);
  if (pokemon.speciesForme !== pokemon.name) {
    name += ' <small>(' + BattleLog.escapeHTML(pokemon.speciesForme) + ')</small>';
  }

  let levelBuf = (pokemon.level !== 100 ? ` <small>L${pokemon.level}</small>` : ``);
  if (!illusionIndex || illusionIndex === 1) {
    text += `<h2>${name}${genderBuf}${illusionIndex ? '' : levelBuf}<br />` + "Hello World!";

    if (clientPokemon?.volatiles.formechange) {
      if (clientPokemon.volatiles.transform) {
        text += `<small>(Transformed into ${clientPokemon.volatiles.formechange[1]})</small><br />`;
      } else {
        text += `<small>(Changed forme: ${clientPokemon.volatiles.formechange[1]})</small><br />`;
      }
    }

    let types = this.getPokemonTypes(pokemon);

    if (clientPokemon && (clientPokemon.volatiles.typechange || clientPokemon.volatiles.typeadd)) {
      text += `<small>(Type changed)</small><br />`;
    }
    text += types.map(type => Dex.getTypeIcon(type)).join(' ');
    text += `</h2>`;
  }

  if (illusionIndex) {
    text += `<p class="section"><strong>Possible Illusion #${illusionIndex}</strong>${levelBuf}</p>`;
  }

  if (pokemon.fainted) {
    text += '<p><small>HP:</small> (fainted)</p>';
  } else if (this.battle.hardcoreMode) {
    if (serverPokemon) {
      text += '<p><small>HP:</small> ' + serverPokemon.hp + '/' + serverPokemon.maxhp + (pokemon.status ? ' <span class="status ' + pokemon.status + '">' + pokemon.status.toUpperCase() + '</span>' : '') + '</p>';
    }
  } else {
    let exacthp = '';
    if (serverPokemon) {
      exacthp = ' (' + serverPokemon.hp + '/' + serverPokemon.maxhp + ')';
    } else if (pokemon.maxhp === 48) {
      exacthp = ' <small>(' + pokemon.hp + '/' + pokemon.maxhp + ' pixels)</small>';
    }
    text += '<p><small>HP:</small> ' + getHPText(pokemon) + exacthp + (pokemon.status ? ' <span class="status ' + pokemon.status + '">' + pokemon.status.toUpperCase() + '</span>' : '');
    if (clientPokemon) {
      if (pokemon.status === 'tox') {
        if (pokemon.ability === 'Poison Heal' || pokemon.ability === 'Magic Guard') {
          text += ' <small>Would take if ability removed: ' + Math.floor(100 / 16 * Math.min(clientPokemon.statusData.toxicTurns + 1, 15)) + '%</small>';
        } else {
          text += ' Next damage: ' + Math.floor(100 / (clientPokemon.volatiles['dynamax'] ? 32 : 16) * Math.min(clientPokemon.statusData.toxicTurns + 1, 15)) + '%';
        }
      } else if (pokemon.status === 'slp') {
        text += ' Turns asleep: ' + clientPokemon.statusData.sleepTurns;
      }
    }
    text += '</p>';
  }

  const supportsAbilities = this.battle.gen > 2 && !this.battle.tier.includes("Let's Go");

  let abilityText = '';
  if (supportsAbilities) {
    abilityText = this.getPokemonAbilityText(
      clientPokemon, serverPokemon, isActive, !!illusionIndex && illusionIndex > 1
    );
  }

  let itemText = '';
  if (serverPokemon) {
    let item = '';
    let itemEffect = '';
    if (clientPokemon?.prevItem) {
      item = 'None';
      let prevItem = Dex.items.get(clientPokemon.prevItem).name;
      itemEffect += clientPokemon.prevItemEffect ? prevItem + ' was ' + clientPokemon.prevItemEffect : 'was ' + prevItem;
    }
    if (serverPokemon.item) item = Dex.items.get(serverPokemon.item).name;
    if (itemEffect) itemEffect = ' (' + itemEffect + ')';
    if (item) itemText = '<small>Item:</small> ' + item + itemEffect;
  } else if (clientPokemon) {
    let item = '';
    let itemEffect = clientPokemon.itemEffect || '';
    if (clientPokemon.prevItem) {
      item = 'None';
      if (itemEffect) itemEffect += '; ';
      let prevItem = Dex.items.get(clientPokemon.prevItem).name;
      itemEffect += clientPokemon.prevItemEffect ? prevItem + ' was ' + clientPokemon.prevItemEffect : 'was ' + prevItem;
    }
    if (pokemon.item) item = Dex.items.get(pokemon.item).name;
    if (itemEffect) itemEffect = ' (' + itemEffect + ')';
    if (item) itemText = '<small>Item:</small> ' + item + itemEffect;
  }

  text += '<p>';
  text += abilityText;
  if (itemText) {
    // ability/item on one line for your own switch tooltips, two lines everywhere else
    text += (!isActive && serverPokemon ? ' / ' : '</p><p>');
    text += itemText;
  }
  text += '</p>';

  text += this.renderStats(clientPokemon, serverPokemon, !isActive);

  if (serverPokemon && !isActive) {
    // move list
    text += `<p class="section">`;
    const battlePokemon = clientPokemon || this.battle.findCorrespondingPokemon(pokemon);
    for (const moveid of serverPokemon.moves) {
      const move = Dex.moves.get(moveid);
      let moveName = `&#8226; ${move.name}`;
      if (battlePokemon?.moveTrack) {
        for (const row of battlePokemon.moveTrack) {
          if (moveName === row[0]) {
            moveName = this.getPPUseText(row, true);
            break;
          }
        }
      }
      text += `${moveName}<br />`;
    }
    text += '</p>';
  } else if (!this.battle.hardcoreMode && clientPokemon?.moveTrack.length) {
    // move list (guessed)
    text += `<p class="section">`;
    for (const row of clientPokemon.moveTrack) {
      text += `${this.getPPUseText(row)}<br />`;
    }
    if (clientPokemon.moveTrack.filter(([moveName]) => {
      if (moveName.charAt(0) === '*') return false;
      const move = this.battle.dex.moves.get(moveName);
      return !move.isZ && !move.isMax && move.name !== 'Mimic';
    }).length > 4) {
      text += `(More than 4 moves is usually a sign of Illusion Zoroark/Zorua.) `;
    }
    if (this.battle.gen === 3) {
      text += `(Pressure is not visible in Gen 3, so in certain situations, more PP may have been lost than shown here.) `;
    }
    if (this.pokemonHasClones(clientPokemon)) {
      text += `(Your opponent has two indistinguishable Pokémon, making it impossible for you to tell which one has which moves/ability/item.) `;
    }
    text += `</p>`;
  }
  console.log("You've hovered over the pokemon tooltip!")
  return text;
}

// testing altering move tooltip
ShowdownEnhancementSuite.showMoveTooltip = function showMoveTooltip(move, isZOrMax, pokemon, serverPokemon, gmaxMove, clientPokemon) {
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
  console.log("You're hovering over a move tooltip!")
  console.log(pokemon.side.active)
  console.log(pokemon.side.foe.active)
  return text;
}

BattleTooltips.prototype.showPokemonTooltip = ShowdownEnhancementSuite.showPokemonTooltip;
BattleTooltips.prototype.showMoveTooltip = ShowdownEnhancementSuite.showMoveTooltip;
