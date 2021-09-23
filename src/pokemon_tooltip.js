import damage_calc_wrapper from "./damage_calc_wrapper.js"

let enhanced_pokemon_tooltip = {};

// majority of this code is identical to code in https://github.com/smogon/pokemon-showdown-client, as we are going to overwrite the method for the tooltip class
function getHPText(pokemon, precision = 1) {
  if (pokemon.maxhp === 100) return pokemon.hp + '%';
  if (pokemon.maxhp !== 48) return (100 * pokemon.hp / pokemon.maxhp).toFixed(precision) + '%';
  let range = Pokemon.getPixelRange(pokemon.hp, pokemon.hpcolor);
  return Pokemon.getFormattedRange(range, precision, '–');
}

enhanced_pokemon_tooltip.showPokemonTooltip = function showPokemonTooltip(clientPokemon, serverPokemon, isActive, illusionIndex) {
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
    text += `<h2>${name}${genderBuf}${illusionIndex ? '' : levelBuf}<br />`;

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

      /*****************************************************************/
      /* START modification of pokemon tool tip for damage calculation */
      /*****************************************************************/
      // THIS SECTION MODIFIES SERVER NON-ACTIVE POKEMON
      // if client pokemon is null, then attacker is server pokemon, defender is farSide
      // Right now limiting scope to random battles, 1v1, non hardcore mode. Multiple opponents and variable EVs makes things much trickier
      if (move.category !== "Status" && this.battle.gameType === 'singles' && !this.battle.hardcoreMode && this.battle.id.includes("random")) {

        let result = damage_calc_wrapper(this.battle.mySide.active[0], this.battle.farSide.active[0], this.battle.farSide, serverPokemon, move, this.battle)
        
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
        text += `${moveName} ${low_end}% - ${high_end}% <br />`;
      }

      else {
        text += `${moveName}<br />`;
      }
      

      /*****************************************************************/
      /* END modification of pokemon tool tip for damage calculation */
      /*****************************************************************/

    }
    text += '</p>';
  } else if (!this.battle.hardcoreMode && clientPokemon?.moveTrack.length) {
    // move list (guessed)
    text += `<p class="section">`;
    for (const row of clientPokemon.moveTrack) {

      /*****************************************************************/
      /* START modification of pokemon tool tip for damage calculation */
      /*****************************************************************/
      // THIS SECTION MODIFIES ALL NON-SERVER POKEMON AND ACTIVE SERVER POKEMON

      // turning title case move into move object
      let row_move = this.battle.dex.moves.get(row[0].replace(/\s+/g, '').toLowerCase())

      // Right now limiting scope to random battles, 1v1, non hardcore mode. Multiple opponents and variable EVs makes things much trickier
      if (row_move.category !== "Status" && this.battle.gameType === 'singles' && !this.battle.hardcoreMode && this.battle.id.includes("random")) {
        
        let attacker_poke = null
        let defender_poke = null
        let defender_side = null
        let server_poke = null
        // if serverPokemon, attacker is serverPokemon, defender is far side
        if (server_poke) {
          server_poke = serverPokemon
          attacker_poke = this.battle.mySide.active[0]
          defender_poke = this.battle.farSide.active[0]
          defender_side = this.battle.farSide
        }
        // if client and farside P# are different, attacker is clientPokemon, defender is far side
        else if (clientPokemon.ident.slice(0,2) !== this.battle.farSide.active[0].ident.slice(0,2)) {
          server_poke = clientPokemon
          attacker_poke = clientPokemon
          defender_poke = this.battle.farSide.active[0]
          defender_side = this.battle.farSide
          if (defender_poke === null) {break}
        }
        // if client and farside P# are same, attacker is clientPokemon, defender is myside
        else if (clientPokemon.ident.slice(0,2) === this.battle.farSide.active[0].ident.slice(0,2)) {
          server_poke = clientPokemon
          attacker_poke = clientPokemon
          defender_poke = this.battle.mySide.active[0]
          defender_side = this.battle.mySide
          if (defender_poke === null) {break}
        }

        let result = damage_calc_wrapper(attacker_poke, defender_poke, defender_side, server_poke, row_move, this.battle)

        // generate % ranges
        let low_end = 0
        let high_end = 0
        if (result.damage.length === 1) {
          low_end = 0
          high_end = 0
        }
        else {
          low_end = Math.round((result.damage[0] / result.defender.stats.hp) * 100)
          high_end = Math.round((result.damage[15] / result.defender.stats.hp) * 100)
        }
        
        text += `${this.getPPUseText(row)} ${low_end}% - ${high_end}% <br />`;
      }
      else {
        text += `${this.getPPUseText(row)} <br />`;
      }
      

    

      /*****************************************************************/
      /* END modification of pokemon tool tip for damage calculation */
      /*****************************************************************/

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
  return text;
}

export default enhanced_pokemon_tooltip