"""
Animation: Perceived Similarity
Abstract: Particles attracting to similar particles, forming clusters
"""
from manim import *
import numpy as np

class SimilarityAnimation(Scene):
    def construct(self):
        self.camera.background_color = "#0f0f1a"

        np.random.seed(42)

        # Create particles with colors (similar = same color)
        n_particles = 24
        colors = ["#ff6b6b", "#4ecdc4", "#ffd93d", "#96ceb4"]

        particles = VGroup()
        velocities = []

        # Cluster centers
        cluster_centers = [
            LEFT * 2.5 + UP * 1.5,
            RIGHT * 2.5 + UP * 1.5,
            LEFT * 2.5 + DOWN * 1.5,
            RIGHT * 2.5 + DOWN * 1.5,
        ]

        # Random starting positions
        for i in range(n_particles):
            color_idx = i % 4
            pos = np.array([
                np.random.uniform(-5, 5),
                np.random.uniform(-3, 3),
                0
            ])
            particle = Dot(point=pos, color=colors[color_idx], radius=0.12)
            particles.add(particle)

        # Animate appearance
        self.play(*[FadeIn(p, scale=0.3) for p in particles], run_time=1)

        # Random motion phase
        for _ in range(3):
            animations = []
            for p in particles:
                new_pos = p.get_center() + np.array([
                    np.random.uniform(-0.5, 0.5),
                    np.random.uniform(-0.5, 0.5),
                    0
                ])
                animations.append(p.animate.move_to(new_pos))
            self.play(*animations, run_time=0.3)

        # Clustering phase - move to cluster centers
        animations = []
        for i, p in enumerate(particles):
            color_idx = i % 4
            target = cluster_centers[color_idx] + np.array([
                np.random.uniform(-0.5, 0.5),
                np.random.uniform(-0.5, 0.5),
                0
            ])
            animations.append(p.animate.move_to(target))

        self.play(*animations, run_time=2, rate_func=smooth)

        # Draw cluster boundaries
        for i, center in enumerate(cluster_centers):
            circle = Circle(radius=1, color=colors[i], stroke_width=2, stroke_opacity=0.5)
            circle.move_to(center)
            self.play(Create(circle), run_time=0.3)

        # Gentle oscillation
        for _ in range(2):
            self.play(
                *[p.animate.shift(UP * 0.1) for p in particles],
                run_time=0.4
            )
            self.play(
                *[p.animate.shift(DOWN * 0.1) for p in particles],
                run_time=0.4
            )

        self.wait(0.5)
