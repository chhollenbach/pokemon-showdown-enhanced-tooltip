// Damage Calculator import - see https://github.com/smogon/damage-calc for source code
import {calculate, Generations, Pokemon as damageCalcPokemon, Move as damageCalcMove, Field} from '@smogon/calc';

let enhanced_pokemon_tooltip = {};

// recreating this function because it's not working properly in pokemon prototype
function getHPText(pokemon, precision = 1) {
  if (pokemon.maxhp === 100) return pokemon.hp + '%';
  if (pokemon.maxhp !== 48) return (100 * pokemon.hp / pokemon.maxhp).toFixed(precision) + '%';
  let range = Pokemon.getPixelRange(pokemon.hp, pokemon.hpcolor);
  return Pokemon.getFormattedRange(range, precision, '–');
}

// majority of this code is identical to code in https://github.com/smogon/pokemon-showdown-client, as we are going to overwrite the method for the tooltip class
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
        // TODO move all this logic to a separate function for ease of use

        // generation of battle
        let gen = Generations.get(this.battle.gen)

        // determine dynamzing
        let player_dynamaxed = false
        let foe_dynamaxed = false
        if ("dynamax" in this.battle.farSide.active[0].volatiles) {
          foe_dynamaxed = true
        }
      
        // items and abilities must be title case and spaced
        let attackItem = ""
        let attackAbility = ""
        if (serverPokemon.item) {attackItem = Dex.items.get(serverPokemon.item).name}
        attackAbility = Dex.abilities.get(serverPokemon.ability).name

        // determine if abilities are active - only care about abilities that affect damage
        let attackAbilityActive = false
        let defendAbilityActive = false
        let gutsFlag = false
        if (serverPokemon.ability === "guts" && serverPokemon.status !== ""){
          attackAbilityActive = true
          gutsFlag = true // seems to be a bug where guts isn't triggering increased attack in damage calc, using flag to add boost
        }
        // TODO - figure out better solution for defensive abilities
        if (this.battle.farSide.active[0].ability && this.battle.farSide.active[0].ability === "multiscale" && this.battle.farSide.active[0].hp === 100){
          defendAbilityActive = true
        }
        let damageAbilities = ["Adaptability", "Aerilate", "Analytic", "Battery", "Battle Bond", "Dragon's Maw", "Galvanize", 
                              "Gorilla Tactics", "Iron Fist", "Mega Launcher", "Normalize", "Pixilate", "Power Spot", "Punk Rock",
                              "Reckless", "Refrigerate", "Rivalry", "Sand Force", "Sheer Force", "Stakeout", "Steelworker", "Steely Spirit", 
                              "Strong Jaw", "Technician", "Tough Claws", "Toxic Boost", "Transistor", "Water Bubble"
                              ]
        if (attackAbility in damageAbilities) {
          attackAbilityActive = true
        }

        // create attacker 
        let attackerBoosts = {}
        // bug with guts and damage calc package - not triggering increased attack
        if (gutsFlag) {
          if ('atk' in attackerBoosts) {
            attackerBoosts = Object.assign(attackerBoosts, this.battle.mySide.active[0].boosts)
            attackerBoosts.atk += 1
          } else {
            attackerBoosts.atk = 1
          }
        }
        let attacker = new damageCalcPokemon(gen, serverPokemon.name, {
          item: attackItem, 
          nature: "Hardy", // Random batttle mons always have neutral nature
          evs: {hp: 85, spd: 85, def: 85, atk: 85, spa: 85, spe: 85}, // random battle mons always have 85, except for rare situations // TODO logic for edge cases
          boosts: attackerBoosts,
          ability: attackAbility,
          level: serverPokemon.level,
          isDynamaxed: player_dynamaxed,
          abilityOn: attackAbilityActive,
          gender: serverPokemon.gender
        }) 

        // create defender
        let defendItem = ""
        let defendAbility = ""
        if (this.battle.farSide.active[0].item) {defendItem = Dex.items.get(this.battle.farSide.active[0].item).name}
        if (this.battle.farSide.active[0].ability) {defendAbility = Dex.abilities.get(this.battle.farSide.active[0].ability).name}
        let defender = new damageCalcPokemon(gen, this.battle.farSide.active[0].name, {
          item: defendItem, //TODO item here not showing up? need to investigate
          nature: "Hardy", // Random batttle mons always have neutral nature
          evs: {hp: 85, spd: 85, def: 85, atk: 85, spa: 85, spe: 85}, // random battle mons always have 85, except for rare situations // TODO logic for edge cases
          boosts: this.battle.farSide.active[0].boosts,
          ability: defendAbility,
          level: this.battle.farSide.active[0].level,
          isDynamaxed: foe_dynamaxed,
          abilityOn: defendAbilityActive,
          gender: this.battle.farSide.active[0].gender
        }) 

        // create move object
        let calcMove = new damageCalcMove(gen, moveid)

        // determine variables for field object
        let lightscreen = false
        if ("lightscreen" in this.battle.farSide.sideConditions){
          lightscreen = true
        }
        let reflect = false
        if ("reflect" in this.battle.farSide.sideConditions){
          reflect = true
        }
        let aurora_veil = false
        if ("auroraveil" in this.battle.farSide.sideConditions){
          aurora_veil = true
        }
        let dark_aura = false
        if (serverPokemon.ability === "darkaura"){
          dark_aura = true
        }
        let fairy_aura = false
        if (serverPokemon.ability === "fairyaura"){
          fairy_aura = true
        }
        let battle_terrain = ""
        if (this.battle.pseudoWeather.length > 0){
          battle_terrain = this.battle.pseudoWeather[0][0]
        }

        // create field object
        let calcField = new Field({
          weather: this.battle.weather,
          terrain: battle_terrain,
          isDarkAura: dark_aura,
          isFairyAura: fairy_aura,
          defenderSide: {
            isReflect: reflect,
            isLightScreen: lightscreen,
            isAuroraVeil: aurora_veil
          }
        })

        // run damage calculation
        let result = calculate(
          gen,
          attacker,
          defender,
          calcMove,
          calcField
        )
        
        // generate % ranges
        let low_end = Math.round((result.damage[0] / result.defender.stats.hp) * 100)
        let high_end = Math.round((result.damage[15] / result.defender.stats.hp) * 100)
        text += `${moveName} | ${low_end}% - ${high_end}% <br />`;
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
      console.log(row[0]) // move info
      console.log(serverPokemon) // p1 pokemon object, includes missing info (current poke in fight)
      console.log(this.battle.mySide.active[0]) // p1 pokemon object, missing non public info
      console.log(this.battle.farSide.active[0]) // p2 pokemon object
      console.log(this.battle) // for field/gen info
      console.log(clientPokemon)
      // if clientPokemon === serverPokemon, attacker is clientPokemon, defender is far side
      // if client and farside P# are different, attacker is clientPokemon, defender is far side
      // if client and farside P# are same, attacker is clientPokemon, defender is myside

      let attacker_poke = ""
      let defender_poke = ""
      let defender_side = ""

      // Right now limiting scope to random battles, 1v1, non hardcore mode. Multiple opponents and variable EVs makes things much trickier
      if (row[0].category !== "Status" && this.battle.gameType === 'singles' && !this.battle.hardcoreMode && this.battle.id.includes("random")) {
        // TODO move all this logic to a separate function for ease of use

        // generation of battle
        let gen = Generations.get(this.battle.gen)

        // determine dynamzing
        let foe_dynamaxed = false
        if ("dynamax" in this.battle.farSide.active[0].volatiles) {
          foe_dynamaxed = true
        }

        //TODO implement abilities being active for more than just guts
        let attackerGutsActive = false
        if ((serverPokemon !== null && serverPokemon.ability === "guts" && serverPokemon.status !== "")){
          attackerGutsActive = true
        }
        // create attacker and defender objects
        let attacker = new damageCalcPokemon(gen, serverPokemon.name, {
          item: serverPokemon.item, //TODO item here not showing up? need to investigate
          nature: "Hardy", // Random batttle mons always have neutral nature
          evs: {hp: 85, spd: 85, def: 85, atk: 85, spa: 85, spe: 85}, // random battle mons always have 85, except for rare situations // TODO logic for edge cases
          boosts: this.battle.mySide.active[0].boosts,
          ability: serverPokemon.ability,
          level: serverPokemon.level,
          abilityOn: attackerGutsActive
        }) 
        let defender = new damageCalcPokemon(gen, this.battle.farSide.active[0].name, {
          item: this.battle.farSide.active[0].item, //TODO item here not showing up? need to investigate
          nature: "Hardy", // Random batttle mons always have neutral nature
          evs: {hp: 85, spd: 85, def: 85, atk: 85, spa: 85, spe: 85}, // random battle mons always have 85, except for rare situations // TODO logic for edge cases
          boosts: this.battle.farSide.active[0].boosts,
          ability: this.battle.farSide.active[0].ability,
          level: this.battle.farSide.active[0].level,
          isDynamaxed: foe_dynamaxed
        }) 

        // create move object
        let calcMove = new damageCalcMove(gen, row[0])

        // determine variables for field object
        let lightscreen = false
        if ("lightscreen" in this.battle.farSide.sideConditions){
          lightscreen = true
        }
        let reflect = false
        if ("reflect" in this.battle.farSide.sideConditions){
          reflect = true
        }
        let aurora_veil = false
        if ("auroraveil" in this.battle.farSide.sideConditions){
          aurora_veil = true
        }
        let dark_aura = false
        if (serverPokemon.ability === "darkaura"){
          dark_aura = true
        }
        let fairy_aura = false
        if (serverPokemon.ability === "fairyaura"){
          fairy_aura = true
        }
        let battle_terrain = ""
        if (this.battle.pseudoWeather.length > 0){
          battle_terrain = this.battle.pseudoWeather[0][0]
        }

        // create field object
        let calcField = new Field({
          weather: this.battle.weather,
          terrain: battle_terrain,
          isDarkAura: dark_aura,
          isFairyAura: fairy_aura,
          defenderSide: {
            isReflect: reflect,
            isLightScreen: lightscreen,
            isAuroraVeil: aurora_veil
          }
        })

        // run damage calculation
        let result = calculate(
          gen,
          attacker,
          defender,
          calcMove,
          calcField
        )
        
        // generate % ranges
        let low_end = Math.round((result.damage[0] / result.defender.stats.hp) * 100)
        let high_end = Math.round((result.damage[15] / result.defender.stats.hp) * 100)

        // add to text
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