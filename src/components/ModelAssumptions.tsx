import { MODEL_ASSUMPTIONS } from "../simulation/assumptions";

export function ModelAssumptions() {
  return (
    <details className="assumptions-panel">
      <summary>
        <span>MODEL ASSUMPTIONS</span>
        <small>public & simplified</small>
      </summary>
      <ul>
        {MODEL_ASSUMPTIONS.map((assumption) => (
          <li key={assumption.title}>
            <strong>{assumption.title}</strong>
            <span>{assumption.detail}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
