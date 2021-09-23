// wrapper script for the @smogon/damage-calc Calculate function
// function accepts objects from the pokemon showdown gamestate, parses and creates objects needed for damage-calc Calculate function, and returns result

// Damage Calculator import - see https://github.com/smogon/damage-calc for source code
import {calculate, Generations, Pokemon as damageCalcPokemon, Move as damageCalcMove, Field} from '@smogon/calc';

function damage_calc_wrapper(attacking_poke, defending_poke, defending_side, server_side_poke, move_object, battle_instance) {

    // generation of battle
    let gen = Generations.get(battle_instance.gen)

    // determine dynamzing
    let player_dynamaxed = false
    let foe_dynamaxed = false
    if ("dynamax" in attacking_poke.volatiles) {
      player_dynamaxed = true
    }
    if ("dynamax" in defending_poke.volatiles) {
      foe_dynamaxed = true
    }

    // items and abilities must be title case and spaced
    let attackItem = ""
    let attackAbility = ""
    if (server_side_poke.item) {attackItem = Dex.items.get(server_side_poke.item).name}
    if (server_side_poke.ability) {attackAbility = Dex.abilities.get(server_side_poke.ability).name}

    // determine if abilities are active - only care about abilities that affect damage
    let attackAbilityActive = false
    let defendAbilityActive = false
    let gutsFlag = false
    if (server_side_poke.ability === "guts" && server_side_poke.status !== ""){
      attackAbilityActive = true
      gutsFlag = true // seems to be a bug where guts isn't triggering increased attack in damage calc, using flag to add boost
    }
    // TODO - figure out better solution for defensive abilities
    if (defending_poke.ability && defending_poke.ability === "multiscale" && defending_poke.hp === 100){
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
        attackerBoosts = Object.assign(attackerBoosts, attacking_poke.boosts)
        attackerBoosts.atk += 1
      } else {
        attackerBoosts.atk = 1
      }
    }  else {
      attackerBoosts = Object.assign(attackerBoosts, attacking_poke.boosts)
    }
    
    let attacker = new damageCalcPokemon(gen, server_side_poke.name, {
      item: attackItem, 
      nature: "Hardy", // Random batttle mons always have neutral nature
      evs: {hp: 85, spd: 85, def: 85, atk: 85, spa: 85, spe: 85}, // random battle mons always have 85, except for rare situations // TODO logic for edge cases
      boosts: attackerBoosts,
      ability: attackAbility,
      level: server_side_poke.level,
      isDynamaxed: player_dynamaxed,
      abilityOn: attackAbilityActive,
      gender: server_side_poke.gender
    }) 
    
    // create defender
    let defendItem = ""
    let defendAbility = ""
    if (defending_poke.item.length > 0) {defendItem = Dex.items.get(defending_poke.item).name}
    if (defending_poke.ability.length > 0) {defendAbility = Dex.abilities.get(defending_poke.ability).name}
    let defender = new damageCalcPokemon(gen, defending_poke.name, {
      item: defendItem, //TODO item here not showing up? need to investigate
      nature: "Hardy", // Random batttle mons always have neutral nature
      evs: {hp: 85, spd: 85, def: 85, atk: 85, spa: 85, spe: 85}, // random battle mons always have 85, except for rare situations // TODO logic for edge cases
      boosts: defending_poke.boosts,
      ability: defendAbility,
      level: defending_poke.level,
      isDynamaxed: foe_dynamaxed,
      abilityOn: defendAbilityActive,
      gender: defending_poke.gender
    }) 

    // create move object
    let calcMove = new damageCalcMove(gen, move_object.name)

    // determine variables for field object
    let lightscreen = false
    if ("lightscreen" in defending_side.sideConditions){
      lightscreen = true
    }
    let reflect = false
    if ("reflect" in defending_side.sideConditions){
      reflect = true
    }
    let aurora_veil = false
    if ("auroraveil" in defending_side.sideConditions){
      aurora_veil = true
    }
    let dark_aura = false
    if (server_side_poke.ability === "darkaura"){
      dark_aura = true
    }
    let fairy_aura = false
    if (server_side_poke.ability === "fairyaura"){
      fairy_aura = true
    }
    let battle_terrain = ""
    if (battle_instance.pseudoWeather.length > 0){
      battle_terrain = battle_instance.pseudoWeather[0][0]
    }

    // create field object
    let calcField = new Field({
      weather: battle_instance.weather,
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

    return result
}

export default damage_calc_wrapper