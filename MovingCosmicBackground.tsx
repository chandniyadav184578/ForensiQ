import React, { useEffect, useRef } from 'react';

export const MovingCosmicBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse coordinates for gentle interactive attraction
    const mouse = {
      x: width * 0.5,
      y: height * 0.4,
      targetX: width * 0.5,
      targetY: height * 0.4,
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    // 1. Dynamic Plasma / Aurora Orbs (flowing smoothly in organic Lissajous paths)
    const orbs = [
      {
        baseX: 0.25,
        baseY: 0.2,
        radius: 360,
        color: 'rgba(217, 70, 128, 0.24)', // Berry Pink
        speedX: 0.0007,
        speedY: 0.0009,
        ampX: 180,
        ampY: 130,
        phase: 0,
      },
      {
        baseX: 0.75,
        baseY: 0.25,
        radius: 420,
        color: 'rgba(147, 51, 234, 0.22)', // Deep Violet
        speedX: 0.0008,
        speedY: 0.0006,
        ampX: 200,
        ampY: 160,
        phase: Math.PI / 2,
      },
      {
        baseX: 0.5,
        baseY: 0.65,
        radius: 380,
        color: 'rgba(244, 63, 94, 0.20)', // Rose Flame
        speedX: 0.0006,
        speedY: 0.0008,
        ampX: 220,
        ampY: 140,
        phase: Math.PI,
      },
      {
        baseX: 0.15,
        baseY: 0.8,
        radius: 320,
        color: 'rgba(190, 24, 93, 0.22)', // Deep Berry Wine
        speedX: 0.0009,
        speedY: 0.0007,
        ampX: 160,
        ampY: 120,
        phase: Math.PI * 1.5,
      },
      {
        baseX: 0.85,
        baseY: 0.75,
        radius: 340,
        color: 'rgba(251, 146, 60, 0.14)', // Warm Radiant Amber
        speedX: 0.0007,
        speedY: 0.0005,
        ampX: 170,
        ampY: 150,
        phase: Math.PI / 3,
      },
    ];

    // 2. Cosmic Constellation & Stardust Nodes
    const particleCount = 65;
    interface StarParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      baseRadius: number;
      alpha: number;
      alphaSpeed: number;
      color: string;
      trailLength: number;
    }

    const starColors = [
      'rgba(244, 114, 182,', // Pink
      'rgba(251, 113, 133,', // Rose
      'rgba(216, 180, 254,', // Lavender
      'rgba(254, 215, 170,', // Gold glow
      'rgba(255, 255, 255,', // Pure White
    ];

    const particles: StarParticle[] = [];
    for (let i = 0; i < particleCount; i++) {
      const baseRadius = Math.random() * 1.8 + 0.8;
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7,
        vy: (Math.random() - 0.5) * 0.6 - 0.25, // Gentle drifting upwards
        radius: baseRadius,
        baseRadius,
        alpha: Math.random() * 0.8 + 0.2,
        alphaSpeed: (Math.random() * 0.012 + 0.004) * (Math.random() > 0.5 ? 1 : -1),
        color: starColors[Math.floor(Math.random() * starColors.length)],
        trailLength: Math.random() * 24 + 6,
      });
    }

    // 3. Shooting Meteors / Anamorphic light streaks
    interface Meteor {
      x: number;
      y: number;
      length: number;
      speed: number;
      angle: number;
      alpha: number;
      active: boolean;
      delay: number;
    }

    const meteors: Meteor[] = [
      { x: 0, y: 0, length: 140, speed: 12, angle: Math.PI / 4, alpha: 0, active: false, delay: 60 },
      { x: 0, y: 0, length: 180, speed: 15, angle: Math.PI / 4 + 0.1, alpha: 0, active: false, delay: 190 },
    ];

    let t = 0;

    const render = () => {
      t += 1;

      // Smooth mouse follow
      mouse.x += (mouse.targetX - mouse.x) * 0.04;
      mouse.y += (mouse.targetY - mouse.y) * 0.04;

      // 1. Deep space backdrop
      ctx.fillStyle = '#08010b';
      ctx.fillRect(0, 0, width, height);

      // 2. Render moving undulating nebula plasma clouds
      orbs.forEach(orb => {
        const cx = orb.baseX * width + Math.sin(t * orb.speedX + orb.phase) * orb.ampX;
        const cy = orb.baseY * height + Math.cos(t * orb.speedY + orb.phase) * orb.ampY;
        const pulse = Math.sin(t * 0.003 + orb.phase) * 40;
        const currentRadius = Math.max(100, orb.radius + pulse);

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, currentRadius);
        grad.addColorStop(0, orb.color);
        grad.addColorStop(0.55, orb.color.replace(/[\d\.]+\)$/, '0.08)'));
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Subtle reactive glow at cursor position
      const mouseGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 300);
      mouseGrad.addColorStop(0, 'rgba(217, 70, 128, 0.12)');
      mouseGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = mouseGrad;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 300, 0, Math.PI * 2);
      ctx.fill();

      // 3. Draw cybernetic constellation mesh between close particles
      const maxConnectDist = 110;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxConnectDist) {
            const lineAlpha = (1 - dist / maxConnectDist) * 0.22;
            ctx.strokeStyle = `rgba(244, 114, 182, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // 4. Update and render moving stardust nodes
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        // Twinkling animation
        p.alpha += p.alphaSpeed;
        if (p.alpha > 0.95 || p.alpha < 0.2) {
          p.alphaSpeed = -p.alphaSpeed;
        }

        // Screen wrap
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        // Glow halo
        const haloGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 7);
        haloGrad.addColorStop(0, `${p.color} ${p.alpha * 0.8})`);
        haloGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 7, 0, Math.PI * 2);
        ctx.fill();

        // Core star
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Render Shooting Meteors / Streaks
      meteors.forEach(m => {
        if (!m.active) {
          m.delay--;
          if (m.delay <= 0) {
            m.active = true;
            m.x = Math.random() * (width * 0.8);
            m.y = Math.random() * (height * 0.4);
            m.alpha = 1;
            m.delay = Math.floor(Math.random() * 240 + 120);
          }
        } else {
          m.x += Math.cos(m.angle) * m.speed;
          m.y += Math.sin(m.angle) * m.speed;
          m.alpha -= 0.022;

          if (m.alpha <= 0 || m.x > width || m.y > height) {
            m.active = false;
          } else {
            const tailX = m.x - Math.cos(m.angle) * m.length;
            const tailY = m.y - Math.sin(m.angle) * m.length;

            const streakGrad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
            streakGrad.addColorStop(0, 'transparent');
            streakGrad.addColorStop(0.7, `rgba(244, 114, 182, ${m.alpha * 0.5})`);
            streakGrad.addColorStop(1, `rgba(255, 255, 255, ${m.alpha})`);

            ctx.strokeStyle = streakGrad;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(tailX, tailY);
            ctx.lineTo(m.x, m.y);
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
      {/* Soft gradient vignetting for cinematic contrast */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#08010b]/20 to-[#08010b]/70 pointer-events-none" />
    </div>
  );
};
