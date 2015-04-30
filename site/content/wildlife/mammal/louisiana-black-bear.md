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

handlebars: true
---

### Southeastern Wildlife Refuges That Provide Habitat:
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
  {{#each results}}
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