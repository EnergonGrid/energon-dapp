import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const RARITY_COLORS = {
  Common: "#4FA3FF",
  Uncommon: "#00FFC6",
  Rare: "#8B5CFF",
  Epic: "#FF3B3B",
  Legendary: "#FF9F1C",
  Genesis: "#FFE600",
};

const GENESIS_RAINBOW = [
  "#4FA3FF",
  "#00FFC6",
  "#2DFF57",
  "#FFE600",
  "#FF9F1C",
  "#FF3B3B",
  "#8B5CFF",
];

const MAX_HALVING_RINGS = 6;

function EpochRing({
  radius,
  tube,
  opacityBase,
  colorRef,
  speed = 0.2,
  pulseOffset = 0,
  axis = "z",
  index = 0,
}) {
  const meshRef = useRef(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();

    if (axis === "x") {
      meshRef.current.rotation.x = Math.PI / 2;
      meshRef.current.rotation.y += speed * 0.003;
    } else if (axis === "y") {
      meshRef.current.rotation.y = Math.PI / 2;
      meshRef.current.rotation.x += speed * 0.003;
    } else {
      meshRef.current.rotation.z += speed * 0.003;
    }

    const mat = meshRef.current.material;
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.6 + pulseOffset);

    const etchedColor = colorRef.current
      .clone()
      .lerp(new THREE.Color("#ffffff"), 0.16)
      .multiplyScalar(Math.max(0.22, 0.42 - index * 0.04));

    mat.color.copy(etchedColor);
    mat.opacity = opacityBase * (0.52 + pulse * 0.28);
  });

  return (
    <mesh ref={meshRef}>
      <torusGeometry args={[radius, tube, 24, 128]} />
      <meshBasicMaterial
        transparent
        opacity={opacityBase}
        depthWrite={false}
        depthTest={true}
        blending={THREE.NormalBlending}
        color={"#4FA3FF"}
      />
    </mesh>
  );
}

export default function EnergonCube({
  beat,
  mode,
  rarityTier,
  isGenesis,
  isBound,
  totalMinted = 0,
  maxSupply = 1000000,
  halvingStage = 0,
}) {
  const groupRef = useRef(null);

  const cubeMatRef = useRef(null);
  const sphereMatRef = useRef(null);
  const edgeMatRef = useRef(null);
  const coreShellRef = useRef(null);
  const haloRef = useRef(null);

  const pulse1 = useRef(0);
  const pulse2 = useRef(0);

  const thumpTimerRef = useRef(null);

  const baseColor = useMemo(() => new THREE.Color("#0B1020"), []);
  const sphereBaseColor = useMemo(() => new THREE.Color("#0A0A0C"), []);
  const edgeBaseColor = useMemo(() => new THREE.Color("#22324A"), []);
  const dormantShellColor = useMemo(() => new THREE.Color("#355C8A"), []);
  const dormantHaloColor = useMemo(() => new THREE.Color("#2A4266"), []);
  const fracturedHaloColor = useMemo(() => new THREE.Color("#FF6A3D"), []);
  const blackColor = useMemo(() => new THREE.Color("#000000"), []);

  const rainbowColors = useMemo(
    () => GENESIS_RAINBOW.map((c) => new THREE.Color(c)),
    []
  );
  const pulseColorRef = useRef(new THREE.Color(RARITY_COLORS.Common));

  const sphereOnly = mode === "SILENT" || mode === "FRACTURED";

  const mintProgress = useMemo(() => {
    const minted = Math.max(0, Number(totalMinted) || 0);
    const cap = Math.max(1, Number(maxSupply) || 1);
    return Math.min(1, minted / cap);
  }, [totalMinted, maxSupply]);

  const colorProgress = useMemo(() => {
    return Math.pow(mintProgress, 0.72);
  }, [mintProgress]);

  const ringCount = useMemo(() => {
    return Math.max(0, Math.min(MAX_HALVING_RINGS, Number(halvingStage) || 0));
  }, [halvingStage]);

  const baseLocked = useRef(false);
  useEffect(() => {
    if (!sphereMatRef.current) return;
    if (baseLocked.current) return;

    sphereMatRef.current.color.copy(sphereBaseColor);
    sphereMatRef.current.emissive.copy(blackColor);
    sphereMatRef.current.emissiveIntensity = 0.12;
    sphereMatRef.current.roughness = 0.35;
    sphereMatRef.current.metalness = 0.05;

    if (cubeMatRef.current) {
      cubeMatRef.current.color.copy(baseColor);
      cubeMatRef.current.transparent = true;
      cubeMatRef.current.opacity = 0.08;
      cubeMatRef.current.roughness = 0.08;
      cubeMatRef.current.metalness = 0.0;
      cubeMatRef.current.transmission = 0.35;
      cubeMatRef.current.thickness = 1.1;
      cubeMatRef.current.ior = 1.35;
      cubeMatRef.current.reflectivity = 0.9;
      cubeMatRef.current.clearcoat = 1;
      cubeMatRef.current.clearcoatRoughness = 0.1;
      cubeMatRef.current.envMapIntensity = 1.25;
      cubeMatRef.current.emissive.copy(baseColor);
      cubeMatRef.current.emissiveIntensity = 0.05;
      cubeMatRef.current.depthWrite = false;
    }

    if (edgeMatRef.current) {
      edgeMatRef.current.color.copy(edgeBaseColor);
      edgeMatRef.current.transparent = true;
      edgeMatRef.current.opacity = 0.28;
    }

    if (coreShellRef.current) {
      coreShellRef.current.material.color.copy(dormantShellColor);
    }

    if (haloRef.current) {
      haloRef.current.material.color.copy(dormantHaloColor);
      haloRef.current.material.opacity = 0.0;
    }

    baseLocked.current = true;
  }, [
    baseColor,
    sphereBaseColor,
    edgeBaseColor,
    dormantShellColor,
    dormantHaloColor,
    blackColor,
  ]);

  useEffect(() => {
    if (mode !== "COHERENT") return;
    if (!isBound) return;

    if (isGenesis) {
      const i = Math.floor(Math.random() * rainbowColors.length);
      pulseColorRef.current.copy(rainbowColors[i]);
    } else {
      const tier = String(rarityTier || "Common");
      const hex = RARITY_COLORS[tier] || RARITY_COLORS.Common;
      pulseColorRef.current.set(hex);
    }

    if (thumpTimerRef.current) {
      clearTimeout(thumpTimerRef.current);
      thumpTimerRef.current = null;
    }

    pulse1.current = 1.0;

    thumpTimerRef.current = setTimeout(() => {
      pulse2.current = 0.85;
      thumpTimerRef.current = null;
    }, 400);

    return () => {
      if (thumpTimerRef.current) {
        clearTimeout(thumpTimerRef.current);
        thumpTimerRef.current = null;
      }
    };
  }, [beat, mode, rarityTier, isGenesis, rainbowColors, isBound]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    const isCoherent = mode === "COHERENT";
    const isFractured = mode === "FRACTURED";
    const isSilent = mode === "SILENT";
    const isDisconnected = mode === "DISCONNECTED";
    const coherentLive = isCoherent && isBound;

    const rotY = isFractured ? 0.55 : 0.12;
    const rotX = isFractured ? 0.22 : 0.04;

    const shakeAmt = isFractured ? 0.055 : 0.0;
    const breatheSpeed = isFractured ? 3.6 : 0.9;

    const decay1 = coherentLive ? 2.2 : 1.35;
    const decay2 = coherentLive ? 3.2 : 1.8;
    pulse1.current = Math.max(0, pulse1.current - delta * decay1);
    pulse2.current = Math.max(0, pulse2.current - delta * decay2);

    const microPulse = coherentLive ? 0.5 + 0.5 * Math.sin(t * 2.2) : 0;
    const breathe = 0.35 + 0.2 * Math.sin(t * breatheSpeed);
    const hit = coherentLive ? pulse1.current + pulse2.current * 0.55 : 0;
    const livingPulse = coherentLive ? microPulse * 0.65 + hit * 1.25 : 0;

    if (groupRef.current) {
      groupRef.current.rotation.y += delta * rotY;
      groupRef.current.rotation.x += delta * rotX;

      if (isFractured) {
        const burst = 0.5 + 0.5 * Math.sin(t * 12.0);
        const shake = (0.6 + 0.4 * Math.sin(t * 18)) * (burst + 0.25);
        groupRef.current.position.x = Math.sin(t * 45) * shakeAmt * shake;
        groupRef.current.position.y = Math.cos(t * 40) * shakeAmt * shake;

        const swell = 0.05 + 0.02 * Math.sin(t * 10);
        const s = 1 + swell;
        groupRef.current.scale.set(s, s, s);
      } else {
        groupRef.current.position.x = 0;
        groupRef.current.position.y = 0;

        const idle = coherentLive ? (microPulse - 0.5) * 0.01 : 0;
        const s = 1 + idle + (coherentLive ? hit * 0.04 : 0);
        groupRef.current.scale.set(s, s, s);
      }
    }

    const liveColorMix = isGenesis ? 1.0 : coherentLive ? colorProgress : 0.18;
    const currentCoreColor = new THREE.Color().copy(blackColor).lerp(
      pulseColorRef.current,
      liveColorMix
    );

    if (sphereMatRef.current) {
      sphereMatRef.current.color.copy(sphereBaseColor);

      if ((isCoherent && !isBound) || isDisconnected || isSilent) {
        sphereMatRef.current.emissive.copy(blackColor);
        sphereMatRef.current.emissiveIntensity = 0.12 + breathe * 0.06;
      } else if (isFractured) {
        const flick = 0.5 + 0.5 * Math.sin(t * 14);
        sphereMatRef.current.emissive.copy(blackColor);
        sphereMatRef.current.emissiveIntensity =
          0.12 + breathe * 0.08 + flick * 0.18;
      } else {
        sphereMatRef.current.emissive.copy(currentCoreColor);
        const microGlow = microPulse * 0.55;
        sphereMatRef.current.emissiveIntensity =
          0.25 + breathe * 0.25 + microGlow + hit * 4.0;
      }
    }

    if (coreShellRef.current) {
      const shellMat = coreShellRef.current.material;

      const shellScale =
        1 +
        (coherentLive ? 0.04 * Math.sin(t * 1.8) : 0) +
        (coherentLive ? hit * 0.08 : 0) +
        (isFractured ? 0.03 * Math.sin(t * 9.0) : 0);

      coreShellRef.current.scale.set(shellScale, shellScale, shellScale);

      if (isGenesis || coherentLive) {
        shellMat.color.copy(currentCoreColor);
      } else {
        shellMat.color.copy(dormantShellColor);
      }

      shellMat.opacity = coherentLive
        ? 0.1 + livingPulse * 0.18
        : isFractured
        ? 0.12 + 0.05 * Math.sin(t * 10.0)
        : 0.05;

      shellMat.transmission = coherentLive ? 0.95 : 0.7;
    }

    if (haloRef.current) {
      const haloMat = haloRef.current.material;

      const breathWave = 0.5 + 0.5 * Math.sin(t * 1.4);

      const haloScale =
        1 +
        (coherentLive ? breathWave * 0.12 : 0) +
        (coherentLive ? hit * 0.16 : 0) +
        (isFractured ? 0.05 * Math.sin(t * 8.5) : 0);

      haloRef.current.scale.set(haloScale, haloScale, haloScale);

      if (isGenesis || coherentLive) {
        haloMat.color.copy(currentCoreColor);
      } else if (isFractured) {
        haloMat.color.copy(fracturedHaloColor);
      } else {
        haloMat.color.copy(dormantHaloColor);
      }

      const visibleBreath = Math.max(0, breathWave - 0.7) / 0.3;

      haloMat.opacity = coherentLive
        ? visibleBreath * (0.008 + livingPulse * 0.05)
        : isFractured
        ? 0.04 + 0.02 * Math.sin(t * 11.0)
        : 0.0;
    }

    if (!sphereOnly) {
      if (cubeMatRef.current) {
        cubeMatRef.current.color.copy(baseColor);
        cubeMatRef.current.opacity = 0.08;
        cubeMatRef.current.transmission = 0.35;
        cubeMatRef.current.depthWrite = false;

        cubeMatRef.current.ior = 1.34 + Math.sin(t * 0.3) * 0.02;
        cubeMatRef.current.reflectivity = 0.9;
        cubeMatRef.current.thickness = 1.1;

        const envBase = isBound ? 2.6 : 1.25;
        const envBreathe = isBound ? 0.25 * Math.sin(t * 0.9) : 0;
        const envHit = isBound ? hit * 1.7 : 0;
        const envMicro = isBound ? microPulse * 0.22 : 0;

        cubeMatRef.current.envMapIntensity =
          envBase + envBreathe + envMicro + envHit;

        if ((isCoherent && !isBound) || isDisconnected || isSilent) {
          cubeMatRef.current.emissive.copy(baseColor);
          cubeMatRef.current.emissiveIntensity = 0.05 + breathe * 0.04;
        } else {
          cubeMatRef.current.emissive.copy(currentCoreColor);
          const microEm = microPulse * 0.12;
          cubeMatRef.current.emissiveIntensity =
            0.06 + breathe * 0.08 + microEm + hit * 1.0;
        }

        cubeMatRef.current.clearcoatRoughness = isBound ? 0.07 : 0.1;
        cubeMatRef.current.roughness = isBound ? 0.06 : 0.08;
      }

      if (edgeMatRef.current) {
        edgeMatRef.current.color.copy(edgeBaseColor);
        const edgeMicro = coherentLive ? microPulse * 0.1 : 0;
        edgeMatRef.current.opacity = 0.28 + breathe * 0.06 + edgeMicro;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: ringCount }).map((_, i) => (
        <EpochRing
          key={`epoch-ring-${i}`}
          radius={0.11 + i * 0.042}
          tube={0.0036 + i * 0.00035}
          opacityBase={0.11 + i * 0.012}
          colorRef={pulseColorRef}
          speed={0.006 + i * 0.003}
          pulseOffset={i * 0.85}
          axis={i % 3 === 0 ? "x" : i % 3 === 1 ? "y" : "z"}
          index={i}
        />
      ))}

      <mesh ref={haloRef}>
        <sphereGeometry args={[0.52, 36, 36]} />
        <meshBasicMaterial
          color={"#4FA3FF"}
          transparent
          opacity={0.0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={coreShellRef}>
        <sphereGeometry args={[0.46, 40, 40]} />
        <meshPhysicalMaterial
          color={"#4FA3FF"}
          transparent
          opacity={0.1}
          roughness={0.18}
          metalness={0.0}
          transmission={0.9}
          thickness={0.35}
          ior={1.08}
          clearcoat={1}
          clearcoatRoughness={0.15}
          depthWrite={false}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[0.38, 48, 48]} />
        <meshStandardMaterial
          ref={sphereMatRef}
          color={"#0A0A0C"}
          emissive={"#000000"}
          emissiveIntensity={0.12}
          roughness={0.35}
          metalness={0.05}
        />
      </mesh>

      {sphereOnly ? null : (
        <>
          <mesh>
            <boxGeometry args={[1.2, 1.2, 1.2]} />
            <meshPhysicalMaterial
              ref={cubeMatRef}
              color={"#0B1020"}
              transparent
              opacity={0.08}
              roughness={0.08}
              metalness={0.0}
              transmission={0.35}
              thickness={1.1}
              ior={1.35}
              reflectivity={0.9}
              clearcoat={1}
              clearcoatRoughness={0.1}
              envMapIntensity={1.25}
              depthWrite={false}
            />
          </mesh>

          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(1.205, 1.205, 1.205)]} />
            <lineBasicMaterial
              ref={edgeMatRef}
              color={"#22324A"}
              transparent
              opacity={0.28}
            />
          </lineSegments>
        </>
      )}
    </group>
  );
}
