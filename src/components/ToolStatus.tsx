import { useEdenStore } from "../store/edenStore";

export function ToolStatus() {
  const webMcp = useEdenStore((current) => current.webMcp);
  return (
    <div className={`tool-status is-${webMcp.state}`} title={webMcp.message}>
      <span className="tool-status__dot" />
      <span>
        WebMCP{" "}
        {webMcp.state === "available"
          ? `${webMcp.registeredTools.length} tools`
          : webMcp.state}
      </span>
    </div>
  );
}
