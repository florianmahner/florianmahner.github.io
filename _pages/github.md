---
layout: page
permalink: /open_source/
title: open source
nav: true
nav_order: 2
---

I try to make my code as open as possible and contribute to other open source projects. Here is a list of some of the projects I have worked on:

{% if site.data.repositories.github_repos %}

<div class="repositories d-flex flex-wrap flex-md-row flex-column justify-content-between align-items-center">
  {% for repo in site.data.repositories.github_repos %}
    {% include repository/repo.liquid repository=repo %}
  {% endfor %}
</div>
{% endif %}