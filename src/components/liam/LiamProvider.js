"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

const LiamContext = createContext(null);

export function LiamProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState(null);
  const [clientName, setClientName] = useState("");

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
    setClientId(id);
    setClientName(name);
  }, []);

  return (
    <LiamContext.Provider value={{ open, setOpen, clientId, clientName, bindClient }}>
      {children}
    </LiamContext.Provider>
  );
}

export const useLiam = () => {
  const ctx = useContext(LiamContext);
  if (!ctx) throw new Error("useLiam must be used within LiamProvider");
  return ctx;
};
