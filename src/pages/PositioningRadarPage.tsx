import { Radar } from "lucide-react";

export default function PositioningRadarPage() {
  return (
    <div className="space-y-6">
      <div className="bg-surface-white rounded-[20px] shadow-card p-7">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
            <Radar className="w-8 h-8 text-text-tertiary" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">Positioning Radar</h2>
          <p className="text-sm text-text-tertiary max-w-md">
            Fitur ini sedang dalam pengembangan. Positioning Radar akan menampilkan analisis posisi kompetitif Mitsubishi terhadap pesaing di pasar otomotif Indonesia.
          </p>
        </div>
      </div>
    </div>
  );
}
