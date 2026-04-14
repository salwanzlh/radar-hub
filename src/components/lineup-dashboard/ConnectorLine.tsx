import { useState, useEffect } from "react";
import { SEVERITY_STROKE } from "./constants";
import type { Finding } from "./types";

interface Props {
  fromId: number; // finding id
  toId: number; // recommendation id
  severity: Finding["severity"];
  isPrimary?: boolean;
  containerId: string;
}

interface Coords {
  y1: number;
  y2: number;
}

export default function ConnectorLine({ fromId, toId, severity, isPrimary = false, containerId }: Props) {
  const [coords, setCoords] = useState<Coords | null>(null);

  useEffect(() => {
    function update() {
      const container = document.getElementById(containerId);
      if (!container) return;
      const from = document.getElementById(`finding-${fromId}`);
      const to = document.getElementById(`rec-${toId}`);
      if (!from || !to) {
        setCoords(null);
        return;
      }
      const cr = container.getBoundingClientRect();
      const fr = from.getBoundingClientRect();
      const tr = to.getBoundingClientRect();
      setCoords({
        y1: fr.top - cr.top + container.scrollTop + fr.height / 2,
        y2: tr.top - cr.top + container.scrollTop + tr.height / 2,
      });
    }
    update();
    const interval = setInterval(update, 200);
    return () => clearInterval(interval);
  }, [fromId, toId, containerId]);

  if (!coords) return null;

  return (
    <line
      x1="0"
      y1={coords.y1}
      x2="100%"
      y2={coords.y2}
      stroke={SEVERITY_STROKE[severity]}
      strokeWidth={isPrimary ? 2.5 : 1.5}
      strokeOpacity={isPrimary ? 0.8 : 0.4}
      strokeDasharray={isPrimary ? undefined : "4 4"}
      style={{ transition: "all 0.3s ease" }}
    />
  );
}
