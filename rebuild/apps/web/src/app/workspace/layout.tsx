import type { ReactNode } from "react";
import { Sidebar } from "@/components/shell";
import { WorkspaceGate } from "@/components/workspace-gate";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="workspace">
      <Sidebar />
      <main id="main" className="workspace-main">
        <WorkspaceGate>{children}</WorkspaceGate>
      </main>
    </div>
  );
}
