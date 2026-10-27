import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, ShaderMaterial } from 'three';
import { COLORS } from '../config';
import { flight } from './sceneState';

/**
 * Riyadh at night as the sea: the night colour with a faint street grid. Minor streets are dim,
 * avenues brighter, and a few long boulevards carry slow pulses of traffic light.
 */
export function Sea() {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uNight: { value: new Color(COLORS.night) },
          uDeep: { value: new Color(COLORS.nightDeep) },
          uLine: { value: new Color('#6E6AB8') },
          uGlow: { value: new Color(COLORS.gold) },
          uCenter: { value: [0, 0] },
          uStill: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vWorld;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vWorld = w.xz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform float uStill;
          uniform vec3 uNight;
          uniform vec3 uDeep;
          uniform vec3 uLine;
          uniform vec3 uGlow;
          uniform vec2 uCenter;
          varying vec2 vWorld;

          float gridLine(vec2 p, float spacing, float width) {
            vec2 g = abs(fract(p / spacing - 0.5) - 0.5) * spacing;
            vec2 fw = fwidth(p);
            vec2 l = 1.0 - smoothstep(vec2(width) - fw, vec2(width) + fw, g);
            return max(l.x, l.y);
          }

          void main() {
            // The grid of Riyadh is turned slightly off the screen axes, as the real one is.
            float a = 0.42;
            mat2 r = mat2(cos(a), -sin(a), sin(a), cos(a));
            vec2 p = r * vWorld;

            float minor = gridLine(p, 0.7, 0.012);
            float major = gridLine(p, 3.5, 0.026);

            // Boulevards with pulses of light running along them.
            float t = uTime * (1.0 - uStill);
            float bx = 1.0 - smoothstep(0.02, 0.06, abs(p.x - 1.75));
            float bz = 1.0 - smoothstep(0.02, 0.06, abs(p.y + 5.25));
            float pulseX = pow(0.5 + 0.5 * sin(p.y * 0.9 - t * 1.6), 18.0);
            float pulseZ = pow(0.5 + 0.5 * sin(p.x * 0.9 + t * 1.3), 18.0);

            float dist = length(vWorld - uCenter);
            float fade = 1.0 - smoothstep(6.0, 30.0, dist);

            vec3 col = mix(uDeep, uNight, 1.0 - smoothstep(4.0, 34.0, dist));
            col += uLine * minor * 0.07 * fade;
            col += uLine * major * 0.20 * fade;
            col += uGlow * (bx * pulseX + bz * pulseZ) * 0.55 * fade;
            col += uLine * (bx + bz) * 0.10 * fade;
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    [],
  );
  // Push the sea back in depth so the glow rings just above it never flicker.
  material.polygonOffset = true;
  material.polygonOffsetFactor = 2;
  material.polygonOffsetUnits = 2;

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uStill.value = flight.reducedMotion ? 1 : 0;
    const target = (state.camera.userData.target as { x: number; z: number } | undefined) ?? { x: 0, z: 0 };
    material.uniforms.uCenter.value = [target.x, target.z];
  });

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0} material={material} receiveShadow={false}>
      <planeGeometry args={[220, 220, 1, 1]} />
    </mesh>
  );
}
