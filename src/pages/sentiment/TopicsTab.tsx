import { useQuery } from "@tanstack/react-query";
import {
  Hash,
} from "lucide-react";
import {
  sentimentApi,
  type TopicItem,
} from "@/lib/sentiment-api-client";

export function TopicsTab({ selectedProduct }: { selectedProduct?: string }) {
  const { data: topics, isLoading } = useQuery<TopicItem[]>({
    queryKey: ["sentiment-topics", selectedProduct],
    queryFn: () => sentimentApi.dashboard.topics(selectedProduct),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-surface-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!topics || topics.length === 0) {
    return (
      <div className="text-center py-12 border border-surface-200 rounded-[20px]">
        <Hash className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
        <p className="text-sm text-text-tertiary">No topic data available. Generate a report to see topics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Topics extracted from sentiment analysis reports.
      </p>
      <div className="border border-surface-200 rounded-[20px] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-100 border-b border-surface-200">
              <th className="text-left px-5 py-3 font-medium text-text-secondary">Topic</th>
              <th className="text-right px-5 py-3 font-medium text-text-secondary">Count</th>
              <th className="text-left px-5 py-3 font-medium text-text-secondary">Sentiment Distribution</th>
              <th className="text-right px-5 py-3 font-medium text-text-secondary">Positive</th>
              <th className="text-right px-5 py-3 font-medium text-text-secondary">Neutral</th>
              <th className="text-right px-5 py-3 font-medium text-text-secondary">Negative</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {topics.map((topic, i) => (
              <tr key={i} className="hover:bg-surface-100 transition-colors">
                <td className="px-5 py-3.5 font-medium text-text-primary">{topic.topic}</td>
                <td className="px-5 py-3.5 text-right text-text-secondary">{topic.count}</td>
                <td className="px-5 py-3.5">
                  <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-surface-200">
                    <div
                      className="bg-status-success transition-all"
                      style={{ width: `${topic.positive_pct}%` }}
                    />
                    <div
                      className="bg-blue-500 transition-all"
                      style={{ width: `${topic.neutral_pct}%` }}
                    />
                    <div
                      className="bg-status-error transition-all"
                      style={{ width: `${topic.negative_pct}%` }}
                    />
                  </div>
                </td>
                <td className="px-5 py-3.5 text-right text-status-success text-xs font-medium">
                  {topic.positive_pct.toFixed(1)}%
                </td>
                <td className="px-5 py-3.5 text-right text-blue-500 text-xs font-medium">
                  {topic.neutral_pct.toFixed(1)}%
                </td>
                <td className="px-5 py-3.5 text-right text-status-error text-xs font-medium">
                  {topic.negative_pct.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
