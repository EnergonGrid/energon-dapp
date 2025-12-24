import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { useMemo, useRef } from "react";

function RotatingSphere({ points }) {
  const group = useRef();

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.25; // smooth rotation
  });

  const sphereGeometry = useMemo(() => new THREE.SphereGeometry(1.2, 64, 64), []);
  const sphereMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0b1220",
        metalness: 0.6,
        roughness: 0.4,
        emissive: "#0a1a3a",
        emissiveIntensity: 0.6,
      }),
    []
  );

  // Dots
  const dotGeometry = useMemo(() => new THREE.SphereGeometry(0.03, 16, 16), []);
  const dotMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#38bdf8",
        emissive: "#38bdf8",
        emissiveIntensity: 2.0,
      }),
    []
  );

  return (
    <group ref={group}>
      <mesh geometry={sphereGeometry} material={sphereMaterial} />

      {points.map((p, idx) => (
        <mesh
          key={idx}
          geometry={dotGeometry}
          material={dotMaterial}
          position={[p.x, p.y, p.z]}
        />
      ))}
    </group>
  );
}

export default function Globe({ points }) {
  return (
    <div style={{ width: "100%", height: 380, borderRadius: 14, overflow: "hidden", border: "1px solid #1f2937" }}>
      <Canvas camera={{ position: [0, 0, 3.6], fov: 45 }}>
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 3, 3]} intensity={1.1} />

        <RotatingSphere points={points} />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          rotateSpeed={0.6}
          dampingFactor={0.08}
          enableDamping
        />
      </Canvas>
    </div>
  );
}
