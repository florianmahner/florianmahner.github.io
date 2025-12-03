"""
Animation: Decision Making (Model-based vs Model-free)
Abstract: Branching paths vs direct paths - attractor dynamics
"""
from manim import *
import numpy as np

class DecisionAnimation(Scene):
    def construct(self):
        self.camera.background_color = "#0f0f1a"

        # Two attractor basins
        # Left: Model-based (complex, branching)
        # Right: Model-free (simple, direct)

        # Create attractor points
        mb_attractor = Dot(LEFT * 3 + DOWN * 2, color="#4ecdc4", radius=0.3)
        mf_attractor = Dot(RIGHT * 3 + DOWN * 2, color="#ff6b6b", radius=0.3)

        # Labels
        mb_label = Text("Model-Based", font_size=20, color="#4ecdc4")
        mb_label.next_to(mb_attractor, DOWN, buff=0.3)

        mf_label = Text("Model-Free", font_size=20, color="#ff6b6b")
        mf_label.next_to(mf_attractor, DOWN, buff=0.3)

        title = Text("Decision Strategies", font_size=28, color=WHITE)
        title.to_edge(UP, buff=0.5)

        # Create particles that will flow to attractors
        np.random.seed(42)
        n_particles = 16
        particles = VGroup()

        for i in range(n_particles):
            x = np.random.uniform(-4, 4)
            y = np.random.uniform(1, 3)
            color = "#4ecdc4" if i < n_particles // 2 else "#ff6b6b"
            particle = Dot(point=[x, y, 0], color=color, radius=0.1)
            particles.add(particle)

        # Animate
        self.play(Write(title), run_time=0.5)

        # Show attractors
        self.play(
            FadeIn(mb_attractor, scale=2),
            FadeIn(mf_attractor, scale=2),
            Write(mb_label),
            Write(mf_label),
            run_time=1
        )

        # Show particles
        self.play(*[FadeIn(p, scale=0.5) for p in particles], run_time=0.8)

        # Model-based particles take winding paths
        # Model-free particles take direct paths
        for step in range(8):
            animations = []
            for i, p in enumerate(particles):
                current = p.get_center()

                if i < n_particles // 2:
                    # Model-based: winding path
                    target = np.array([*mb_attractor.get_center()[:2], 0])
                    direction = target - current
                    # Add exploration (sideways movement)
                    perpendicular = np.array([-direction[1], direction[0], 0])
                    perpendicular = perpendicular / (np.linalg.norm(perpendicular) + 0.01)
                    wobble = perpendicular * np.sin(step * 2 + i) * 0.5
                    step_vec = direction * 0.15 + wobble * (1 - step / 8)
                else:
                    # Model-free: direct path
                    target = np.array([*mf_attractor.get_center()[:2], 0])
                    direction = target - current
                    step_vec = direction * 0.18

                new_pos = current + step_vec
                animations.append(p.animate.move_to(new_pos))

            self.play(*animations, run_time=0.35)

        # Draw flow lines
        mb_flow = VGroup()
        for angle in np.linspace(0, 2 * PI, 8, endpoint=False):
            start = mb_attractor.get_center() + 2.5 * np.array([np.cos(angle), np.sin(angle), 0])
            curve = CubicBezier(
                start,
                start + np.array([np.sin(angle), -np.cos(angle), 0]) * 0.5,
                mb_attractor.get_center() + 0.5 * np.array([np.cos(angle), np.sin(angle), 0]),
                mb_attractor.get_center(),
                color="#4ecdc4",
                stroke_width=1,
                stroke_opacity=0.3
            )
            mb_flow.add(curve)

        mf_flow = VGroup()
        for angle in np.linspace(0, 2 * PI, 8, endpoint=False):
            start = mf_attractor.get_center() + 2.5 * np.array([np.cos(angle), np.sin(angle), 0])
            line = Line(start, mf_attractor.get_center(), color="#ff6b6b", stroke_width=1, stroke_opacity=0.3)
            mf_flow.add(line)

        self.play(Create(mb_flow), Create(mf_flow), run_time=1)

        # Pulse attractors
        self.play(
            mb_attractor.animate.scale(1.3),
            mf_attractor.animate.scale(1.3),
            run_time=0.3
        )
        self.play(
            mb_attractor.animate.scale(1/1.3),
            mf_attractor.animate.scale(1/1.3),
            run_time=0.3
        )

        self.wait(0.5)
