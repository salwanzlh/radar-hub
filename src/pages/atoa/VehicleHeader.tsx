import { Pencil, Trash2 } from "lucide-react";
import type { AtoaVehicle } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface VehicleHeaderProps {
  vehicle: AtoaVehicle;
  isBase: boolean;
  isComp: boolean;
  onSetBase: () => void;
  onSetComp: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function VehicleHeader({
  vehicle,
  isBase,
  isComp,
  onSetBase,
  onSetComp,
  onEdit,
  onDelete,
}: VehicleHeaderProps) {
  const makerAbbr = vehicle.maker.substring(0, 3).toUpperCase();

  return (
    <th
      className={cn(
        "px-3 py-3 text-center min-w-[110px] max-w-[130px] border-b border-surface-200 relative",
        isBase && "bg-brand-accent/5",
        isComp && "bg-status-info/5"
      )}
    >
      {/* Accent border indicator */}
      {isBase && (
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-brand-accent rounded-t" />
      )}
      {isComp && (
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-status-info rounded-t" />
      )}

      <div className="space-y-1">
        <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
          {makerAbbr}
        </p>
        <p className="text-xs font-semibold text-text-primary truncate" title={vehicle.model}>
          {vehicle.model}
        </p>
        {vehicle.trim && (
          <p className="text-[10px] text-text-secondary truncate" title={vehicle.trim}>
            {vehicle.trim}
          </p>
        )}
      </div>

      {/* B / C buttons */}
      <div className="flex items-center justify-center gap-1 mt-2">
        <button
          onClick={onSetBase}
          className={cn(
            "px-1.5 py-0.5 text-[10px] font-bold rounded transition-colors",
            isBase
              ? "bg-brand-accent text-text-inverse"
              : "bg-surface-100 text-text-tertiary hover:bg-surface-200 hover:text-text-secondary"
          )}
          title="Set as Base"
        >
          B
        </button>
        <button
          onClick={onSetComp}
          className={cn(
            "px-1.5 py-0.5 text-[10px] font-bold rounded transition-colors",
            isComp
              ? "bg-status-info text-white"
              : "bg-surface-100 text-text-tertiary hover:bg-surface-200 hover:text-text-secondary"
          )}
          title="Set as Comp"
        >
          C
        </button>
      </div>

      {/* Edit / Delete */}
      <div className="flex items-center justify-center gap-0.5 mt-1.5">
        <button
          onClick={onEdit}
          className="p-1 text-text-tertiary hover:text-text-primary hover:bg-surface-100 rounded transition-colors"
          title="Edit vehicle"
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-text-tertiary hover:text-status-error hover:bg-status-error-light rounded transition-colors"
          title="Delete vehicle"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </th>
  );
}
