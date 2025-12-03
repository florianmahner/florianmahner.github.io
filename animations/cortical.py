"""
Animation: Cortical Magnification
Abstract: Dots expanding from center with varying density (center magnified)
"""
from manim import *
import numpy as np

class CorticalAnimation(Scene):
    def construct(self):
        self.camera.background_color = "#0f0f1a"

        # Create concentric rings of dots
        center_dot = Dot(ORIGIN, color="#ff6b6b", radius=0.2)

        rings = VGroup()
        ring_radii = [0.8, 1.6, 2.4, 3.2]
        dots_per_ring = [8, 12, 16, 20]
        colors = ["#ff8c42", "#ffd93d", "#4ecdc4", "#96ceb4"]

        all_dots = VGroup()

        for r, n, color in zip(ring_radii, dots_per_ring, colors):
            ring = VGroup()
            for i in range(n):
                angle = 2 * PI * i / n
                dot = Dot(
                    point=[r * np.cos(angle), r * np.sin(angle), 0],
                    color=color,
                    radius=0.08
                )
                ring.add(dot)
            rings.add(ring)
            all_dots.add(*ring)

        # Labels
        center_label = Text("Fovea", font_size=18, color="#ff6b6b")
        center_label.next_to(center_dot, DOWN, buff=0.3)

        periph_label = Text("Periphery", font_size=18, color="#96ceb4")
        periph_label.to_edge(RIGHT, buff=0.5)

        # Animate
        self.play(FadeIn(center_dot, scale=2), run_time=0.5)
        self.play(Write(center_label), run_time=0.5)

        # Expand rings outward
        for ring in rings:
            self.play(
                *[FadeIn(d, scale=0.5) for d in ring],
                run_time=0.4
            )

        self.play(Write(periph_label), run_time=0.5)

        # Magnification effect - center expands more
        self.play(
            center_dot.animate.scale(2),
            rings[0].animate.scale(1.5),
            rings[1].animate.scale(1.3),
            rings[2].animate.scale(1.1),
            rings[3].animate.scale(0.9),
            run_time=1.5,
            rate_func=smooth
        )

        # Pulse from center
        pulse = Circle(radius=0.1, color="#ff6b6b", fill_opacity=0.5)
        pulse.move_to(ORIGIN)

        self.play(
            pulse.animate.scale(40).set_opacity(0),
            run_time=1.5,
            rate_func=linear
        )

        self.wait(0.5)
