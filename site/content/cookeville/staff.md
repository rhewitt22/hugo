---
title: Staff
pluralizelisttitles: false

js:
 - /js/staff.js
---

{{% staff2 %}}

<script id="staff-template" type="x-handlebars-template">
  {{#each .}}
  <div class="employee">
    <h3><span class="employee-name">{{ name }}</span>, <span class="employee-position">{{ position }}</span></h3>
    <p>Contact: <span class="employee-email">{{ email }}</span> <span class="employee-phone">{{ phone }}</span></p>
  </div>
  {{/each}}
</script>
