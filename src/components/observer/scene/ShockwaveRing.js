import React, { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";

export default function ShockwaveRing({ enabled, beat }) {
  const meshRef = useRef(null);
  const life = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    life.current = 0;
  }, [beat, enabled]);

  useFrame((state, delta) => {
    if (!enabled || !meshRef.current) return;

    life.current = Math.min(1, life.current + delta / 0.55);
    const p = life.current;

    const s = 0.42 + p * 1.25;
    meshRef.current.scale.set(s, s, 1);
    meshRef.current.position.z = 0.7;

    const alpha = Math.max(0, Math.pow(1 - p, 2.7)) * 0.12;
    if (meshRef.current?.material) {
      meshRef.current.material.opacity = alpha;
    }

    meshRef.current.visible = alpha > 0.02;
  });

  if (!enabled) return null;

  return (
    <mesh ref={meshRef} position={[0, 0, 0.7]} renderOrder={999}>
      <ringGeometry args={[0.58, 0.60, 128]} />
      <meshPhysicalMaterial
        transparent
        opacity={0}
        color={"#ffffff"}
        roughness={0.15}
        metalness={0.0}
        transmission={1.0}
        thickness={0.01}
        ior={1.01}
        clearcoat={0.4}
        clearcoatRoughness={0.25}
        envMapIntensity={0.08}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}
