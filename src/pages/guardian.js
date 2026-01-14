import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls, Sparkles } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";

function EnergonCube({ beat }) {
  const groupRef = useRef(null);

  const cubeMatRef = useRef(null);
  const sphereMatRef = useRef(null);
  const edgeMatRef = useRef(null);
  const auraMatRef = useRef(null);

  const pulse = useRef(0);

  const baseColor = useMemo(() => new THREE.Color("#0B1020"), []);
  const glowColor = useMemo(() => new THREE.Color("#37B7FF"), []);
  const flashColor = useMemo(() => new THREE.Color("#8AE7FF"), []);

  useEffect(() => {
    pulse.current = 1.0;
  }, [beat]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    // Rotate the whole assembly (true 3D)
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.35;
      groupRef.current.rotation.x += delta * 0.12;

      // subtle "shake" on pulse
      const shake = pulse.current * 0.02;
      groupRef.current.position.x = Math.sin(t * 45) * shake;
      groupRef.current.position.y = Math.cos(t * 40) * shake;
    }

    // Decay pulse
    pulse.current = Math.max(0, pulse.current - delta * 1.25);

    const breathe = 0.35 + 0.2 * Math.sin(t * 2.2);
    const hit = pulse.current;

    // Core sphere glow
    if (sphereMatRef.current) {
      sphereMatRef.current.emissive = glowColor.clone().lerp(flashColor, hit);
      sphereMatRef.current.emissiveIntensity = 1.6 + breathe * 2.0 + hit * 3.2;
    }

    // Aura shell glow (subtle, keeps “single core” feel)
    if (auraMatRef.current) {
      auraMatRef.current.opacity = 0.12 + breathe * 0.08 + hit * 0.14;
      auraMatRef.current.emissiveIntensity = 0.9 + breathe * 1.2 + hit * 1.8;
    }

    // Cube glass tint + punch on beat
    if (cubeMatRef.current) {
      const tint = baseColor.clone().lerp(glowColor, 0.35 + breathe * 0.35);
      cubeMatRef.current.color = tint.lerp(flashColor, hit * 0.45);

      cubeMatRef.current.opacity = 0.14 + hit * 0.10;
      cubeMatRef.current.emissive = glowColor.clone().lerp(flashColor, hit);
      cubeMatRef.current.emissiveIntensity = 0.25 + breathe * 0.45 + hit * 1.2;
    }

    // Edge glow
    if (edgeMatRef.current) {
      edgeMatRef.current.opacity = 0.65 + breathe * 0.2 + hit * 0.35;
    }

    // Slightly expand during beat
    if (groupRef.current) {
      const s = 1 + hit * 0.06;
      groupRef.current.scale.set(s, s, s);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Inner core sphere (visible through glass) */}
      <mesh>
        <sphereGeometry args={[0.38, 48, 48]} />
        <meshStandardMaterial
          ref={sphereMatRef}
          color={"#7DE9FF"}
          emissive={"#37B7FF"}
          emissiveIntensity={2.2}
          roughness={0.25}
          metalness={0.05}
        />
      </mesh>

      {/* Aura shell (adds energy depth but still feels like ONE core) */}
      <mesh>
        <sphereGeometry args={[0.44, 48, 48]} />
        <meshStandardMaterial
          ref={auraMatRef}
          color={"#37B7FF"}
          emissive={"#37B7FF"}
          emissiveIntensity={1.1}
          transparent
          opacity={0.16}
          roughness={0.3}
          metalness={0.0}
          depthWrite={false}
        />
      </mesh>

      {/* Glass cube (3D) */}
      <mesh>
        <boxGeometry args={[1.2, 1.2, 1.2]} />
        <meshPhysicalMaterial
          ref={cubeMatRef}
          color={"#0B1020"}
          transparent
          opacity={0.14}
          roughness={0.08}
          metalness={0.0}
          transmission={0.65} // glass
          thickness={0.9}
          ior={1.35}
          clearcoat={1}
          clearcoatRoughness={0.1}
          envMapIntensity={1.35}
          depthWrite={false} // keep sphere visible
        />
      </mesh>

      {/* Glowing cube edges */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(1.205, 1.205, 1.205)]} />
        <lineBasicMaterial
          ref={edgeMatRef}
          color={"#37B7FF"}
          transparent
          opacity={0.85}
        />
      </lineSegments>
    </group>
  );
}

export default function GuardianPage() {
  const [beat, setBeat] = useState(0);

  // Local heartbeat test (no chain yet)
  useEffect(() => {
    const id = setInterval(() => setBeat((b) => b + 1), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ height: "100vh", background: "#070A12", color: "white" }}>
      {/* Minimal HUD */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 10,
          fontFamily: "ui-sans-serif, system-ui",
          opacity: 0.9,
          lineHeight: 1.25,
          pointerEvents: "none",
        }}
      >
        <div style={{ letterSpacing: "0.22em", fontSize: 12, opacity: 0.75 }}>
          ENERGON GUARDIAN
        </div>
        <div style={{ fontSize: 20, marginTop: 6 }}>Observer Dashboard</div>
        <div style={{ fontSize: 12, marginTop: 8, opacity: 0.75 }}>
          Heartbeat: {beat}
        </div>
      </div>

      <Canvas
        camera={{ position: [0, 0, 3.2], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Background + atmosphere */}
        <color attach="background" args={["#070A12"]} />
        <fog attach="fog" args={["#070A12", 2.5, 7]} />

        {/* Lights */}
        <ambientLight intensity={0.25} />
        <directionalLight position={[3, 4, 2]} intensity={1.35} />
        <pointLight position={[-3, -2, 2]} intensity={0.7} />

        {/* Plasma dust */}
        <Sparkles
          count={60}
          speed={0.25}
          opacity={0.35}
          size={2}
          scale={[6, 6, 6]}
        />

        {/* Core object */}
        <EnergonCube beat={beat} />

        {/* Environment + control */}
        <Environment preset="city" />
        <OrbitControls enablePan={false} enableZoom={false} />

        {/* Post FX: real glow */}
        <EffectComposer>
          <Bloom
            intensity={1.3}
            luminanceThreshold={0.15}
            luminanceSmoothing={0.9}
          />
          <Vignette eskil={false} offset={0.25} darkness={0.65} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}