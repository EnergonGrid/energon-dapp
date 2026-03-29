import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function TransactionSparks({
  enabled,
  event,
  maxSparks = 64,
}) {
  const pointsRef = useRef(null);
  const sparksRef = useRef([]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    const positions = new Float32Array(maxSparks * 3);
    const colors = new Float32Array(maxSparks * 3);
    const sizes = new Float32Array(maxSparks);

    for (let i = 0; i < maxSparks; i++) {
      positions[i * 3 + 0] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 9999;

      colors[i * 3 + 0] = 0;
      colors[i * 3 + 1] = 0;
      colors[i * 3 + 2] = 0;

      sizes[i] = 0;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    return geo;
  }, [maxSparks]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      uniforms: {},
      vertexShader: `
        attribute float size;
        varying vec3 vColor;

        void main() {
          vColor = color;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          gl_PointSize = size;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float d = length(uv);

          if (d > 0.5) discard;

          float alpha = smoothstep(0.5, 0.0, d);
          alpha *= 1.35;

          gl_FragColor = vec4(vColor, alpha);
        }
      `,
    });
  }, []);

  useEffect(() => {
    if (!enabled || !event) return;

    const sparks = sparksRef.current;
    const isInbound = event.direction === "in";

    const baseColor = isInbound
      ? new THREE.Color("#33C8FF")
      : new THREE.Color("#FF7A33");

    const burstCount = 14;

    for (let n = 0; n < burstCount; n++) {
      let idx = sparks.findIndex((s) => !s.active);
      if (idx === -1) idx = n % maxSparks;

      const spread = 0.22;
      const angle = Math.random() * Math.PI * 2;

      sparks[idx] = {
        active: true,
        x: (Math.random() - 0.5) * spread,
        y: (Math.random() - 0.5) * spread,
        z: 0.0,
        vx: Math.cos(angle) * (0.002 + Math.random() * 0.006),
        vy: Math.sin(angle) * (0.002 + Math.random() * 0.006),
        vz: isInbound
          ? -0.006 - Math.random() * 0.01
          : 0.006 + Math.random() * 0.01,
        life: 0,
        ttl: 0.45 + Math.random() * 0.25,
        size: 6 + Math.random() * 8,
        color: baseColor.clone(),
      };
    }
  }, [enabled, event, maxSparks]);

  useFrame((state, delta) => {
    if (!enabled || !pointsRef.current) return;

    const sparks = sparksRef.current;
    const pos = geometry.attributes.position.array;
    const col = geometry.attributes.color.array;
    const siz = geometry.attributes.size.array;

    if (sparks.length < maxSparks) {
      for (let i = sparks.length; i < maxSparks; i++) {
        sparks.push({ active: false });
      }
    }

    for (let i = 0; i < maxSparks; i++) {
      const s = sparks[i];
      const i3 = i * 3;

      if (!s || !s.active) {
        pos[i3 + 0] = 0;
        pos[i3 + 1] = 0;
        pos[i3 + 2] = 9999;

        col[i3 + 0] = 0;
        col[i3 + 1] = 0;
        col[i3 + 2] = 0;

        siz[i] = 0;
        continue;
      }

      s.life += delta;
      const p = Math.min(1, s.life / s.ttl);
      const fade = 1 - p;
      const pulse = Math.sin(p * Math.PI);

      s.x += s.vx * delta * 60;
      s.y += s.vy * delta * 60;
      s.z += s.vz * delta * 60;

      pos[i3 + 0] = s.x;
      pos[i3 + 1] = s.y;
      pos[i3 + 2] = s.z;

      const intensity = 0.35 + pulse * 1.8;

      col[i3 + 0] = s.color.r * intensity;
      col[i3 + 1] = s.color.g * intensity;
      col[i3 + 2] = s.color.b * intensity;

      siz[i] = s.size * (0.65 + pulse * 0.6) * fade;

      if (p >= 1) {
        s.active = false;
      }
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
  });

  if (!enabled) return null;

  return (
    <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />
  );
}