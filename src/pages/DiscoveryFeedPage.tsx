import { Rss } from "lucide-react";

export default function DiscoveryFeedPage() {
  return (
    <div className="space-y-6">
      <div className="bg-surface-white rounded-[20px] shadow-card p-7">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
            <Rss className="w-8 h-8 text-text-tertiary" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">Discovery Feed</h2>
          <p className="text-sm text-text-tertiary max-w-md">
            Fitur ini sedang dalam pengembangan. Discovery Feed akan menampilkan insight dan rekomendasi berdasarkan data yang telah dikumpulkan.
          </p>
        </div>
      </div>
    </div>
  );
}
