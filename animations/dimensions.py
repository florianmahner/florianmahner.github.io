"""
Animation: Interpretable Dimensions
Abstract: Random dots organizing along visible axes
"""
from manim import *
import numpy as np

class DimensionsAnimation(Scene):
    def construct(self):
        self.camera.background_color = "#0f0f1a"

        np.random.seed(123)

        # Create axes
        axes = Axes(
            x_range=[-3, 3, 1],
            y_range=[-3, 3, 1],
            x_length=6,
            y_length=6,
            axis_config={"color": WHITE, "stroke_width": 1, "stroke_opacity": 0.5}
        )

        x_label = Text("Dimension 1", font_size=16, color="#ff6b6b")
        x_label.next_to(axes.x_axis, DOWN, buff=0.2)
        y_label = Text("Dimension 2", font_size=16, color="#4ecdc4")
        y_label.next_to(axes.y_axis, LEFT, buff=0.2)

        # Create scattered dots
        n_dots = 30
        dots = VGroup()
        colors = ["#ff6b6b", "#ff8c42", "#ffd93d", "#4ecdc4", "#96ceb4"]

        # Random initial positions
        initial_pos = np.random.randn(n_dots, 2) * 2

        # Organized positions (clustered)
        clusters = [
            (2, 2), (-2, 2), (-2, -2), (2, -2), (0, 0)
        ]
        final_pos = []
        for i in range(n_dots):
            cluster = clusters[i % 5]
            offset = np.random.randn(2) * 0.4
            final_pos.append((cluster[0] + offset[0], cluster[1] + offset[1]))

        for i in range(n_dots):
            dot = Dot(
                point=axes.c2p(initial_pos[i, 0], initial_pos[i, 1]),
                color=colors[i % 5],
                radius=0.1
            )
            dots.add(dot)

        # Animate
        self.play(Create(axes), run_time=1)
        self.play(Write(x_label), Write(y_label), run_time=0.5)
        self.play(*[FadeIn(d, scale=0.5) for d in dots], run_time=1)

        self.wait(0.5)

        # Organize into clusters
        self.play(
            *[dots[i].animate.move_to(axes.c2p(final_pos[i][0], final_pos[i][1]))
              for i in range(n_dots)],
            run_time=2,
            rate_func=smooth
        )

        # Draw cluster circles
        for i, (cx, cy) in enumerate(clusters):
            circle = Circle(
                radius=0.7,
                color=colors[i],
                stroke_width=2,
                stroke_opacity=0.6
            )
            circle.move_to(axes.c2p(cx, cy))
            self.play(Create(circle), run_time=0.2)

        self.wait(0.5)
