import React from "react";
import { Sparkles } from "@react-three/drei";

export default function EnergonField({ enabled }) {
  if (!enabled) return null;

  return (
    <Sparkles
      count={25}
      speed={0.2}
      opacity={0.75}
      size={4}
      scale={[10, 8, 10]}
      position={[0, 0, -4.6]}
      depthTest
    />
  );
}