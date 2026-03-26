import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search, Plus, ChevronsDownUp, ChevronsUpDown, GitCompareArrows, Radar } from "lucide-react";
import { api, type AtoaVehicle } from "@/lib/api-client";
import toast from "react-hot-toast";

import { SummaryCards } from "./SummaryCards";
import { BrandChipBar } from "./BrandChipBar";
import { ComparisonTable } from "./ComparisonTable";
import { AddVehicleModal } from "./AddVehicleModal";
import { AddCategoryModal } from "./AddCategoryModal";
import { AddFeatureModal } from "./AddFeatureModal";

type FilterMode = "all" | "base" | "comp" | "basecomp";

export function AtoaPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // ── State ──
  const [baseId, setBaseId] = useState<string | null>(null);
  const [compId, setCompId] = useState<string | null>(null);
  const [expandedBrands, setExpandedBrands] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<FilterMode>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddFeature, setShowAddFeature] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<AtoaVehicle | null>(null);
  const [addFeatureCategoryId, setAddFeatureCategoryId] = useState<string | undefined>(undefined);

  // ── Queries ──
  const {
    data: comparison,
    isLoading: comparisonLoading,
  } = useQuery({
    queryKey: ["atoa-comparison"],
    queryFn: api.atoa.getComparison,
  });

  const {
    data: metrics,
    isLoading: metricsLoading,
  } = useQuery({
    queryKey: ["atoa-metrics", baseId, compId],
    queryFn: () => api.atoa.getMetrics(baseId!, compId!),
    enabled: !!baseId && !!compId,
  });

  // ── Mutations ──
  const deleteVehicleMutation = useMutation({
    mutationFn: (id: string) => api.atoa.deleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atoa-comparison"] });
      toast.success("Vehicle deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => api.atoa.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atoa-comparison"] });
      toast.success("Category deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteFeatureMutation = useMutation({
    mutationFn: (id: string) => api.atoa.deleteFeature(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atoa-comparison"] });
      toast.success("Feature deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const vehicles = comparison?.vehicles ?? [];
  const categories = comparison?.categories ?? [];

  // ── Initialize base/comp and expanded brands from data ──
  useEffect(() => {
    if (!comparison) return;

    // Initialize baseId to first vehicle if not set
    if (!baseId && comparison.vehicles.length > 0) {
      setBaseId(comparison.vehicles[0].id);
    }

    // Clear baseId/compId if vehicle was deleted
    if (baseId && !comparison.vehicles.find((v) => v.id === baseId)) {
      setBaseId(comparison.vehicles.length > 0 ? comparison.vehicles[0].id : null);
    }
    if (compId && !comparison.vehicles.find((v) => v.id === compId)) {
      setCompId(null);
    }

    // Initialize all brands expanded
    const allBrands = new Set(comparison.vehicles.map((v) => v.maker));
    setExpandedBrands((prev) => {
      // Only initialize if empty (first load)
      if (prev.size === 0 && allBrands.size > 0) return allBrands;
      return prev;
    });
  }, [comparison, baseId, compId]);



  // ── Computed: visible vehicle IDs ──
  const visibleVehicleIds = useMemo(() => {
    const ids = new Set<string>();

    if (activeFilter === "basecomp") {
      if (baseId) ids.add(baseId);
      if (compId) ids.add(compId);
      return ids;
    }

    const baseVehicle = vehicles.find((v) => v.id === baseId);
    const compVehicle = vehicles.find((v) => v.id === compId);

    let brandsToShow: Set<string>;

    if (activeFilter === "base" && baseVehicle) {
      brandsToShow = new Set([baseVehicle.maker]);
    } else if (activeFilter === "comp" && compVehicle) {
      brandsToShow = new Set([compVehicle.maker]);
    } else {
      brandsToShow = expandedBrands;
    }

    for (const vehicle of vehicles) {
      if (brandsToShow.has(vehicle.maker)) {
        ids.add(vehicle.id);
      }
    }

    return ids;
  }, [vehicles, expandedBrands, activeFilter, baseId, compId]);

  // ── Helpers ──
  const baseVehicle = vehicles.find((v) => v.id === baseId) ?? null;
  const compVehicle = vehicles.find((v) => v.id === compId) ?? null;

  const handleToggleBrand = useCallback((brand: string) => {
    setExpandedBrands((prev) => {
      const next = new Set(prev);
      if (next.has(brand)) {
        next.delete(brand);
      } else {
        next.add(brand);
      }
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    setExpandedBrands(new Set(vehicles.map((v) => v.maker)));
  }, [vehicles]);

  const handleCollapseAll = useCallback(() => {
    setExpandedBrands(new Set());
  }, []);

  const handleDeleteVehicle = useCallback(
    (id: string) => {
      if (confirm("Delete this vehicle? This will remove all its feature assignments.")) {
        deleteVehicleMutation.mutate(id);
      }
    },
    [deleteVehicleMutation]
  );

  const handleDeleteCategory = useCallback(
    (id: string) => {
      if (confirm("Delete this category? All features in this category will also be deleted.")) {
        deleteCategoryMutation.mutate(id);
      }
    },
    [deleteCategoryMutation]
  );

  const handleDeleteFeature = useCallback(
    (id: string) => {
      if (confirm("Delete this feature?")) {
        deleteFeatureMutation.mutate(id);
      }
    },
    [deleteFeatureMutation]
  );

  const handleEditVehicle = useCallback((vehicle: AtoaVehicle) => {
    setEditingVehicle(vehicle);
    setShowAddVehicle(true);
  }, []);

  const handleAddFeature = useCallback((categoryId: string) => {
    setAddFeatureCategoryId(categoryId);
    setShowAddFeature(true);
  }, []);

  const handleCloseVehicleModal = useCallback(() => {
    setShowAddVehicle(false);
    setEditingVehicle(null);
  }, []);

  const handleCloseFeatureModal = useCallback(() => {
    setShowAddFeature(false);
    setAddFeatureCategoryId(undefined);
  }, []);

  const handleViewRadar = useCallback(() => {
    const params = new URLSearchParams();
    if (baseId) params.set("base", baseId);
    if (compId) params.set("comp", compId);
    navigate(`/radar?${params.toString()}`);
  }, [baseId, compId, navigate]);

  // ── Loading state ──
  if (comparisonLoading) {
    return (
      <div className="space-y-6">
        <SummaryCards baseVehicle={null} compVehicle={null} metrics={null} isLoading={true} />
        <div className="bg-surface-white rounded-[20px] shadow-card p-7">
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-surface-100 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Empty state ──
  if (vehicles.length === 0 && categories.length === 0) {
    return (
      <div className="space-y-6">
        <SummaryCards baseVehicle={null} compVehicle={null} metrics={null} isLoading={false} />
        <div className="bg-surface-white rounded-[20px] shadow-card p-7">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
              <GitCompareArrows className="w-8 h-8 text-text-tertiary" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">No Comparison Data</h2>
            <p className="text-sm text-text-tertiary max-w-md mb-6">
              Start by adding vehicles and categories to build your feature comparison matrix.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAddCategory(true)}
                className="px-4 py-2 text-sm bg-surface-100 text-text-secondary rounded-xl hover:bg-surface-200 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Category
              </button>
              <button
                onClick={() => {
                  setEditingVehicle(null);
                  setShowAddVehicle(true);
                }}
                className="px-4 py-2 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Vehicle
              </button>
            </div>
          </div>
        </div>

        <AddVehicleModal isOpen={showAddVehicle} onClose={handleCloseVehicleModal} vehicle={editingVehicle ?? undefined} />
        <AddCategoryModal isOpen={showAddCategory} onClose={() => setShowAddCategory(false)} />
        <AddFeatureModal isOpen={showAddFeature} onClose={handleCloseFeatureModal} categoryId={addFeatureCategoryId} categories={categories} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with View in Radar */}
      <div className="flex items-center justify-between">
        <div />
        <button
          onClick={handleViewRadar}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-surface-100 hover:bg-surface-200 rounded-lg transition-colors"
        >
          <Radar className="w-3.5 h-3.5" />
          View in Radar
        </button>
      </div>

      {/* Summary Cards */}
      <SummaryCards
        baseVehicle={baseVehicle}
        compVehicle={compVehicle}
        metrics={metricsLoading ? null : (metrics ?? null)}
        isLoading={false}
      />

      {/* Main Card */}
      <div className="bg-surface-white rounded-[20px] shadow-card p-7">
        {/* Brand Chips + Filter */}
        <div className="mb-4">
          <BrandChipBar
            vehicles={vehicles}
            expandedBrands={expandedBrands}
            onToggleBrand={handleToggleBrand}
            activeFilter={activeFilter}
            onFilterChange={(filter) => setActiveFilter(filter as FilterMode)}
            baseId={baseId}
            compId={compId}
          />
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search features..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary placeholder:text-text-tertiary"
            />
          </div>

          {/* Expand / Collapse */}
          <button
            onClick={handleExpandAll}
            className="px-3 py-2 text-xs font-medium bg-surface-100 text-text-secondary rounded-xl hover:bg-surface-200 transition-colors flex items-center gap-1.5"
          >
            <ChevronsUpDown className="w-3.5 h-3.5" /> Expand All
          </button>
          <button
            onClick={handleCollapseAll}
            className="px-3 py-2 text-xs font-medium bg-surface-100 text-text-secondary rounded-xl hover:bg-surface-200 transition-colors flex items-center gap-1.5"
          >
            <ChevronsDownUp className="w-3.5 h-3.5" /> Collapse All
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Add buttons */}
          <button
            onClick={() => setShowAddCategory(true)}
            className="px-3 py-2 text-xs font-medium bg-surface-100 text-text-secondary rounded-xl hover:bg-surface-200 transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Add Category
          </button>
          <button
            onClick={() => {
              setEditingVehicle(null);
              setShowAddVehicle(true);
            }}
            className="px-4 py-2 text-sm font-medium bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Vehicle
          </button>
        </div>

        {/* Comparison Table */}
        <ComparisonTable
          categories={categories}
          vehicles={vehicles}
          visibleVehicleIds={visibleVehicleIds}
          baseId={baseId}
          compId={compId}
          onSetBase={setBaseId}
          onSetComp={setCompId}
          onEditVehicle={handleEditVehicle}
          onDeleteVehicle={handleDeleteVehicle}
          onAddFeature={handleAddFeature}
          onDeleteCategory={handleDeleteCategory}
          onDeleteFeature={handleDeleteFeature}
          searchQuery={searchQuery}
        />
      </div>

      {/* Modals */}
      <AddVehicleModal
        isOpen={showAddVehicle}
        onClose={handleCloseVehicleModal}
        vehicle={editingVehicle ?? undefined}
      />
      <AddCategoryModal
        isOpen={showAddCategory}
        onClose={() => setShowAddCategory(false)}
      />
      <AddFeatureModal
        isOpen={showAddFeature}
        onClose={handleCloseFeatureModal}
        categoryId={addFeatureCategoryId}
        categories={categories}
      />
    </div>
  );
}
