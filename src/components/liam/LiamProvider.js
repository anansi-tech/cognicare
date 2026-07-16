"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

const LiamContext = createContext(null);

export function LiamProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [client, setClient] = useState({ id: null, name: "" });

  // Cmd-K / Ctrl-K opens LIAM from anywhere.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const bindClient = useCallback((id, name = "") => {
    setClient({ id, name });
  }, []);

  // Route owners release only the client they bound. The id comparison keeps
  // an old page's cleanup from clearing a newer binding during navigation.
  const releaseClient = useCallback((id) => {
    setClient((current) =>
      String(current.id) === String(id) ? { id: null, name: "" } : current
    );
  }, []);

  return (
    <LiamContext.Provider value={{
      open,
      setOpen,
      clientId: client.id,
      clientName: client.name,
      bindClient,
      releaseClient,
    }}>
      {children}
    </LiamContext.Provider>
  );
}

export const useLiam = () => {
  const ctx = useContext(LiamContext);
  if (!ctx) throw new Error("useLiam must be used within LiamProvider");
  return ctx;
};
