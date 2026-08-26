import type { HabitatDesign } from "./types";

export function cloneDesign(design: HabitatDesign): HabitatDesign {
  return {
    ...design,
    modules: design.modules.map((module) => ({
      ...module,
      position: { ...module.position },
    })),
    connections: design.connections.map((connection) => ({ ...connection })),
    constraints: { ...design.constraints },
  };
}
