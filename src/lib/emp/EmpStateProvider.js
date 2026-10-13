import { createContext, useContext, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useEVaultState } from "@/lib/emp/hooks/useEVaultState";

const EmpStateContext = createContext(null);
const EmpObservationControlContext = createContext(null);

export function EmpStateProvider({ children }) {
  const router = useRouter();
  const [qoriActive, setQoriActive] = useState(false);

  const routeActive = router.pathname === "/evault";
  const active = routeActive || qoriActive;
  const vaultState = useEVaultState({ active });

  const observationControl = useMemo(
    () => ({
      active,
      routeActive,
      qoriActive,
      setQoriActive,
    }),
    [active, routeActive, qoriActive],
  );

  return (
    <EmpObservationControlContext.Provider value={observationControl}>
      <EmpStateContext.Provider value={vaultState}>
        {children}
      </EmpStateContext.Provider>
    </EmpObservationControlContext.Provider>
  );
}

export function useEmpState() {
  const context = useContext(EmpStateContext);

  if (!context) {
    throw new Error("useEmpState must be used inside EmpStateProvider");
  }

  return context;
}

export function useEmpObservationControl() {
  const context = useContext(EmpObservationControlContext);

  if (!context) {
    throw new Error(
      "useEmpObservationControl must be used inside EmpStateProvider",
    );
  }

  return context;
}
