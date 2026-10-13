import { useEffect, useMemo, useRef } from "react";
import { useEmpState } from "@/lib/emp/EmpStateProvider";
import { normalizeEmpObservation } from "@/lib/qori/normalizeEmpObservation";

export function useQoriEmpObservation(core = {}) {
  const emp = useEmpState();
  const previousRef = useRef(null);

  const observation = useMemo(
    () =>
      normalizeEmpObservation({
        core,
        emp,
        previous: previousRef.current,
        walletAddress: core.walletAddress || "",
      }),
    [
      core.walletConnected,
      core.walletAddress,
      core.guardianState,
      core.cubeBalance,
      core.readStatus,
      emp,
    ],
  );

  useEffect(() => {
    previousRef.current = observation;
  }, [observation]);

  return observation;
}

export default useQoriEmpObservation;
