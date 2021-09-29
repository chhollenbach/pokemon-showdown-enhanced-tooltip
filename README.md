# Pokémon Showdown Enhancement Suite 
Enhancement suite for Pokemon Showdown! I play a lot of random battles and never liked having to tab back and forth and input data into the Smogon Damage Calculator. Since the logic for the damage calculator is decoupled from the web interface, and available as a package, I decided to make a chrome extension that runs the calculations automatically! This extension is still in the beta stage of development, so expect changes as I add to it.

Currently, the extension only works for 1v1 random battles. Random battles have standard EVs/IVs so it's simpler to display info on the limited size of the tooltip. Also note that I'm limited by the information returned by the pokemon showdown client, so some ranges are slightly off if the opponent's item isn't visible and would affect the damage roll (e.g. eviolite or assault vest).

# Demo
*Displays the damage calculations for any move you hover over!*
![](https://raw.githubusercontent.com/chhollenbach/pokemon-showdown-enhancement-suite/main/public/demo4.jpg)

*Displays the damage calculations for pokemon in your lineup against the opponents active pokemon!*
![](https://raw.githubusercontent.com/chhollenbach/pokemon-showdown-enhancement-suite/main/public/demo5.jpg)

# Upcoming Features
* Add damage ranges to other battle types beyond random battles
* Add damage ranges to 2v2 and free-for-all battes
* Refine damage calculations for random battles when info is missing from PS client using known random battle sets (https://pkmn.github.io/randbats/)
* Bug fixes (if you're testing the app and see a bug or a calculation you think is wrong, feel free to create a new issue or submit a PR)

# Development
The code for the extension can be found under `./src`. Webpack is used to bundle all files into `./dest/enhancement_suite.bundle.js`. The entrypoint for Webpack is currently `./src/enhancement_suite.js`. If you have ideas for the extension or want to contribute, feel free to reach out or submit a PR!

# Thanks
* Thank you to the developers of the damage calculator (https://github.com/smogon/damage-calc) and the pokemon showdown client (https://github.com/smogon/pokemon-showdown-client). Your code rocks and inspires me to write better code
* Special thanks to the rowin1, the developer of this pokemon showdown tool tip chrome extension: https://github.com/smogon/pokemon-showdown-client. Your extension inspired me to make my own, and I consulted your setup for some of the chrome configuration files

# Change Log
### September 2021
App submitted for review in google web store. Development continues for more features/bug fixes.
Link to (unlisted) app: https://chrome.google.com/webstore/detail/pok%C3%A9mon-showdown-enhancem/lkbioopgejalagiohoodinonejedmbof

