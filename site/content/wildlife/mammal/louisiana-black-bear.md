---
title: Louisiana Black Bear
type: species-profile

scientific: Ursus americanus luteolus
ecos: AO8F
taxon: mammal

hero: bears

categories:
 - species profile

tags:
 - louisiana

js:
 - '/js/species-profile.js'
---

The Louisiana black bear is the state mammal for Louisiana, and it is one of 16 subspecies of the American black bear. Compared to other black bears, the Louisiana black bearâ€™s skull is longer, narrower and flatter, with larger molar teeth.

Since 1980, more than 80 percent of the Louisiana black bearâ€™s habitat had been modified or destroyed, and on January 7, 1992, the bear was listed as threatened within its historic range.

However, due to successful conservation efforts by the Service and our partners, Louisiana black bear populations have recovered and the species was proposed for delisting on May 20, 2015 - insert correct date.

The public comment period on our proposal to delist is currently open. Visit link to FedReg notice when published to provide your input, or mail your comments to snail mail info by date.

### Appearance

The black bear is a large, bulky animal with long black hair and a short, well-haired tail. Their weight can vary considerably, but males may weigh more than 600 pounds. The face is blunt, the eyes small, and the nose pad broad with large nostrils. The muzzle is a yellowish-brown with a white patch sometimes present on the lower throat and chest. Black bears have five toes with short, curved claws on the front and back feet.

### Habitat

The key habitat requirements are food, water, cover, and denning sites located across large, relatively remote blocks of lands. In the Southeast, remoteness is relative to forest size and the presence of roads, as these features reflect the likelihood of human disturbance. In general, the bigger the forest and the fewer the roads, the better the habitat is for bears.

Louisiana black bears typically live in bottomland hardwood forest communities. They den in trees or on the ground from December through April. Other habitat types include brackish and freshwater marshes, salt domes, wooded spoil levees along canals and bayous, and agricultural fields.

High quality cover for bedding, denning, and escape is of great importance as forests become smaller, more fragmented, and as human encroachment and disturbance in bear habitat increases.

### Diet

Although they are classified as carnivores (meat-eaters), black bears are opportunistic (eaters of plants and animals) omnivores since their diet is largely determined by food availability. The most readily available natural diet of black bears tends to be high in carbohydrates and low in fat or protein, although they prefer high fat and high protein foods when they can get it. This often comes in the form of the food and garbage of humans.

Invertebrate animals like snails and insects are likely the most commonly eaten form of animal, although and dead animals like roadkill are also consumed.

Black bears spend a lot of their time foraging for food, and the type of plant food eaten largely depends upon the seasons. In the spring and summer black bears may eat dewberries, blackberries, wild grapes, elderberries, persimmon, pawpaw, pokeweed, devils walking stick, thistle, palmetto, and a variety of fruited vines and soft mast producing shrubs. In the fall they eat acorns, pecans, corn, oats, and wheat, and some bears in southern coastal Louisiana have been documented visiting sugar cane fields.

### Historic Range

The American black bear was formerly widespread in North America, from northern Alaska, and northern Canada, including Newfoundland; south to central northern Mexico (Lowery 1974).

The Louisiana black bear once roamed throughout southern Mississippi, all of Louisiana, and eastern Texas. The historic range included all Texas counties east of and including Cass, Marion, Harrison, Upshur, Rusk, Cherokee, Anderson, Leon, Robertson, Burleson, Washington, Lavaca, Victoria, Refugio, and Arkansas; all of Louisiana, and the southern Mississippi counties south of and including Washington, Humphreys, Holmes, Attala, Neshoba, and Lauderdale (Hall 1981). While Hall included the southernmost counties in Arkansas as part of the range, there were no Arkansas specimens to support doing so. Accordingly, Arkansas is not considered as part of the historic range.

### Challenges

Bears can die due to both natural and human causes. Natural causes include disease, cannibalism, drowning, maternal care, and climbing accidents. Human causes generally include habitat destruction, hunting, trapping, poaching, vehicle and train collisions, electrocution, depredation/nuisance kills, disturbance (which causes den abandonment), and accidents associated with research activities. Some farming activities may also cause bear deaths.

Habitat loss, especially the conversion of forests to croplands, is the biggest threat to the Louisiana black bear.

Roads split up bear habitat and may cause vehicle collisions, increase human contact, decrease habitat use, or restrict bears' movement to other areas.

In Louisiana and Mississippi, the most significant mortality factors are poaching and road kills. Since 1988, at least 21 Louisiana black bears are known to have died directly from human-related causes. The most important natural factor regulating black bear populations appears to be variation in food supply.

### Efforts Contributing to Conservation

Recovery efforts undertaken since the listing of the Louisiana black bear have included:

 - Public involvement through non-profits such as the Black Bear Conservation Committee (BBCC)
 - Federal and state actions taken as a result of the Endangered Species Act and the Wetlands Reserve Program of the 1990 Farm Act, and
 - Research funded by the Fish and Wildlife Service and our partners
 - Proactive forest management by private landowners - Deltic Farm & Timber, Inc., a large private land holding company in northeast Louisiana, was recognized by the Black Bear Conservation Committee as a landowner or individual contributing significantly toward the enhancement and restoration of the Louisiana black bear. Deltic owns and manages bottomland hardwood forests in Madison and East Carroll Parishes. Management through careful timber harvests, reforestation of marginal agricultural land, rigid protection, and a tolerant attitude toward the occasional depredation of the company's agricultural crops by bears has helped in the conservation and recovery of the bear. In addition, Deltic has cooperated with bear research personnel.

### National Wildlife Refuges

The following Southeastern National wildlife Refuges provide habitat:

  - Atchafalaya National Wildlife Refuge
  - Bayou Cocodrie National Wildlife Refuge
  - Bayou Teche National Wildlife Refuge
  - Cat Island National Wildlife Refuge
  - Central Louisiana Refuges Complex
  - Coldwater River National Wildlife Refuge
  - Grand Cote National Wildlife Refuge
  - Panther Swamp National Wildlife Refuge
  - St. Catherine Creek National Wildlife Refuge
  - Tensas River National Wildlife Refuge
  - Theodore Roosevelt National Wildlife Refuges Complex

<!-- We're using Handlesbars.js to template the response we get from the Federal Register API -->
<script id="register-template" type="x-handlebars-template">
  {{#each .}}
  <li class="fws-register-item">
    <h3>{{ type }}</h3>
    <h3><a href="{{ html_url }}">{{ title }}</a></h3>
    <p class="publication-date">{{ publication_date }}</p>
    <p>{{ abstract }}</p>
    <p><a href="{{ html_url }}">Read Full {{ type }}...</a><br>
    <a href="{{ pdf_url }}" target="_blank">Download {{ type }}</a></p>
  </li>
  {{/each}}
</script>