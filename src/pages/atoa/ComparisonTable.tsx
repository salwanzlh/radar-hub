import { useState, useMemo, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Trash2, Plus, Pencil, Check, X } from "lucide-react";
import { api, type AtoaCategory, type AtoaVehicle, type AtoaFeature } from "@/lib/api-client";
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
          <tr className="bg-surface-white">
            {/* Sticky feature column header */}
            <th className="sticky left-0 z-30 bg-surface-white px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-surface-200 min-w-[200px]">
              Feature
            </th>
            <th className="bg-surface-white px-2 py-3 text-center text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-surface-200 min-w-[50px]">
              Val
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
              colSpan={visibleVehicles.length + 2}
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
                <td />
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
            <td className="bg-surface-100 px-2 py-3" />
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

/* ─── Feature Name Cell with Inline Edit ─── */

function FeatureNameCell({
  feature,
  isDiff,
  onDeleteFeature,
}: {
  feature: AtoaFeature;
  isDiff: boolean;
  onDeleteFeature: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editSubItem, setEditSubItem] = useState(feature.sub_item);
  const [editRemark, setEditRemark] = useState(feature.remark ?? "");
  const [editWeight, setEditWeight] = useState(String(feature.weight ?? 0));

  const updateMutation = useMutation({
    mutationFn: (data: { sub_item?: string; remark?: string; weight?: number }) =>
      api.atoa.updateFeature(feature.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atoa-comparison"] });
      setEditing(false);
      toast.success("Feature updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSave = () => {
    updateMutation.mutate({
      sub_item: editSubItem.trim() || feature.sub_item,
      remark: editRemark.trim() || undefined,
      weight: parseInt(editWeight, 10) || 0,
    });
  };

  const handleCancel = () => {
    setEditSubItem(feature.sub_item);
    setEditRemark(feature.remark ?? "");
    setEditWeight(String(feature.weight ?? 0));
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  };

  if (editing) {
    return (
      <>
        <td className={cn("sticky left-0 z-10 px-4 py-1.5", isDiff ? "bg-status-warning/[0.06]" : "bg-surface-white")}>
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={editSubItem}
              onChange={(e) => setEditSubItem(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 min-w-0 px-2 py-1 text-sm bg-surface-50 border border-surface-200 rounded-lg text-text-primary focus:outline-none focus:border-brand-accent/50"
              placeholder="Sub item"
            />
            <input
              value={editRemark}
              onChange={(e) => setEditRemark(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-28 px-2 py-1 text-xs bg-surface-50 border border-surface-200 rounded-lg text-text-secondary focus:outline-none focus:border-brand-accent/50"
              placeholder="Remark"
            />
            <button onClick={handleSave} disabled={updateMutation.isPending} className="p-1 text-status-success hover:bg-status-success-light rounded transition-colors" title="Save">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleCancel} className="p-1 text-text-tertiary hover:bg-surface-200 rounded transition-colors" title="Cancel">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </td>
        <td className="px-2 py-1.5 text-center">
          <input
            value={editWeight}
            onChange={(e) => setEditWeight(e.target.value)}
            onKeyDown={handleKeyDown}
            type="number"
            className="w-12 px-1 py-1 text-[11px] text-center bg-surface-50 border border-surface-200 rounded-lg text-text-primary focus:outline-none focus:border-brand-accent/50"
          />
        </td>
      </>
    );
  }

  return (
    <>
      <td className={cn("sticky left-0 z-10 px-4 py-2", isDiff ? "bg-status-warning/[0.06]" : "bg-surface-white")}>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-primary">{feature.sub_item}</span>
          {feature.remark && (
            <span className="text-xs text-text-tertiary hidden sm:inline" title={feature.remark}>
              — {feature.remark}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
            {isDiff && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-status-warning/20 text-status-warning rounded-full uppercase">
                diff
              </span>
            )}
            <button
              onClick={() => setEditing(true)}
              className="p-0.5 text-text-tertiary hover:text-brand-accent hover:bg-surface-100 rounded transition-colors opacity-0 group-hover:opacity-100"
              title="Edit feature"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={() => onDeleteFeature(feature.id)}
              className="p-0.5 text-text-tertiary hover:text-status-error hover:bg-status-error-light rounded transition-colors opacity-0 group-hover:opacity-100"
              title="Delete feature"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </td>
      <td className="px-2 py-2 text-center">
        <span className="text-[10px] font-medium text-text-tertiary">{feature.weight || '-'}</span>
      </td>
    </>
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
  // Count features that differ between base and comp
  const baseVehicle = baseId ? visibleVehicles.find((v) => v.id === baseId) : null;
  const compVehicle = compId ? visibleVehicles.find((v) => v.id === compId) : null;
  const diffCount = baseVehicle && compVehicle
    ? category.features.filter((f) => baseVehicle.feature_ids.includes(f.id) !== compVehicle.feature_ids.includes(f.id)).length
    : 0;

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
            {diffCount > 0 && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-status-warning/20 text-status-warning rounded-full">
                {diffCount} diff
              </span>
            )}
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
        <td className="bg-surface-100/70 px-2 py-2" />
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
        category.features.map((feature) => {
          const baseHas = baseId ? visibleVehicles.find((v) => v.id === baseId)?.feature_ids.includes(feature.id) : undefined;
          const compHas = compId ? visibleVehicles.find((v) => v.id === compId)?.feature_ids.includes(feature.id) : undefined;
          const isDiff = baseId && compId && baseHas !== undefined && compHas !== undefined && baseHas !== compHas;

          return (
          <tr
            key={feature.id}
            className={cn(
              "border-b border-surface-50 hover:bg-surface-50/30 transition-colors group",
              isDiff && "bg-status-warning/[0.04]"
            )}
          >
            <FeatureNameCell
              feature={feature}
              isDiff={!!isDiff}
              onDeleteFeature={onDeleteFeature}
            />
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
          );
        })}
    </>
  );
}
