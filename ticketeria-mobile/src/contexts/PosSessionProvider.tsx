import React, { createContext, useContext, useEffect, useState } from 'react';
import { getStoredDeviceToken, getStoredPosId } from '../lib/posDevice';

interface PosSession {
  ready: boolean;
  paired: boolean;
  posId: string | null;
  operator: { operatorId: string; name: string } | null;
  setOperator: (op: { operatorId: string; name: string } | null) => void;
  refreshPaired: () => Promise<void>;
}

const Ctx = createContext<PosSession | null>(null);

export function PosSessionProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [posId, setPosId] = useState<string | null>(null);
  const [operator, setOperator] = useState<PosSession['operator']>(null);

  const refreshPaired = async () => {
    const [token, pid] = await Promise.all([getStoredDeviceToken(), getStoredPosId()]);
    setPosId(token ? pid : null);
  };

  useEffect(() => {
    refreshPaired().finally(() => setReady(true));
  }, []);

  return (
    <Ctx.Provider
      value={{ ready, paired: !!posId, posId, operator, setOperator, refreshPaired }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function usePosSession(): PosSession {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePosSession fora do PosSessionProvider');
  return v;
}
