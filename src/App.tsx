import { useEffect, useRef } from "react";
import { HabitatCanvas } from "./components/HabitatCanvas";
import { MissionPanel } from "./components/MissionPanel";
import { ResourcePanel } from "./components/ResourcePanel";
import { SimulationPanel } from "./components/SimulationPanel";
import { ToolStatus } from "./components/ToolStatus";
import { demoStateFromSearch, loadDemoState } from "./demo/loadDemoState";
import { registerEdenTools } from "./webmcp/registerEdenTools";

export default function App() {
  const demoLoaded = useRef(false);

  useEffect(() => {
    if (demoLoaded.current) return;
    demoLoaded.current = true;
    const demoState = demoStateFromSearch(window.location.search);
    if (demoState) loadDemoState(demoState);
  }, []);

  useEffect(() => registerEdenTools(), []);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            E
          </div>
          <div>
            <strong>EDEN</strong>
            <span>AI builds. Reality attacks. Human decides.</span>
          </div>
        </div>
        <div className="topbar-center">
          CLOSED-LOOP HABITAT LAB <span>/</span> ARES GAUNTLET
        </div>
        <ToolStatus />
      </header>

      <div className="workspace">
        <MissionPanel />
        <HabitatCanvas />
        <ResourcePanel />
      </div>
      <SimulationPanel />

      <footer className="disclaimer">
        Educational systems-design simulator. Not scientific mission-planning or
        safety-critical engineering software.
      </footer>
    </main>
  );
}
