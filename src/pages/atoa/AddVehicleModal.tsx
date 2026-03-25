import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, Check } from "lucide-react";
import { api, type AtoaVehicle } from "@/lib/api-client";
import toast from "react-hot-toast";

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle?: AtoaVehicle;
}

interface VehicleForm {
  maker: string;
  model: string;
  trim: string;
  segment: string;
  model_year: string;
  retail_price: string;
  engine_displacement: string;
  fuel: string;
  transmission: string;
  drive_system: string;
  seat_capacity: string;
}

const INITIAL_FORM: VehicleForm = {
  maker: "",
  model: "",
  trim: "",
  segment: "",
  model_year: "",
  retail_price: "",
  engine_displacement: "",
  fuel: "",
  transmission: "",
  drive_system: "",
  seat_capacity: "",
};

const FUEL_OPTIONS = ["", "Petrol", "Diesel", "Hybrid", "Electric"];
const TRANSMISSION_OPTIONS = ["", "MT", "AT", "CVT", "IVT", "DCT"];
const DRIVE_SYSTEM_OPTIONS = ["", "2WD", "4WD", "AWD"];

const inputClass =
  "w-full px-3.5 py-2.5 text-sm bg-surface-100 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent text-text-primary placeholder:text-text-tertiary";

const labelClass =
  "block text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-2";

export function AddVehicleModal({ isOpen, onClose, vehicle }: AddVehicleModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!vehicle;

  const [form, setForm] = useState<VehicleForm>(INITIAL_FORM);

  useEffect(() => {
    if (vehicle) {
      setForm({
        maker: vehicle.maker,
        model: vehicle.model,
        trim: vehicle.trim ?? "",
        segment: vehicle.segment ?? "",
        model_year: vehicle.model_year ?? "",
        retail_price: String(vehicle.retail_price),
        engine_displacement: vehicle.engine_displacement ?? "",
        fuel: vehicle.fuel ?? "",
        transmission: vehicle.transmission ?? "",
        drive_system: vehicle.drive_system ?? "",
        seat_capacity: vehicle.seat_capacity != null ? String(vehicle.seat_capacity) : "",
      });
    } else {
      setForm(INITIAL_FORM);
    }
  }, [vehicle, isOpen]);

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof api.atoa.createVehicle>[0]) =>
      api.atoa.createVehicle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atoa-comparison"] });
      toast.success("Vehicle created");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.atoa.updateVehicle>[1] }) =>
      api.atoa.updateVehicle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["atoa-comparison"] });
      toast.success("Vehicle updated");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const priceValue = parseInt(form.retail_price, 10);
    if (!form.maker || !form.model || isNaN(priceValue)) return;

    const payload = {
      maker: form.maker,
      model: form.model,
      retail_price: priceValue,
      trim: form.trim || undefined,
      segment: form.segment || undefined,
      model_year: form.model_year || undefined,
      engine_displacement: form.engine_displacement || undefined,
      fuel: form.fuel || undefined,
      transmission: form.transmission || undefined,
      drive_system: form.drive_system || undefined,
      seat_capacity: form.seat_capacity ? parseInt(form.seat_capacity, 10) : undefined,
    };

    if (isEditing && vehicle) {
      updateMutation.mutate({ id: vehicle.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function setField(field: keyof VehicleForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  if (!isOpen) return null;

  const isValid = form.maker.trim() && form.model.trim() && form.retail_price.trim() && !isNaN(parseInt(form.retail_price, 10));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface-white rounded-2xl shadow-dropdown w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
          <h2 className="text-base font-semibold text-text-primary">
            {isEditing ? "Edit Vehicle" : "Add Vehicle"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Maker + Model */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Maker <span className="text-status-error">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Mitsubishi"
                value={form.maker}
                onChange={(e) => setField("maker", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Model <span className="text-status-error">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Xpander"
                value={form.model}
                onChange={(e) => setField("model", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Trim + Segment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Trim</label>
              <input
                type="text"
                placeholder="e.g. Ultimate CVT"
                value={form.trim}
                onChange={(e) => setField("trim", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Segment</label>
              <input
                type="text"
                placeholder="e.g. Small MPV"
                value={form.segment}
                onChange={(e) => setField("segment", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Model Year + Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Model Year</label>
              <input
                type="text"
                placeholder="e.g. 2025"
                value={form.model_year}
                onChange={(e) => setField("model_year", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Retail Price (IDR thousands) <span className="text-status-error">*</span>
              </label>
              <input
                type="number"
                placeholder="e.g. 289000"
                value={form.retail_price}
                onChange={(e) => setField("retail_price", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Engine + Fuel */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Engine Displacement</label>
              <input
                type="text"
                placeholder="e.g. 1.5L"
                value={form.engine_displacement}
                onChange={(e) => setField("engine_displacement", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Fuel</label>
              <select
                value={form.fuel}
                onChange={(e) => setField("fuel", e.target.value)}
                className={inputClass}
              >
                {FUEL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt || "-- Select --"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Transmission + Drive System */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Transmission</label>
              <select
                value={form.transmission}
                onChange={(e) => setField("transmission", e.target.value)}
                className={inputClass}
              >
                {TRANSMISSION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt || "-- Select --"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Drive System</label>
              <select
                value={form.drive_system}
                onChange={(e) => setField("drive_system", e.target.value)}
                className={inputClass}
              >
                {DRIVE_SYSTEM_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt || "-- Select --"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Seat Capacity */}
          <div className="w-1/2 pr-2">
            <label className={labelClass}>Seat Capacity</label>
            <input
              type="number"
              placeholder="e.g. 7"
              value={form.seat_capacity}
              onChange={(e) => setField("seat_capacity", e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-surface-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-surface-200 rounded-xl hover:bg-surface-100 transition-colors text-text-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || isPending}
              className="px-5 py-2 text-sm bg-brand-accent text-text-inverse rounded-xl hover:bg-brand-accent-hover disabled:opacity-60 flex items-center gap-1.5 font-medium"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              {isEditing ? "Save Changes" : "Create Vehicle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
