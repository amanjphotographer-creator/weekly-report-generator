"use client";

interface Stats {
  total_customers: number;
  total_stamps: number;
  total_free_washes_redeemed: number;
  stamps_today: number;
}

interface AdminStatsProps {
  stats: Stats;
}

export default function AdminStats({ stats }: AdminStatsProps) {
  const cards = [
    { label: "Total Customers", value: stats.total_customers, icon: "👥" },
    { label: "Total Stamps", value: stats.total_stamps, icon: "✅" },
    { label: "Free Washes Redeemed", value: stats.total_free_washes_redeemed, icon: "🎁" },
    { label: "Stamps Today", value: stats.stamps_today, icon: "📅" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-navy-800 border border-navy-600 rounded-2xl p-4 flex flex-col"
        >
          <span className="text-2xl mb-2">{c.icon}</span>
          <span className="text-2xl font-bold">{c.value.toLocaleString()}</span>
          <span className="text-navy-300 text-xs mt-1 leading-tight">{c.label}</span>
        </div>
      ))}
    </div>
  );
}
