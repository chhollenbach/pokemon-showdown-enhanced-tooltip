// ensure page is loaded
if( document.readyState !== 'loading' ) {
  console.log( 'Document is already ready, feel free to execute code' );
} else {
  document.addEventListener('DOMContentLoaded', (event) => {
    console.log('DOM content fully loaded and parsed')
  })
}

// import move and pokemon tooltip changes
import enhanced_move_tooltip from "./move_tooltip.js"
import enhanced_pokemon_tooltip from "./pokemon_tooltip.js"

// overwrite tooltip methods with enhanced methods
BattleTooltips.prototype.showPokemonTooltip = enhanced_pokemon_tooltip.showPokemonTooltip;
BattleTooltips.prototype.showMoveTooltip = enhanced_move_tooltip.showMoveTooltip;
