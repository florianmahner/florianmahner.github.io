"""
Animation: Coding Principles
Abstract: Chaotic dots organizing into a clean grid
"""
from manim import *
from manim.utils.color import ManimColor
import numpy as np

class CodingAnimation(Scene):
    def construct(self):
        self.camera.background_color = "#0f0f1a"

        np.random.seed(42)

        # Create chaotic dots
        n_dots = 36
        dots = VGroup()

        # Random starting positions
        for i in range(n_dots):
            pos = np.array([
                np.random.uniform(-5, 5),
                np.random.uniform(-3, 3),
                0
            ])
            color = interpolate_color(
                ManimColor("#ff6b6b"),
                ManimColor("#4ecdc4"),
                np.random.random()
            )
            dot = Dot(point=pos, color=color, radius=0.12)
            dots.add(dot)

        # Grid positions (6x6)
        grid_positions = []
        for row in range(6):
            for col in range(6):
                x = -2.5 + col * 1
                y = 2.5 - row * 1
                grid_positions.append(np.array([x, y, 0]))

        # Labels
        chaos_label = Text("Before", font_size=24, color="#ff6b6b")
        chaos_label.to_corner(UL, buff=0.5)

        order_label = Text("After", font_size=24, color="#4ecdc4")
        order_label.to_corner(UL, buff=0.5)

        # Animate
        self.play(
            *[FadeIn(d, scale=0.3) for d in dots],
            Write(chaos_label),
            run_time=1
        )

        # Chaotic motion
        for _ in range(4):
            animations = []
            for d in dots:
                new_pos = d.get_center() + np.array([
                    np.random.uniform(-1, 1),
                    np.random.uniform(-1, 1),
                    0
                ])
                new_pos = np.clip(new_pos, -5, 5)
                animations.append(d.animate.move_to(new_pos))
            self.play(*animations, run_time=0.25)

        self.wait(0.3)

        # Transform to grid
        self.play(
            *[dots[i].animate.move_to(grid_positions[i]) for i in range(n_dots)],
            ReplacementTransform(chaos_label, order_label),
            run_time=2,
            rate_func=smooth
        )

        # Change colors to uniform gradient
        animations = []
        for i, dot in enumerate(dots):
            row = i // 6
            new_color = interpolate_color(
                ManimColor("#4ecdc4"),
                ManimColor("#96ceb4"),
                row / 5
            )
            animations.append(dot.animate.set_color(new_color))

        self.play(*animations, run_time=1)

        # Draw grid lines
        grid_lines = VGroup()
        for i in range(7):
            h_line = Line(
                start=[-3, 3 - i, 0],
                end=[3, 3 - i, 0],
                color=WHITE,
                stroke_width=1,
                stroke_opacity=0.3
            )
            v_line = Line(
                start=[-3 + i, 3, 0],
                end=[-3 + i, -3, 0],
                color=WHITE,
                stroke_width=1,
                stroke_opacity=0.3
            )
            grid_lines.add(h_line, v_line)

        self.play(Create(grid_lines), run_time=0.8)

        self.wait(0.5)
