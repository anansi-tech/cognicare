"use client";

import { SessionProvider } from "next-auth/react";
import { AIWorkflowProvider } from "./context/AIWorkflowContext";

export function Providers({ children }) {
  return (
    <SessionProvider>
      <AIWorkflowProvider>{children}</AIWorkflowProvider>
    </SessionProvider>
  );
}
