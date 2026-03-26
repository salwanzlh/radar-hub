import { useState, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Trash2, Plus } from "lucide-react";
import { api, type AtoaCategory, type AtoaVehicle } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { VehicleHeader } from "./VehicleHeader";
import toast from "react-hot-toast";

interface ComparisonTableProps {
  categories: AtoaCategory[];
  vehicles: AtoaVehicle[];
  visibleVehicleIds: Set<string>;
  baseId: string | null;
  compId: string | null;
  onSetBase: (id: string) => void;
  onSetComp: (id: string) => void;
  onEditVehicle: (vehicle: AtoaVehicle) => void;
  onDeleteVehicle: (id: string) => void;
  onAddFeature: (categoryId: string) => void;
  onDeleteCategory: (id: string) => void;
  onDeleteFeature: (id: string) => void;
  searchQuery: string;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID").format(price);
}

const VEHICLE_INFO_FIELDS: { key: keyof AtoaVehicle; label: string }[] = [
  { key: "segment", label: "Segment" },
  { key: "retail_price", label: "Price (IDR k)" },
  { key: "model_year", label: "Year" },
  { key: "engine_displacement", label: "Engine" },
  { key: "fuel", label: "Fuel" },
  { key: "transmission", label: "Transmission" },
  { key: "drive_system", label: "Drive" },
  { key: "seat_capacity", label: "Seats" },
];

export function ComparisonTable({
  categories,
  vehicles,
  visibleVehicleIds,
  baseId,
  compId,
  onSetBase,
  onSetComp,
  onEditVehicle,
  onDeleteVehicle,
  onAddFeature,
  onDeleteCategory,
  onDeleteFeature,
  searchQuery,
}: ComparisonTableProps) {
  const queryClient = useQueryClient();
  // All categories collapsed by default — too many features to show at once
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(
    () => new Set(categories.map((c) => c.id))
  );
  const [showVehicleInfo, setShowVehicleInfo] = useState(false);

  const visibleVehicles = useMemo(
    () => vehicles.filter((v) => visibleVehicleIds.has(v.id)),
    [vehicles, visibleVehicleIds]
  );

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const query = searchQuery.toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        features: cat.features.filter((f) =>
          f.sub_item.toLowerCase().includes(query)
        ),
      }))
      .filter((cat) => cat.features.length > 0);
  }, [categories, searchQuery]);

  const toggleCategory = useCallback((catId: string) => {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  }, []);

  const toggleFeatureMutation = useMutation({
    mutationFn: ({ vehicleId, featureId }: { vehicleId: string; featureId: string }) =>
      api.atoa.toggleFeature(vehicleId, featureId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atoa-comparison"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Compute totals: sum of weights for checked features per vehicle
  const vehicleTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const vehicle of visibleVehicles) {
      let total = 0;
      for (const cat of categories) {
        for (const feature of cat.features) {
          if (vehicle.feature_ids.includes(feature.id)) {
            total += feature.weight;
          }
        }
      }
      totals.set(vehicle.id, total);
    }
    return totals;
  }, [visibleVehicles, categories]);

  if (visibleVehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-text-tertiary">
          No vehicles visible. Add vehicles or expand brand groups to see the comparison table.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-auto max-h-[calc(100vh-320px)]">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-20">
          <tr>
            {/* Sticky feature column header */}
            <th className="sticky left-0 z-30 bg-surface-white px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-surface-200 min-w-[200px]">
              Feature
            </th>
            {visibleVehicles.map((vehicle) => (
              <VehicleHeader
                key={vehicle.id}
                vehicle={vehicle}
                isBase={vehicle.id === baseId}
                isComp={vehicle.id === compId}
                onSetBase={() => onSetBase(vehicle.id)}
                onSetComp={() => onSetComp(vehicle.id)}
                onEdit={() => onEditVehicle(vehicle)}
                onDelete={() => onDeleteVehicle(vehicle.id)}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Vehicle Info Section */}
          <tr
            className="cursor-pointer hover:bg-surface-50/50 transition-colors"
            onClick={() => setShowVehicleInfo((prev) => !prev)}
          >
            <td
              colSpan={visibleVehicles.length + 1}
              className="sticky left-0 z-10 bg-surface-100 px-4 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wider"
            >
              <div className="flex items-center gap-1.5">
                {showVehicleInfo ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                Vehicle Info
              </div>
            </td>
          </tr>
          {showVehicleInfo &&
            VEHICLE_INFO_FIELDS.map((field) => (
              <tr key={field.key} className="border-b border-surface-50 hover:bg-surface-50/30 transition-colors">
                <td className="sticky left-0 z-10 bg-surface-white px-4 py-2 text-xs text-text-secondary font-medium">
                  {field.label}
                </td>
                {visibleVehicles.map((vehicle) => {
                  const value = vehicle[field.key];
                  let display: string;
                  if (field.key === "retail_price") {
                    display = formatPrice(vehicle.retail_price);
                  } else {
                    display = value != null ? String(value) : "-";
                  }
                  return (
                    <td
                      key={vehicle.id}
                      className={cn(
                        "px-3 py-2 text-center text-xs text-text-primary border-b border-surface-50",
                        vehicle.id === baseId && "bg-brand-accent/5",
                        vehicle.id === compId && "bg-status-info/5"
                      )}
                    >
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}

          {/* Category Sections */}
          {filteredCategories.map((category) => {
            const isCollapsed = collapsedCats.has(category.id);

            return (
              <CategorySection
                key={category.id}
                category={category}
                isCollapsed={isCollapsed}
                onToggle={() => toggleCategory(category.id)}
                visibleVehicles={visibleVehicles}
                baseId={baseId}
                compId={compId}
                onToggleFeature={(vehicleId, featureId) =>
                  toggleFeatureMutation.mutate({ vehicleId, featureId })
                }
                onAddFeature={() => onAddFeature(category.id)}
                onDeleteCategory={() => onDeleteCategory(category.id)}
                onDeleteFeature={onDeleteFeature}
              />
            );
          })}

          {/* TOTAL Row */}
          <tr className="border-t-2 border-surface-300">
            <td className="sticky left-0 z-10 bg-surface-100 px-4 py-3 text-xs font-bold text-text-primary uppercase tracking-wider">
              Total
            </td>
            {visibleVehicles.map((vehicle) => (
              <td
                key={vehicle.id}
                className={cn(
                  "px-3 py-3 text-center text-sm font-bold text-text-primary",
                  vehicle.id === baseId && "bg-brand-accent/5",
                  vehicle.id === compId && "bg-status-info/5"
                )}
              >
                {vehicleTotals.get(vehicle.id) ?? 0}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ─── Category Section Sub-component ─── */

interface CategorySectionProps {
  category: AtoaCategory;
  isCollapsed: boolean;
  onToggle: () => void;
  visibleVehicles: AtoaVehicle[];
  baseId: string | null;
  compId: string | null;
  onToggleFeature: (vehicleId: string, featureId: string) => void;
  onAddFeature: () => void;
  onDeleteCategory: () => void;
  onDeleteFeature: (id: string) => void;
}

function CategorySection({
  category,
  isCollapsed,
  onToggle,
  visibleVehicles,
  baseId,
  compId,
  onToggleFeature,
  onAddFeature,
  onDeleteCategory,
  onDeleteFeature,
}: CategorySectionProps) {
  return (
    <>
      {/* Category header row */}
      <tr className="bg-surface-100/70">
        <td
          className="sticky left-0 z-10 bg-surface-100 px-4 py-2 cursor-pointer"
          onClick={onToggle}
        >
          <div className="flex items-center gap-1.5">
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5 text-text-tertiary" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-text-tertiary" />
            )}
            <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">
              {category.name}
            </span>
            <span className="text-[10px] text-text-tertiary ml-1">
              ({category.features.length})
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddFeature();
              }}
              className="ml-2 p-0.5 text-text-tertiary hover:text-brand-accent hover:bg-surface-200 rounded transition-colors"
              title="Add feature to this category"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteCategory();
              }}
              className="p-0.5 text-text-tertiary hover:text-status-error hover:bg-status-error-light rounded transition-colors"
              title="Delete category"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </td>
        {visibleVehicles.map((vehicle) => {
          const checkedCount = category.features.filter((f) =>
            vehicle.feature_ids.includes(f.id)
          ).length;
          return (
            <td
              key={vehicle.id}
              className={cn(
                "px-3 py-2 text-center",
                vehicle.id === baseId && "bg-brand-accent/5",
                vehicle.id === compId && "bg-status-info/5"
              )}
            >
              <span className="text-[10px] text-text-tertiary">
                {checkedCount}/{category.features.length}
              </span>
            </td>
          );
        })}
      </tr>

      {/* Feature rows */}
      {!isCollapsed &&
        category.features.map((feature) => (
          <tr
            key={feature.id}
            className="border-b border-surface-50 hover:bg-surface-50/30 transition-colors group"
          >
            <td className="sticky left-0 z-10 bg-surface-white px-4 py-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-primary">{feature.sub_item}</span>
                {feature.weight > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-surface-100 text-text-tertiary rounded">
                    {feature.weight}
                  </span>
                )}
                {feature.remark && (
                  <span className="text-[10px] text-text-tertiary hidden sm:inline" title={feature.remark}>
                    — {feature.remark}
                  </span>
                )}
                <button
                  onClick={() => onDeleteFeature(feature.id)}
                  className="ml-auto p-0.5 text-text-tertiary hover:text-status-error hover:bg-status-error-light rounded transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete feature"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </td>
            {visibleVehicles.map((vehicle) => {
              const isChecked = vehicle.feature_ids.includes(feature.id);
              return (
                <td
                  key={vehicle.id}
                  className={cn(
                    "px-3 py-2 text-center",
                    vehicle.id === baseId && "bg-brand-accent/5",
                    vehicle.id === compId && "bg-status-info/5"
                  )}
                >
                  <label className="inline-flex items-center justify-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleFeature(vehicle.id, feature.id)}
                      className="sr-only peer"
                    />
                    <span
                      className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                        isChecked
                          ? "bg-brand-accent border-brand-accent"
                          : "border-surface-300 hover:border-surface-200 bg-transparent"
                      )}
                    >
                      {isChecked && (
                        <svg
                          className="w-3 h-3 text-text-inverse"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                  </label>
                </td>
              );
            })}
          </tr>
        ))}
    </>
  );
}
