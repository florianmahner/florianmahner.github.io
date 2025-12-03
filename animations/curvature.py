"""
Animation: Perceived Curvature
Abstract: Shape morphing from angular to smooth
"""
from manim import *
from manim.utils.color import ManimColor
import numpy as np

class CurvatureAnimation(Scene):
    def construct(self):
        self.camera.background_color = "#0f0f1a"

        # Create shapes with varying curvature
        # Angular (low curvature)
        angular = RegularPolygon(n=6, color="#ff6b6b", fill_opacity=0.6)
        angular.scale(1.2)
        angular.move_to(LEFT * 4)

        # Medium curvature
        medium = RoundedRectangle(
            width=2.4, height=2.4,
            corner_radius=0.4,
            color="#ffd93d",
            fill_opacity=0.6
        )
        medium.move_to(ORIGIN)

        # Smooth (high curvature)
        smooth = Circle(radius=1.2, color="#4ecdc4", fill_opacity=0.6)
        smooth.move_to(RIGHT * 4)

        # Labels
        low_label = Text("Low", font_size=18, color="#ff6b6b")
        low_label.next_to(angular, DOWN, buff=0.5)

        med_label = Text("Medium", font_size=18, color="#ffd93d")
        med_label.next_to(medium, DOWN, buff=0.5)

        high_label = Text("High", font_size=18, color="#4ecdc4")
        high_label.next_to(smooth, DOWN, buff=0.5)

        title = Text("Curvature", font_size=28, color=WHITE)
        title.to_edge(UP, buff=0.5)

        # Spectrum bar
        spectrum = VGroup()
        for i in range(20):
            rect = Rectangle(
                width=0.35,
                height=0.4,
                fill_color=interpolate_color(
                    ManimColor("#ff6b6b"),
                    ManimColor("#4ecdc4"),
                    i / 19
                ),
                fill_opacity=0.8,
                stroke_width=0
            )
            rect.move_to(DOWN * 2.5 + LEFT * 3.5 + RIGHT * i * 0.37)
            spectrum.add(rect)

        # Animate
        self.play(Write(title), run_time=0.5)

        # Draw shapes morphing
        # Start with angular, morph through stages
        shape = angular.copy()
        self.play(Create(shape), Write(low_label), run_time=1)

        # Morph to medium
        self.play(
            Transform(shape, medium),
            low_label.animate.set_opacity(0.3),
            run_time=1.5
        )
        self.play(Write(med_label), run_time=0.3)

        # Morph to smooth
        self.play(
            Transform(shape, smooth),
            med_label.animate.set_opacity(0.3),
            run_time=1.5
        )
        self.play(Write(high_label), run_time=0.3)

        # Show all three
        self.play(
            FadeIn(angular),
            FadeIn(medium),
            low_label.animate.set_opacity(1),
            med_label.animate.set_opacity(1),
            run_time=0.8
        )

        # Show spectrum
        self.play(*[FadeIn(r) for r in spectrum], run_time=0.8)

        # Highlight markers
        markers = VGroup()
        for i, x in enumerate([0, 10, 19]):
            marker = Triangle(fill_opacity=1, color=WHITE).scale(0.15)
            marker.rotate(PI)
            marker.next_to(spectrum[x], UP, buff=0.1)
            markers.add(marker)

        self.play(*[FadeIn(m, shift=DOWN * 0.2) for m in markers], run_time=0.5)

        self.wait(0.5)
