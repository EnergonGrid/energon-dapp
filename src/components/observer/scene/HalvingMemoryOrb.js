import React, { useEffect, useMemo, useRef, useState } from "react";
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

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function rainbowColorAt(time) {
  const colors = GENESIS_RAINBOW.map((c) => new THREE.Color(c));
  const scaled = ((time * 0.12) % 1) * colors.length;
  const i = Math.floor(scaled);
  const next = (i + 1) % colors.length;
  const mix = scaled - i;
  return colors[i].clone().lerp(colors[next], mix);
}

export default function HalvingMemoryOrb({
  halvingIndex = 0,
  halvingHeight = 0,
  mintedAtHalving = 0,
  guardians = 0,
  eonReleased = 0,
  maxSupply = 1000000,
  position = [1.75, 0.35, -0.8],
  rarityTier = "Common",
  isGenesis = false,
  onActiveChange,
}) {
  const groupRef = useRef(null);

  const coreMatRef = useRef(null);
  const shellMatRef = useRef(null);
  const ringMatRef = useRef(null);
  const archiveRingMatRef = useRef(null);

  const miniCubeMatRef = useRef(null);
  const miniCubeGroupRef = useRef(null);

  const crystalMatRef = useRef(null);
  const crystalShellMatRef = useRef(null);

  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const isActive = hovered || pressed;

  const idleCoreColor = useMemo(() => new THREE.Color("#3f454d"), []);
  const idleShellColor = useMemo(() => new THREE.Color("#585f69"), []);
  const idleRingColor = useMemo(() => new THREE.Color("#6b737d"), []);
  const archiveColor = useMemo(() => new THREE.Color("#8b929d"), []);
  const blackColor = useMemo(() => new THREE.Color("#000000"), []);
  const baseCubeColor = useMemo(() => new THREE.Color("#0B1020"), []);

  const staticRarityColor = useMemo(() => {
    const hex = RARITY_COLORS[String(rarityTier)] || RARITY_COLORS.Common;
    return new THREE.Color(hex);
  }, [rarityTier]);

  const mintedProgress = useMemo(() => {
    const minted = Math.max(0, Number(mintedAtHalving) || 0);
    const cap = Math.max(1, Number(maxSupply) || 1);
    return clamp01(minted / cap);
  }, [mintedAtHalving, maxSupply]);

  const orbRadius = useMemo(() => {
    return 0.05 + Math.min(0.028, halvingIndex * 0.007);
  }, [halvingIndex]);

  const cubeSize = useMemo(() => orbRadius * 3.15, [orbRadius]);
  const hitSize = useMemo(() => orbRadius * 1.95, [orbRadius]);

  const pulseSeed = useMemo(() => {
    const h = Math.max(1, Number(halvingHeight) || 1);
    return 0.8 + ((h % 1000) / 1000) * 1.1;
  }, [halvingHeight]);

  const payload = useMemo(
    () => ({
      halvingIndex,
      halvingHeight,
      mintedAtHalving,
      guardians,
      eonReleased,
    }),
    [halvingIndex, halvingHeight, mintedAtHalving, guardians, eonReleased]
  );

  useEffect(() => {
    if (halvingIndex <= 0) return;
    onActiveChange?.(isActive, isActive ? payload : null, halvingIndex);
  }, [isActive, onActiveChange, payload, halvingIndex]);

  useFrame((state) => {
    if (!groupRef.current) return;

    const t = state.clock.getElapsedTime();

    groupRef.current.position.set(position[0], position[1], position[2]);
    groupRef.current.rotation.y += 0.0035;
    groupRef.current.rotation.x += 0.0015;

    const pulse = 0.5 + 0.5 * Math.sin(t * pulseSeed);
    const breathe = 0.5 + 0.5 * Math.sin(t * 1.35 + halvingIndex * 0.9);

    const liveRarityColor = isGenesis
      ? rainbowColorAt(t)
      : staticRarityColor.clone();

    const activeCoreColor = liveRarityColor.clone();
    const activeCubeColor = baseCubeColor.clone().lerp(liveRarityColor, 0.16);
    const activeArchiveColor = archiveColor.clone().lerp(liveRarityColor, 0.5);

    const coreGlow = isActive
      ? 0.2 + mintedProgress * 0.32 + pulse * 0.12
      : 0.016;

    const shellOpacity = isActive
      ? 0.11 + mintedProgress * 0.08 + pulse * 0.03
      : 0.02;

    const ringOpacity = isActive
      ? 0.08 + mintedProgress * 0.05 + pulse * 0.025
      : 0.018;

    const archiveOpacity = isActive ? 0.05 + pulse * 0.02 : 0.012;

    const crystalOpacity = isActive ? 0.55 : 0.0;
    const crystalShellOpacity = isActive ? 0.14 + pulse * 0.045 : 0.0;

    const miniCubeOpacity = isActive ? 0.07 + breathe * 0.02 : 0.0;
    const miniCubeScale = isActive ? 1 + pulse * 0.02 : 0.94;

    if (coreMatRef.current) {
      coreMatRef.current.color.copy(isActive ? activeCoreColor : idleCoreColor);
      coreMatRef.current.emissive.copy(
        isActive ? activeCoreColor : idleCoreColor
      );
      coreMatRef.current.emissiveIntensity = coreGlow;
      coreMatRef.current.roughness = isActive ? 0.26 : 0.36;
      coreMatRef.current.metalness = isActive ? 0.08 : 0.06;
    }

    if (shellMatRef.current) {
      shellMatRef.current.color.copy(
        isActive ? activeCoreColor : idleShellColor
      );
      shellMatRef.current.opacity = shellOpacity;
      shellMatRef.current.transmission = isActive ? 0.92 : 0.8;
    }

    if (ringMatRef.current) {
      ringMatRef.current.color.copy(
        isActive ? activeCoreColor : idleRingColor
      );
      ringMatRef.current.opacity = ringOpacity;
    }

    if (archiveRingMatRef.current) {
      archiveRingMatRef.current.color.copy(
        isActive ? activeArchiveColor : archiveColor
      );
      archiveRingMatRef.current.opacity = archiveOpacity;
    }

    if (miniCubeMatRef.current) {
      miniCubeMatRef.current.color.copy(
        isActive ? activeCubeColor : baseCubeColor
      );
      miniCubeMatRef.current.opacity = miniCubeOpacity;
      miniCubeMatRef.current.transmission = isActive ? 0.42 : 0.12;
      miniCubeMatRef.current.emissive.copy(
        isActive ? activeCoreColor : blackColor
      );
      miniCubeMatRef.current.emissiveIntensity = isActive
        ? 0.03 + pulse * 0.03
        : 0.0;
      miniCubeMatRef.current.envMapIntensity = isActive
        ? 1.7 + pulse * 0.28
        : 0.8;
      miniCubeMatRef.current.roughness = isActive ? 0.05 : 0.12;
      miniCubeMatRef.current.clearcoatRoughness = isActive ? 0.07 : 0.14;
      miniCubeMatRef.current.thickness = isActive ? 0.18 : 0.08;
      miniCubeMatRef.current.ior = 1.34;
      miniCubeMatRef.current.reflectivity = 0.9;
      miniCubeMatRef.current.depthWrite = false;
    }

    if (miniCubeGroupRef.current) {
      miniCubeGroupRef.current.scale.set(
        miniCubeScale,
        miniCubeScale,
        miniCubeScale
      );
      miniCubeGroupRef.current.rotation.y += 0.0055;
      miniCubeGroupRef.current.rotation.x += 0.0022;
    }

    if (crystalMatRef.current) {
      crystalMatRef.current.color.copy(
        isActive ? activeCoreColor : liveRarityColor
      );
      crystalMatRef.current.opacity = crystalOpacity;
    }

    if (crystalShellMatRef.current) {
      crystalShellMatRef.current.color.copy(
        isActive ? activeCoreColor : liveRarityColor
      );
      crystalShellMatRef.current.opacity = crystalShellOpacity;
    }

    const crystalGroup = groupRef.current.getObjectByName(
      "memory-crystal-group"
    );
    if (crystalGroup) {
      const crystalScale = isActive ? 1 : 0.001;
      crystalGroup.scale.set(crystalScale, crystalScale, crystalScale);
      crystalGroup.rotation.y += 0.012;
      crystalGroup.rotation.x += 0.004;
    }
  });

  if (halvingIndex <= 0) return null;

  const handlePointerOver = (e) => {
    e.stopPropagation();
    setHovered(true);
  };

  const handlePointerOut = (e) => {
    e.stopPropagation();
    setHovered(false);
    setPressed(false);
  };

  const handlePointerDown = (e) => {
    e.stopPropagation();
    setPressed(true);
  };

  const handlePointerUp = (e) => {
    e.stopPropagation();
    setPressed(false);
  };

  const handlePointerCancel = (e) => {
    e.stopPropagation();
    setPressed(false);
    setHovered(false);
  };

  return (
    <group ref={groupRef}>
      <group ref={miniCubeGroupRef}>
        <mesh>
          <boxGeometry args={[cubeSize, cubeSize, cubeSize]} />
          <meshPhysicalMaterial
            ref={miniCubeMatRef}
            color={"#0B1020"}
            transparent
            opacity={0.0}
            roughness={0.08}
            metalness={0.0}
            transmission={0.22}
            thickness={0.12}
            ior={1.34}
            reflectivity={0.9}
            clearcoat={1}
            clearcoatRoughness={0.1}
            envMapIntensity={0.9}
            depthWrite={false}
          />
        </mesh>
      </group>

      <mesh rotation={[Math.PI / 2, Math.PI / 4, 0]}>
        <torusGeometry args={[orbRadius * 1.65, 0.0018, 16, 96]} />
        <meshBasicMaterial
          ref={archiveRingMatRef}
          color={"#8b929d"}
          transparent
          opacity={0.012}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </mesh>

      <mesh scale={1.16}>
        <sphereGeometry args={[orbRadius, 24, 24]} />
        <meshPhysicalMaterial
          ref={shellMatRef}
          color={"#585f69"}
          transparent
          opacity={0.02}
          roughness={0.18}
          metalness={0.0}
          transmission={0.86}
          thickness={0.12}
          ior={1.08}
          clearcoat={1}
          clearcoatRoughness={0.18}
          depthWrite={false}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[orbRadius, 32, 32]} />
        <meshStandardMaterial
          ref={coreMatRef}
          color={"#3f454d"}
          emissive={"#3f454d"}
          emissiveIntensity={0.016}
          roughness={0.36}
          metalness={0.06}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[orbRadius * 1.3, 0.0022, 18, 96]} />
        <meshBasicMaterial
          ref={ringMatRef}
          color={"#6b737d"}
          transparent
          opacity={0.018}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <group name="memory-crystal-group" scale={[0.001, 0.001, 0.001]}>
        <mesh>
          <octahedronGeometry args={[orbRadius * 0.28, 0]} />
          <meshBasicMaterial
            ref={crystalMatRef}
            color={"#ffffff"}
            transparent
            opacity={0.0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        <mesh scale={1.45}>
          <octahedronGeometry args={[orbRadius * 0.28, 0]} />
          <meshBasicMaterial
            ref={crystalShellMatRef}
            color={"#ffffff"}
            transparent
            opacity={0.0}
            depthWrite={false}
            blending={THREE.NormalBlending}
          />
        </mesh>
      </group>

      <mesh
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <boxGeometry args={[hitSize, hitSize, hitSize]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}