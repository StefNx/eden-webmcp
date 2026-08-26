import { useEdenStore } from "../store/edenStore";

function formatPayload(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? "null";
  } catch {
    return "[unserializable value]";
  }
}

export function DeveloperPanel() {
  const webMcp = useEdenStore((current) => current.webMcp);
  const invocation = useEdenStore((current) => current.toolInvocations[0]);

  return (
    <details className="developer-panel">
      <summary>
        <span>WEBMCP DEVELOPER</span>
        <small>{webMcp.registeredTools.length} registered</small>
      </summary>

      <div className="registered-tools" aria-label="Registered WebMCP tools">
        {webMcp.registeredTools.length > 0 ? (
          webMcp.registeredTools.map((tool) => <code key={tool}>{tool}</code>)
        ) : (
          <p>{webMcp.message}</p>
        )}
      </div>

      {invocation ? (
        <div className="invocation-card" aria-live="polite">
          <div>
            <strong>{invocation.toolName}</strong>
            <span className={`invocation-status is-${invocation.status}`}>
              {invocation.status}
            </span>
          </div>
          <small>Design v{invocation.designVersion}</small>
          <label>
            Validated arguments
            <pre>
              {formatPayload(
                invocation.validatedArguments ?? invocation.rawArguments,
              )}
            </pre>
          </label>
          <label>
            Result
            <pre>{formatPayload(invocation.result ?? "Pending…")}</pre>
          </label>
        </div>
      ) : (
        <p className="developer-empty">
          The last site-tool invocation will appear here with its validated input,
          result and design version.
        </p>
      )}
    </details>
  );
}
