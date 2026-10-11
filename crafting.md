---
cursor:
  subagentId: "bc-d7c1464b-9b92-54ef-a6a4-2e1a041f4f5e"
---

# Crafting

This is the one list the page implements. The land places the materials. It does not hold the recipes. A pair that is not in the alchemy list combines into nothing. Forging, fletching, cooking, and brewing are named recipes, not that pair list.

Skills start at 0: forging, fletching, alchemy, artifice, cooking, brewing. A discovery is remembered on the player, through the castle, a collapse, and a death. `skills` prints the six ranks. `known` prints the discovery names already made, or `known 0`. It does not print a pair that has not been made.

## Where

| Command | Where it works |
| --- | --- |
| `forge` | the market |
| `fletch` | the yard, squares `C5` `C6` `D5` `D6` `E5` `E6` |
| `cook` | the hearth `D7`, and an inn in a land |
| `brew` | the still `C7` `C8` `D8`, and an inn in a land |
| `combine` | anywhere |
| `break` | anywhere, on a relic in the pack |
| `eat`, `drink`, `read` | anywhere the item is in the pack |

Elsewhere the line is `The forge is in the market.`, `The yard is the place for that.`, `There is no hearth.`, or `There is no still.` If the square is occupied: `That square is taken.` Nothing is consumed on a refusal.

A missing rank prints `You cannot make that yet.` A missing ingredient or chi prints `You need 1 stock and 3 chi. You have 0 stock and 2 chi.`, naming only what is short. Chi uses the same shape as the rest of the page: `That takes N chi. You have M.`

## What is carried

Metals: ore, stock, flux, white metal, salt metal.

Woods: wood, charcoal, shaft.

Herbs: yarrow, thyme, bundle.

Creature parts: hide, fang, feather, cured hide.

Salts and waters: salt, water, brine, bitter salt, black salt, wash, grey wash.

Relic parts: ash, setting, splinter.

Made: tincture, oil, dark oil, glass, graver, string, point, arrow, bow, broth, salt meat, crumb, stew, supper, beer, draught, philter, dark beer, stone.

A relic is a book, a candle, or a housed relic. The stone is not a relic and not a shop item.

## Forging

Each of these is a discovery the first time it succeeds, and forging rises by 1.

| Command | Needs | Result |
| --- | --- | --- |
| `forge ore` | 1 ore, 2 chi | stock |
| `forge weapon` | 1 stock, 3 chi, forging at least 1 | an ordinary sword |
| `forge armor` | 1 stock, 3 chi, forging at least 1 | ordinary armor |
| `forge weapon oil` | that sword, 1 oil, 4 chi, forging at least 2, a graver in the pack | a magic keen sword |
| `forge armor oil` | that armor, 1 oil, 4 chi, forging at least 2, a graver in the pack | magic stout armor |
| `forge weapon flux` | that magic sword, 1 flux, 5 chi, forging at least 4, a graver in the pack | a rare bright sword |
| `forge armor flux` | that magic armor, 1 flux, 5 chi, forging at least 4, a graver in the pack | rare grim armor |

The graver is not consumed. Oil is consumed for a magic piece. Flux is consumed for a rare piece. The piece you are improving is consumed into the new one. Unique cannot be forged: `You cannot make that.` Stock comes from the forge or the merchant, not from `combine`.

## What a weapon does

The weapon skill is not forging. Knife, hatchet, spear, sword, and bow start at 0. The first time that weapon's basic swing lands, that skill becomes 1. It does not rise again in this list.

At 0 the weapon uses only the basic swing. At 1 it uses the full shape. The keyword is the one the fighter names on their own swing. A feint may borrow a word. Those two rules stay as already written.

| Weapon | Keyword | At 0 | At 1 |
| --- | --- | --- | --- |
| knife | `point` | the next square | the next square |
| hatchet | `cleave` | the next square | that square and the two forward diagonals |
| spear | `thrust` | the next square | that square and the one behind it |
| sword | `cut` | the next square | that square and the two forward diagonals |
| bow | `loose` | two squares, straight | four squares, straight |

A bow spends one arrow. With none: `You need an arrow.`

Armor raises bearing. Only the armor slot does. Ordinary 4, magic 6, rare 8, unique 10, none 0. A landed blow's momentum shift against the wearer is reduced by bearing, and what remains is at least half the unarmored shift, rounded down.

## Fletching

Each first success raises fletching by 1.

| Command | Needs | Result |
| --- | --- | --- |
| `fletch shaft` | 1 wood | a shaft |
| `fletch point` | 1 fang, or 1 splinter | a point |
| `fletch string` | 1 hide | a string |
| `fletch arrow` | 1 shaft, 1 feather, 1 point | 4 arrows |
| `fletch bow` | 1 shaft, 1 string, fletching at least 3 | a bow |

`combine` of fang and splinter is nothing. The point is fletched, not combined.

## Alchemy

`combine <a> <b>` takes two ingredients. Order does not matter. The same thing with itself is nothing. An unlisted pair prints `Nothing comes of that.` and consumes nothing. Chi as an ingredient spends 1 chi.

The first success of a pair raises alchemy by 1 and remembers the result. These are all the pairs that make something.

| Pair | Result |
| --- | --- |
| yarrow + water | tincture |
| tincture + chi | oil |
| wood + chi | charcoal |
| ore + salt | flux |
| water + salt | brine |
| oil + charcoal | dark oil |
| dark oil + flux | white metal |
| white metal + brine | salt metal |
| salt metal + chi | stone |
| salt + charcoal | black salt |
| ash + water | grey wash |
| brine + ash | bitter salt |
| setting + chi | glass |
| splinter + setting | graver |
| hide + salt | cured hide |
| yarrow + thyme | bundle |
| thyme + water | wash |

The stone needs alchemy of at least 6. Below that, the pair prints `Nothing comes of that.` and consumes nothing. The first time the stone is made, alchemy rises by 4, the usual 1 and 3 more. A second stone is refused: `You already carry the stone.` The stone is not consumed by that refusal.

Grey wash, glass, graver, and bitter salt also raise artifice by 1, the first time each is made.

`bind`, while the stone is carried, in a harsh land, holds the chi edit on the current cell. One bind. The stone is not consumed. A second bind prints `The stone is already bound.` No edit on the cell: `Nothing here is held by chi.` In the castle: `The castle already keeps its changes.` On the next collapse that one edit is rebuilt with the land. Other chi edits still drop. The room number does not change.

## Artifice

`break` on a book, a candle, or a housed relic in the pack yields ash, a setting, and a splinter. The first break raises artifice by 1. Later breaks do not. It is not a world edit and it does not renumber a room.

## Cooking

Food is eaten. Each first success raises cooking by 1. Cooking spends no chi.

| Command | Needs | Result | Eat |
| --- | --- | --- | --- |
| `cook broth` | 1 water, 1 thyme | broth | 25 stamina |
| `cook meat` | 1 hide, 1 salt | salt meat | 35 stamina |
| `cook crumb` | 1 yarrow, 1 salt | crumb | 15 stamina |
| `cook stew` | 1 salt meat, 1 thyme, cooking at least 1 | stew | 50 stamina |
| `cook supper` | 1 stew, 1 crumb, cooking at least 3 | supper | 70 stamina |

`eat broth`, and the same for the others. Stamina stops at 100. The food is consumed even when stamina does not rise. Eating spends the action. It does not shift momentum.

## Brewing

Potions and drinks are not the alchemy list. The same ingredients can be brewed or cooked by these commands and still combine to nothing, or to the alchemy result, only when `combine` is the command. Each first success raises brewing by 1. Brewing spends no chi.

| Command | Needs | Result | Drink |
| --- | --- | --- | --- |
| `brew draught` | 1 yarrow, 1 salt | draught | clears aggravated bleed |
| `brew beer` | 1 water, 1 thyme | beer | 10 stamina, and the next telegraph you see omits its keyword |
| `brew philter` | 1 thyme, 1 salt, brewing at least 1 | philter | for 4 ticks, incoming momentum loss is halved after bearing |
| `brew dark` | 1 beer, 1 wood, brewing at least 2 | dark beer | 20 stamina, and the next telegraph you see omits its keyword |

`drink draught` when you are not bleeding: `You are not bleeding.` The draught is not consumed. A philter's remaining loss is at least 1 when the blow would have moved you. A new beer replaces a keyword still waiting. Your own swing still takes the keyword you name.

## Books

Readable books are not relics. `read` on the chapel book prints `The book stays closed.` `read` on anything else with no page prints `There is nothing to read.`

### Folio

The archive shelf holds `folio`. `read folio` prints this page. It does not list seeds.

```
A word is what a mouth can carry. The weight under the word is the
name that does not change. Speak oak at the gate, or speak some other
word that weighs the same, and the land that opens is one land. People
trade the word. The gate keeps the weight.

Chi can rewrite a use-name. A room will answer to new words, and a
thing on a table will answer to new words. The weight does not move.
When the land is built again, it is built from the weight.

A room has a number. The number is that room's name. Walk the number
and the step can find the room. The word you prefer for it is only
how you speak. This page does not keep a list of lands.
```

### Scrap

A high shrine may hold `scrap`. `read scrap` prints this page. It names a few meetings. It is not the whole list.

```
Ore at a forge, and chi, becomes stock. Ore met with salt becomes flux.
Yarrow left in water becomes a tincture. A tincture met with chi becomes
oil. The stone is late. It drinks chi. It is not sold from a counter.
```

Mercy, when the generation rule picks a combination, prints one of these four sentences and no others: `Yarrow left in water becomes a tincture.` `A tincture met with chi becomes oil.` `Ore at a forge, and chi, becomes stock.` `Ore met with salt becomes flux.`

## Merchant

The market sells, besides the gear already priced in the generation list: stock for 12 gold, salt meat for 6, stew for 14, and 4 arrows for 8. Stabling is 10 gold, as the stable rule says. The stone, a relic, `folio`, and `scrap` are not for sale and are not bought.
