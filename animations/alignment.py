"""
Animation: Neural-Human Alignment
Abstract: Two groups of dots converging to shared positions
"""
from manim import *
import numpy as np

class AlignmentAnimation(Scene):
    def construct(self):
        self.camera.background_color = "#0f0f1a"

        np.random.seed(42)
        n_dots = 8

        # Create two groups of dots
        red_dots = VGroup()
        blue_dots = VGroup()

        # Shared target positions (middle)
        targets = [
            UP * 1.5 + LEFT * 2,
            UP * 1.5 + RIGHT * 2,
            UP * 0.5 + LEFT * 1,
            UP * 0.5 + RIGHT * 1,
            DOWN * 0.5 + LEFT * 1.5,
            DOWN * 0.5 + RIGHT * 1.5,
            DOWN * 1.5 + LEFT * 0.5,
            DOWN * 1.5 + RIGHT * 0.5,
        ]

        # Red dots start on left
        for i in range(n_dots):
            dot = Dot(color="#ff6b6b", radius=0.15)
            dot.move_to(LEFT * 5 + UP * (2 - i * 0.5))
            red_dots.add(dot)

        # Blue dots start on right
        for i in range(n_dots):
            dot = Dot(color="#4ecdc4", radius=0.15)
            dot.move_to(RIGHT * 5 + UP * (2 - i * 0.5))
            blue_dots.add(dot)

        # Labels
        red_label = Text("DNN", font_size=24, color="#ff6b6b")
        red_label.to_corner(UL, buff=0.5)
        blue_label = Text("Human", font_size=24, color="#4ecdc4")
        blue_label.to_corner(UR, buff=0.5)

        # Show initial state
        self.play(
            *[FadeIn(d, scale=0.5) for d in red_dots],
            *[FadeIn(d, scale=0.5) for d in blue_dots],
            Write(red_label), Write(blue_label),
            run_time=1
        )

        # Animate convergence
        self.play(
            *[red_dots[i].animate.move_to(targets[i]) for i in range(n_dots)],
            *[blue_dots[i].animate.move_to(targets[i]) for i in range(n_dots)],
            run_time=2,
            rate_func=smooth
        )

        # Merge into single dots
        merged = VGroup()
        for i, target in enumerate(targets):
            dot = Dot(color="#ffd93d", radius=0.18)
            dot.move_to(target)
            merged.add(dot)

        self.play(
            *[FadeOut(d) for d in red_dots],
            *[FadeOut(d) for d in blue_dots],
            *[FadeIn(d, scale=1.5) for d in merged],
            run_time=0.8
        )

        # Pulse effect
        self.play(
            *[d.animate.scale(1.3) for d in merged],
            run_time=0.3
        )
        self.play(
            *[d.animate.scale(1/1.3) for d in merged],
            run_time=0.3
        )

        self.wait(0.5)
