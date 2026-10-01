---
layout: project.njk
permalink: /projects/representational-alignment/
title: "Dimensions underlying the representational alignment of deep neural networks with humans"
authors:
  - { name: "Florian P. Mahner", equal: true, self: true }
  - { name: "Lukas Muttenthaler", equal: true }
  - { name: "Umut Güçlü" }
  - { name: "Martin N. Hebart" }
venue: "Nature Machine Intelligence"
year: 2025
tldr: "Comparing humans and deep nets via the latent dimensions that drive their behaviour. The same task — same data — yet humans organise objects by what they are, while networks organise them by what they look like."
links:
  html: "https://www.nature.com/articles/s42256-025-01041-7"
  pdf: "https://www.nature.com/articles/s42256-025-01041-7.pdf"
  arxiv: "https://arxiv.org/abs/2406.19087"
bibtex: |
  @article{mahner2025dimensions,
    title   = {Dimensions underlying the representational alignment of deep neural networks with humans},
    author  = {Mahner, Florian P. and Muttenthaler, Lukas and G\"u\c{c}l\"u, Umut and Hebart, Martin N.},
    journal = {Nature Machine Intelligence},
    volume  = {7},
    pages   = {848--859},
    year    = {2025},
    doi     = {10.1038/s42256-025-01041-7}
  }
---

<p class="project-tldr">Comparing humans and deep nets via the latent dimensions that drive their behaviour. The same task — same data — yet humans organise objects by what they <em>are</em>, while networks organise them by what they <em>look like</em>.</p>

<figure class="project-figure project-figure-hero">
  <img src="/projects/representational-alignment/fig1.png" alt="Framework overview: parallel pipelines for humans and DNNs through a triplet odd-one-out task to recover latent dimensions, then compared dimension-by-dimension." loading="eager">
  <figcaption>The framework. Humans and a deep network make the same odd-one-out judgements over thousands of natural images. From these behavioural responses we recover a low-dimensional representation for each system — and then we can compare them, dimension by dimension.</figcaption>
</figure>

<section class="project-section">
  <div class="section-label"><span class="section-name">The Question</span><hr class="section-rule"></div>
  <p class="project-lead">Two systems can score the same on a benchmark and still represent the world differently. We wanted to know <em>how</em>.</p>
  <figure class="project-figure">
    <img src="/projects/representational-alignment/fig2.png" alt="Recovered dimensions for humans and DNN side by side, with example images that score most strongly on each dimension." loading="lazy">
    <figcaption>Each row is one recovered dimension. The images that load most strongly on it tell you what that dimension <em>means</em> to that system.</figcaption>
  </figure>
</section>

<section class="project-section">
  <div class="section-label"><span class="section-name">The Approach</span><hr class="section-rule"></div>
  <p class="project-lead">A common embedding from a common task. No model surgery, no probes — only the behaviour.</p>
  <figure class="project-figure">
    <img src="/projects/representational-alignment/fig3.png" alt="Pairwise alignment between human and DNN dimensions, with semantic ones in cool tones and visual ones in warm tones." loading="lazy">
    <figcaption>Mapping each network dimension to its closest human counterpart. Some line up tightly. Others have no match at all.</figcaption>
  </figure>
</section>

<section class="project-section">
  <div class="section-label"><span class="section-name">What We Found</span><hr class="section-rule"></div>
  <p class="project-lead">Networks lean visual; humans lean semantic. The match is good in the middle and breaks down at the edges — and the breakdown is principled, not noise.</p>
  <figure class="project-figure">
    <img src="/projects/representational-alignment/fig4.png" alt="Distribution of dimensions across visual versus semantic axes for humans and the DNN, showing the network's bias toward visual properties." loading="lazy">
    <figcaption>Where each system's dimensions sit on the visual–semantic axis. Humans spread across both. The network clusters on the visual side.</figcaption>
  </figure>
</section>
