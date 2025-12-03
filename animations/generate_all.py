#!/usr/bin/env python3
"""
Generate all publication preview animations as GIFs
Run: python generate_all.py

Requires: pip install manim
"""
import subprocess
import os
from pathlib import Path

# Animation files and their output names
ANIMATIONS = [
    ("alignment.py", "AlignmentAnimation", "alignment.gif"),
    ("dimensions.py", "DimensionsAnimation", "dimensions.gif"),
    ("cortical.py", "CorticalAnimation", "cortical.gif"),
    ("similarity.py", "SimilarityAnimation", "similarity.gif"),
    ("coding.py", "CodingAnimation", "coding.gif"),
    ("curvature.py", "CurvatureAnimation", "curvature.gif"),
    ("decision.py", "DecisionAnimation", "decision.gif"),
    ("motion.py", "MotionAnimation", "motion.gif"),
]

OUTPUT_DIR = Path(__file__).parent.parent / "public" / "img" / "publication_preview"

def generate_animation(script_name, scene_name, output_name):
    """Generate a single animation as GIF"""
    print(f"Generating {output_name}...")

    # Run manim to generate the animation
    cmd = [
        "manim",
        "-qm",  # Medium quality
        "--format=gif",
        "-o", output_name,
        script_name,
        scene_name,
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=Path(__file__).parent)
        if result.returncode == 0:
            print(f"  ✓ Generated {output_name}")

            # Move to output directory
            generated_path = Path(__file__).parent / "media" / "videos" / script_name.replace(".py", "") / "720p30" / output_name
            if generated_path.exists():
                OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
                dest_path = OUTPUT_DIR / output_name
                import shutil
                shutil.move(str(generated_path), str(dest_path))
                print(f"  ✓ Moved to {dest_path}")
        else:
            print(f"  ✗ Failed: {result.stderr}")
    except FileNotFoundError:
        print(f"  ✗ manim not found. Install with: pip install manim")


def main():
    print("=" * 50)
    print("Generating Publication Preview Animations")
    print("=" * 50)
    print()

    for script, scene, output in ANIMATIONS:
        generate_animation(script, scene, output)

    print()
    print("=" * 50)
    print("Done! Check public/img/publication_preview/")
    print("=" * 50)


if __name__ == "__main__":
    main()
