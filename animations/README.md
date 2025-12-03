# Publication Preview Animations

3Blue1Brown-style animations for publication previews using [Manim](https://www.manim.community/).

## Setup

```bash
# Install Manim
pip install manim

# Optional: Install LaTeX for math rendering
# macOS: brew install --cask mactex
# Ubuntu: sudo apt install texlive-full
```

## Generate All Animations

```bash
cd animations
python generate_all.py
```

This will generate GIFs in `public/img/publication_preview/`.

## Generate Individual Animations

```bash
# Preview (low quality, fast)
manim -pql alignment.py AlignmentAnimation

# Production (medium quality, GIF)
manim -qm --format=gif alignment.py AlignmentAnimation

# High quality (slow)
manim -qh --format=gif alignment.py AlignmentAnimation
```

## Animations

| File | Publication | Description |
|------|-------------|-------------|
| `alignment.py` | Neural-Human Alignment (NMI 2025) | DNN layers aligning with human perception dimensions |
| `dimensions.py` | Interpretable Dimensions (CCN 2023) | 3D object embedding space with semantic axes |
| `cortical.py` | Cortical Magnification (CCN 2022) | Visual field to cortex mapping |
| `similarity.py` | Perceived Similarity (BioRxiv 2024) | Objects clustering by similarity |
| `coding.py` | Coding Principles (CommPsych 2025) | Code transformation visualization |
| `curvature.py` | Perceived Curvature (2024) | Curvature features in object perception |
| `decision.py` | Decision Making (SciRep 2020) | Model-based vs model-free control |
| `motion.py` | Motion Recognition (ICMLC 2017) | View-invariant motion subspace |

## Customization

Each animation uses a consistent dark theme (`#1a1a2e` background) with the site's color palette:
- Red accent: `#ff6b6b`
- Teal: `#4ecdc4`
- Yellow: `#ffd93d`
- Green: `#96ceb4`

Edit colors in individual files to match your preferences.

## Output Settings

Default output: 720p @ 30fps GIF
- Change `-qm` to `-qh` for 1080p
- Change `-ql` for faster preview rendering
