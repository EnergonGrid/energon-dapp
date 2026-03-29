import React from "react";
import { Environment } from "@react-three/drei";

import EnergonCube from "./EnergonCube";
import ShockwaveRing from "./ShockwaveRing";
import TransactionSparks from "./TransactionSparks";
import EnergonField from "./EnergonField";
import GridScene from "./GridScene";

export default function SceneController({
  viewMode,
  isConnected,
  mode,
  isBound,
  totalMintedN,
  cubeAddress,
  sparkEvent,
  beat,
  rarityTier,
  isGenesis,
}) {
  if (viewMode === "GRID") {
    return (
      <GridScene
        coherent={isConnected && mode === "COHERENT"}
        totalMinted={totalMintedN}
        cubeAddress={cubeAddress}
      />
    );
  }

  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 4, 2]} intensity={1.35} />
      <pointLight position={[-3, -2, 2]} intensity={0.7} />

      <EnergonField enabled={mode === "COHERENT" && isBound} />

      <TransactionSparks
        enabled={mode === "COHERENT" && isBound}
        event={sparkEvent}
      />

      <ShockwaveRing
        enabled={mode === "COHERENT" && isBound}
        beat={beat}
      />

      <EnergonCube
        beat={beat}
        mode={mode}
        rarityTier={rarityTier}
        isGenesis={isGenesis}
        isBound={isBound}
      />

      <Environment preset="city" />
    </>
  );
}