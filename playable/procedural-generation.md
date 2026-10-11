---
cursor:
  subagentId: "bc-feddd0a1-efff-56e9-a4c5-acd684f0039a"
---

# Procedural generation

## Premise

The lands are in stasis. The castle is outside it. The cause can be learned. The seal cannot be broken.

## Gate book

The closed book has exactly 888 words, indexes `0` through `887`. The playable page reads one fenced block tagged `book` whose body is only those words, lowercase, separated by spaces, with no other characters inside the fence.

### Gate words (indexes 0–8)

The gate is damaged. These nine words are already set in it. They are the first nine of the book:

| Index | Word | Threat | Settlement | Forage | Residue | Place |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 0 | oak | 0.6268 | 0.1341 | 0.4654 | 0.7674 | water |
| 1 | ash | 0.5957 | 0.0993 | 0.2532 | 0.6307 | chapel |
| 2 | bell | 0.8234 | 0.0648 | 0.2826 | 0.6203 | water |
| 3 | vessel | 0.6275 | 0.1202 | 0.9095 | 0.7577 | wood |
| 4 | night | 0.4199 | 0.1131 | 0.7251 | 0.2211 | chapel |
| 5 | thorn | 0.5435 | 0.1709 | 0.9156 | 0.2847 | wood |
| 6 | salt | 0.2012 | 0.3971 | 0.1614 | 0.9952 | ruin |
| 7 | mire | 0.1083 | 0.2302 | 0.7954 | 0.7987 | hill |
| 8 | ruin | 0.5497 | 0.6012 | 0.5782 | 0.5958 | water |

One of these words opens a realm. Two or three of them open one realm. The other words of the 888 are not known yet. A word set into the gate later can be spoken the same way.

### Leans on each word

Each index `i` from 0 through 887 has four field leans in `[0, 1]` and one place in `water`, `wood`, `chapel`, `ruin`, `road`, `hill`.

```
unit(i, fieldId) = hash32(i, 10, fieldId, 0, 0) / 4294967296
threatLean(i)     = unit(i, 1)
settlementLean(i) = unit(i, 2)
forageLean(i)     = unit(i, 3)
residueLean(i)    = unit(i, 4)
placeLean(i)      = PLACES[floor(unit(i, 5) * 6)]
```

`PLACES` is `water`, `wood`, `chapel`, `ruin`, `road`, `hill` in that order. `hash32` is the lattice hash below with the seed set to the index `i`, not the land weight. The nine rows above are that formula at indexes 0 through 8.

### Speaking a land

One word the gate holds opens a realm. Two or three distinct words open one realm whose outcome is related to every word spoken. Order does not matter. `bell chapel` and `chapel bell` are the same land. A repeated word counts once, so `oak oak` is the same realm as `oak`. Four words do nothing: `The gate is silent.` A word the gate does not hold does nothing.

This is not an ordered triple, and the weight is not `i * 788544 + j * 888 + k`. Sort the distinct indexes so `a < b < c`, and omit any index that was not spoken. All divisions below are exact integer divisions. Each spoken set has one weight.

```
C(n, 2) = n * (n - 1) / 2
C(n, 3) = n * (n - 1) * (n - 2) / 6
```

| Spoken set | Weight `W` |
| --- | --- |
| `a` | `W = a` |
| `a < b` | `W = 888 + a * (1775 - a) / 2 + (b - a - 1)` |
| `a < b < c` | `m = 887 - a`, `p = b - a - 1`, `q = c - a - 1`, then `W = 888 + C(888, 2) + (C(888, 3) - C(888 - a, 3)) + p * (2 * m - 1 - p) / 2 + (q - p - 1)` |

Print `W` as nine digits. `oak` weighs `000000000`. `oak ash` and `ash oak` both weigh `000000888`. `oak ash bell` weighs `000394716`. Indexes 885, 886, and 887 weigh `116705251`. The weight names that set. It is not mixed into the fields.

### Fields

A combination averages the leans. For a spoken set of size `n`:

```
threat      = (sum of threatLean) / n
settlement  = (sum of settlementLean) / n
forage      = (sum of forageLean) / n
residue     = (sum of residueLean) / n
```

The land is generated from that blend. One word uses its own leans and its own place. Two or three words use the average, and every place that was spoken is in the land, beside the others. `bell` leans water and `ash` leans chapel, so `bell ash` is wet ground with a chapel in it: a wet sacred place. `ash bell` is that same land. The map is not a hash of the weight.

Mist, below, is the only later change to the four numbers, and only where `edge < 2`. `oak` alone is the first row of the table. `oak` and `ash` average to threat `0.6113`, settlement `0.1167`, forage `0.3593`, residue `0.6991`.

### Piece of a land

A land holds one piece: a word the gate does not hold, found in the realm those words opened. Among the indexes the gate does not hold, pick the one with the smallest `hash32(W, 11, 1, p, 0)`. Ties keep the lower index. The cell is:

```
px = hash32(W, 11, 2, 0, 0) mod 96
py = hash32(W, 11, 2, 0, 1) mod 96
```

`search` on that cell prints `You find the word <piece>.` and you carry it home. In the court, `set` puts that word into the gate. It stays. A collapse does not unset it.

Rebuilding the gate does not end the stasis.

## Grid

A generated land is **96** columns by **96** rows (`x` east, `y` south, northwest origin). A cell is **100 yards** on a side (~5.5 miles across). The castle is not this grid.

```
edge(x, y) = min(x, y, 95 − x, 95 − y)
```

Mist is every cell with `edge < 2`. There is no second overworld map.

### Room numbers

```
room(x, y) = 10000 + y × 96 + x
```

Castle rooms keep their fixed numbers (court `101`, and so on). `look` prints `room N` after the place line. The same coordinates always give the same number in every land.

### Finds while wandering

A wander meets a find about every 12 to 20 cells. Finds stay at least 12 apart and about one per 16 cells of open ground.

## Lattice hash

`hash32(seed, fieldId, octaveNumber, ix, iy)` is uint32:

```
h = seed
h = (h xor fieldId) * 2246822507
h = (h xor octaveNumber) * 3266489917
h = (h xor ix) * 668265263
h = (h xor iy) * 374761393
h = (h xor (h >>> 16)) * 2146121005
h = (h xor (h >>> 15)) * 2221713035
h = (h xor (h >>> 16))
```

All multiplies are uint32. Field ids: threat `1`, settlement `2`, forage `3`, residue `4`, word leans `10`, piece `11`, events `15`. Room numbers do not use the hash.

## Four fields

Each field is in `[0, 1]`. **Threat** drives combat and monsters. **Settlement** is where people live. **Forage** is wild takeable goods. **Residue** is rot and memory under a fair label. The numbers are the averaged leans of the words that opened the land, then mist on the outer band. Each spoken place is present: water is wet ground, chapel is a chapel, and water beside chapel is a wet sacred place.

### Mist band

For `edge < 2`, settlement is multiplied by `(1 − 0.90 × u)` and threat is raised toward `0.68` with `u = (2 − edge) / 2`.

### Village, hill, road spine

The spine stays: three villages, one hill, and the roads between them. Guest, post, and fairest attach to those three villages. Fairest is where `portal` stands you. Village cells have `edge ≥ 12` and stand at least 20 apart. The hill is one cell. Road cells keep threat at or below `0.32`. A find is not a village and not the hill.

## Hub

The hub is the pacified sky castle. `portal` and `set` work in the **court** only. From a land, `portal` prints `The gate is in the castle.` `hub` returns to the court; an empty land collapses unless a chi stain holds it open. Lands beyond the gate are PvP.

## Closed word list

```book
oak ash bell vessel night thorn salt mire ruin bar black brack briar cairn cinder crypt dark dell dusk ember fen fell gloom gray grim grist harrow heath hill hollow ichor iron juniper keen knell lantern loam marrow mist moss nettle omen pall peat quill raven reven road rune scree shade shroud stone tallow tarn vale veil wick wild wold wood wraith yew amber anvil bane bleak bound breach brood chill clasp cloven crown dread drift drown elegy fable fallow frost gale gallows ghost glen grave greed grief grove hag haze hoar hound knave lament leech lurk moor moth murk nave noose pyre rift rot rust scar scorn serf shale shear silt slate smoke soot spell spine stain stake stark sting storm straw swale tide tomb torch track trail twine umber vane vault verge vile vine wail wake warp weald weir wharf whet whorl wight wilt wisp wound wrack ashash ashbar ashbell ashblack ashbrack ashbriar ashcairn ashcinder ashcrypt ashdark ashdell ashdusk ashember ashfen ashfell ashgloom ashgray ashgrim ashgrist ashharrow ashheath ashhill ashhollow ashichor ashiron ashjuniper ashkeen ashknell ashlantern ashloam ashmarrow ashmist ashmoss ashmire ashnettle ashnight ashomen ashpall ashpeat ashquill ashraven ashreven ashroad ashrune ashsalt ashscree ashshade ashshroud ashstone ashtallow ashtarn ashthorn ashvale ashveil ashwick ashwild ashwold ashwood ashwraith ashyew ashamber ashanvil ashbane ashbleak ashbound ashbreach ashbrood ashchill ashclasp ashcloven ashcrown ashdread ashdrift ashdrown ashelegy ashfable ashfallow ashfrost ashgale ashgallows ashghost ashglen ashgrave ashgreed ashgrief ashgrove ashhag ashhaze ashhoar ashhound ashknave ashlament ashleech ashlurk ashmoor ashmoth ashmurk ashnave ashnoose ashpyre ashrift ashrot ashruin ashrust ashscar ashscorn ashserf ashshale ashshear ashsilt ashslate ashsmoke ashsoot ashspell ashspine ashstain ashstake ashstark ashsting ashstorm ashstraw ashswale ashtide ashtomb ashtorch ashtrack ashtrail ashtwine ashumber ashvane ashvault ashverge ashvessel ashvile ashvine ashwail ashwake ashwarp ashweald ashweir ashwharf ashwhet ashwhorl ashwight ashwilt ashwisp ashwound ashwrack barash barbar barbell barblack barbrack barbriar barcairn barcinder barcrypt bardark bardell bardusk barember barfen barfell bargloom bargray bargrim bargrist barharrow barheath barhill barhollow barichor bariron barjuniper barkeen barknell barlantern barloam barmarrow barmist barmoss barmire barnettle barnight baromen barpall barpeat barquill barraven barreven barroad barrune barsalt barscree barshade barshroud barstone bartallow bartarn barthorn barvale barveil barwick barwild barwold barwood barwraith baryew baramber baranvil barbane barbleak barbound barbreach barbrood barchill barclasp barcloven barcrown bardread bardrift bardrown barelegy barfable barfallow barfrost bargale bargallows barghost barglen bargrave bargreed bargrief bargrove barhag barhaze barhoar barhound barknave barlament barleech barlurk barmoor barmoth barmurk barnave barnoose barpyre barrift barrot barruin barrust barscar barscorn barserf barshale barshear barsilt barslate barsmoke barsoot barspell barspine barstain barstake barstark barsting barstorm barstraw barswale bartide bartomb bartorch bartrack bartrail bartwine barumber barvane barvault barverge barvessel barvile barvine barwail barwake barwarp barweald barweir barwharf barwhet barwhorl barwight barwilt barwisp barwound barwrack bellash bellbar bellbell bellblack bellbrack bellbriar bellcairn bellcinder bellcrypt belldark belldell belldusk bellember bellfen bellfell bellgloom bellgray bellgrim bellgrist bellharrow bellheath bellhill bellhollow bellichor belliron belljuniper bellkeen bellknell belllantern bellloam bellmarrow bellmist bellmoss bellmire bellnettle bellnight bellomen bellpall bellpeat bellquill bellraven bellreven bellroad bellrune bellsalt bellscree bellshade bellshroud bellstone belltallow belltarn bellthorn bellvale bellveil bellwick bellwild bellwold bellwood bellwraith bellyew bellamber bellanvil bellbane bellbleak bellbound bellbreach bellbrood bellchill bellclasp bellcloven bellcrown belldread belldrift belldrown bellelegy bellfable bellfallow bellfrost bellgale bellgallows bellghost bellglen bellgrave bellgreed bellgrief bellgrove bellhag bellhaze bellhoar bellhound bellknave belllament bellleech belllurk bellmoor bellmoth bellmurk bellnave bellnoose bellpyre bellrift bellrot bellruin bellrust bellscar bellscorn bellserf bellshale bellshear bellsilt bellslate bellsmoke bellsoot bellspell bellspine bellstain bellstake bellstark bellsting bellstorm bellstraw bellswale belltide belltomb belltorch belltrack belltrail belltwine bellumber bellvane bellvault bellverge bellvessel bellvile bellvine bellwail bellwake bellwarp bellweald bellweir bellwharf bellwhet bellwhorl bellwight bellwilt bellwisp bellwound bellwrack blackash blackbar blackbell blackblack blackbrack blackbriar blackcairn blackcinder blackcrypt blackdark blackdell blackdusk blackember blackfen blackfell blackgloom blackgray blackgrim blackgrist blackharrow blackheath blackhill blackhollow blackichor blackiron blackjuniper blackkeen blackknell blacklantern blackloam blackmarrow blackmist blackmoss blackmire blacknettle blacknight blackomen blackpall blackpeat blackquill blackraven blackreven blackroad blackrune blacksalt blackscree blackshade blackshroud blackstone blacktallow blacktarn blackthorn blackvale blackveil blackwick blackwild blackwold blackwood blackwraith blackyew blackamber blackanvil blackbane blackbleak blackbound blackbreach blackbrood blackchill blackclasp blackcloven blackcrown blackdread blackdrift blackdrown blackelegy blackfable blackfallow blackfrost blackgale blackgallows blackghost blackglen blackgrave blackgreed blackgrief blackgrove blackhag blackhaze blackhoar blackhound blackknave blacklament blackleech blacklurk blackmoor blackmoth blackmurk blacknave blacknoose blackpyre blackrift blackrot blackruin blackrust blackscar blackscorn blackserf blackshale blackshear blacksilt blackslate blacksmoke blacksoot blackspell blackspine blackstain blackstake blackstark blacksting blackstorm blackstraw blackswale blacktide blacktomb blacktorch blacktrack blacktrail blacktwine blackumber blackvane blackvault blackverge blackvessel blackvile blackvine blackwail blackwake blackwarp blackweald blackweir blackwharf blackwhet blackwhorl blackwight blackwilt blackwisp blackwound blackwrack brackash brackbar brackbell brackblack brackbrack brackbriar brackcairn brackcinder brackcrypt brackdark brackdell brackdusk brackember brackfen brackfell brackgloom brackgray brackgrim brackgrist brackharrow brackheath brackhill brackhollow brackichor brackiron brackjuniper brackkeen brackknell bracklantern brackloam brackmarrow brackmist brackmoss brackmire bracknettle bracknight brackomen brackpall brackpeat brackquill brackraven brackreven brackroad brackrune bracksalt brackscree brackshade brackshroud brackstone bracktallow bracktarn brackthorn brackvale brackveil brackwick brackwild brackwold brackwood brackwraith brackyew brackamber brackanvil brackbane brackbleak brackbound brackbreach brackbrood brackchill brackclasp brackcloven brackcrown brackdread brackdrift brackdrown brackelegy brackfable brackfallow brackfrost brackgale brackgallows brackghost brackglen brackgrave brackgreed brackgrief brackgrove brackhag brackhaze brackhoar brackhound brackknave bracklament brackleech bracklurk brackmoor brackmoth brackmurk bracknave bracknoose brackpyre brackrift brackrot brackruin brackrust brackscar brackscorn brackserf brackshale brackshear bracksilt brackslate bracksmoke bracksoot brackspell brackspine brackstain brackstake brackstark bracksting brackstorm brackstraw brackswale bracktide bracktomb bracktorch bracktrack bracktrail bracktwine brackumber brackvane brackvault brackverge brackvessel brackvile brackvine brackwail brackwake brackwarp brackweald brackweir brackwharf brackwhet brackwhorl brackwight brackwilt brackwisp brackwound
```
