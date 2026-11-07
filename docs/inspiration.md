# Interactive website inspiration

Collected Nov 2026 while exploring a more interactive / 3D version of the site.
(`docs/` is ignored by 11ty, so this file is never published.)

## Realistic 3D scenes

- **Felix Rieseberg — 3D room** — https://felixrieseberg.com/?room=1
  The starting point. A photoreal room modelled in Blender (driven by Claude via
  Python), lighting baked in Cycles, shown in the browser with WebGL. Portfolio
  items are VHS tapes; the window view is a photo + depth map for parallax.
  Write-up: https://felixrieseberg.com/made-by-mechanical-means/
- **Oryzo** — https://oryzo.ai
  Product site for a cork coaster, by Lusion. Realistic product rendering with
  scroll-driven camera moves.
- **Igloo Inc.** — https://www.igloo.inc
  Icy, crystalline 3D world that you scroll through. Awwwards Site of the Year.
- **World Labs** — https://www.worldlabs.ai
  AI-generated explorable 3D worlds (Marble), rendered as Gaussian splats.

## Playful 3D worlds

- **Bruno Simon** — https://bruno-simon.com
  Drive a little car around a 3D world to find his projects. Rebuilt for
  WebGPU in 2025; code is open (MIT): https://github.com/brunosimon/folio-2025
  Case study: https://www.awwwards.com/brunos-portfolio-case-study.html
- **Messenger** — https://messenger.abeto.co
  A tiny planet you walk around as a messenger; soft, illustrated 3D.
- **Henry Heffernan** — https://henryheffernan.com
  A 3D desk with a retro computer; the portfolio runs on the computer screen.
- **Jesse Zhou** — https://jesse-zhou.com
  A stylised 3D ramen shop as a portfolio.
- **Where Worlds Take Shape** — https://www.awwwards.com/sites/where-worlds-take-shape
  Awwwards Site of the Day (May 2026): the portfolio as a playable WebGL world.

## Abstract / atmospheric 3D (studios)

- **Lusion** — https://lusion.co
  Creative studio (Bristol) that builds sites like Oryzo. Not a tool: they
  hand-build everything with three.js/WebGL and their own pipeline.
- **Active Theory** — https://activetheory.net
  Studio; immersive WebGL experiences, their own engine.
- **Unseen Studio** — https://unseen.co
  Studio; e.g. BlueYard project https://unseen.co/projects/blue-yard/

## Quiet sites with small, precise interactions

- **Rauno Freiberg** — https://rauno.me
  Minimal, with carefully crafted micro-interactions.
- **Emil Kowalski** — https://emilkowal.ski
  Plain text page; the craft is in animation details.

## Interactive explanation / science

- **Distill — Feature Visualization** — https://distill.pub/2017/feature-visualization/
  Interactive ML research article; how neural networks build up their
  understanding of images.
- **The Pudding** — https://pudding.cool
  Visual, scroll-driven data essays.
- **neal.fun** — https://neal.fun
  Small playful interactive web toys.

## Case studies and how-tos

- Codrops — Blender to Three.js and back, 10 tips (Aug 2026):
  https://tympanus.net/codrops/2026/08/24/blender-to-three-js-and-back-10-tips-for-a-better-workflow
  (bake pipeline: shared texture per collection → bake → denoise → unlit
  material in three.js; Blender 5.2 export compression)
- Codrops 2026 case studies (scroll-driven 3D sites: Shader Development Studio,
  Dash, "More Than a Portfolio", Ten Years Away):
  https://tympanus.net/codrops/2026/09/ and https://tympanus.net/codrops/2026/07/
- Spark — Gaussian splat renderer for three.js: https://github.com/sparkjsdev/spark
  (docs https://sparkjs.dev/docs/overview/)
- three.js native splat renderer (r186):
  https://radiancefields.com/three.js-merges-a-native-gaussian-splat-renderer-for-webgpu-in-r186
- World Labs Marble (image/text → 3D world, splat export):
  https://invideo.io/blog/world-labs-marble-3d-worlds/
- Blender MCP (Claude drives Blender):
  https://lushbinary.com/blog/claude-blender-mcp-connector-3d-modeling-guide/
- Open-source image-to-3D models (TRELLIS.2, Hunyuan3D):
  https://www.cmarix.com/blog/top-open-source-ai-models-for-3d-image-generation/

## Tooling these sites typically use

three.js (WebGL / WebGPU with TSL shaders), GSAP for scroll animation,
Blender for modelling and baked lighting, glTF/GLB with compression,
sometimes Rapier (physics) and Howler (audio).
