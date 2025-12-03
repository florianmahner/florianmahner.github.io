"""
Animation: Motion Recognition
Abstract: Synchronized oscillating dots representing motion patterns
"""
from manim import *
import numpy as np

class MotionAnimation(Scene):
    def construct(self):
        self.camera.background_color = "#0f0f1a"

        title = Text("Motion Patterns", font_size=28, color=WHITE)
        title.to_edge(UP, buff=0.5)

        # Create a grid of dots that will oscillate
        n_rows, n_cols = 5, 8
        dots = VGroup()

        colors = ["#ff6b6b", "#ff8c42", "#ffd93d", "#4ecdc4", "#96ceb4"]

        for row in range(n_rows):
            for col in range(n_cols):
                x = -3.5 + col * 1
                y = 1.5 - row * 0.8
                color = colors[row]
                dot = Dot(point=[x, y, 0], color=color, radius=0.12)
                dots.add(dot)

        # Create trace lines (showing motion paths)
        traces = VGroup()
        for i, dot in enumerate(dots):
            trace = TracedPath(
                dot.get_center,
                stroke_color=dot.get_color(),
                stroke_width=1,
                stroke_opacity=0.3
            )
            traces.add(trace)

        # Animate
        self.play(Write(title), run_time=0.5)
        self.play(*[FadeIn(d, scale=0.5) for d in dots], run_time=1)

        self.add(*traces)

        # Wave motion
        def wave_update(mob, dt, dots=dots, t=[0]):
            t[0] += dt * 2
            for i, dot in enumerate(dots):
                row = i // n_cols
                col = i % n_cols
                # Create wave pattern
                phase = col * 0.5 + row * 0.3
                offset_y = 0.3 * np.sin(t[0] + phase)
                base_x = -3.5 + col * 1
                base_y = 1.5 - row * 0.8
                dot.move_to([base_x, base_y + offset_y, 0])

        # Add updater for wave motion
        dummy = Dot().set_opacity(0)
        dummy.add_updater(wave_update)
        self.add(dummy)

        self.wait(3)

        dummy.remove_updater(wave_update)
        self.remove(*traces)

        # Show view invariance - rotate perspective
        view_label = Text("View Invariant", font_size=20, color="#ffd93d")
        view_label.to_edge(DOWN, buff=0.5)

        self.play(Write(view_label), run_time=0.5)

        # Compress horizontally (simulating view change)
        self.play(
            dots.animate.stretch(0.5, 0),
            run_time=1
        )

        # Continue oscillation in new view
        def wave_update_2(mob, dt, dots=dots, t=[0]):
            t[0] += dt * 2
            for i, dot in enumerate(dots):
                row = i // n_cols
                col = i % n_cols
                phase = col * 0.5 + row * 0.3
                offset_y = 0.3 * np.sin(t[0] + phase)
                current_x = dot.get_center()[0]
                base_y = 1.5 - row * 0.8
                dot.move_to([current_x, base_y + offset_y, 0])

        dummy2 = Dot().set_opacity(0)
        dummy2.add_updater(wave_update_2)
        self.add(dummy2)

        self.wait(2)

        dummy2.remove_updater(wave_update_2)

        # Restore
        self.play(
            dots.animate.stretch(2, 0),
            run_time=1
        )

        self.wait(0.5)
