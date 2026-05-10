"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import AdminStats from "@/components/AdminStats";
import { supabase } from "@/lib/supabase";
import { getAnalytics, listCustomers, adjustStamps } from "@/lib/api";

interface Stats {
  total_customers: number;
  total_stamps: number;
  total_free_washes_redeemed: number;
  stamps_today: number;
  recent_activity: any[];
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  stamp_count: number;
  total_stamps: number;
  cycle: number;
  is_active: boolean;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stats" | "customers">("stats");
  const [adjustTarget, setAdjustTarget] = useState<Customer | null>(null);
  const [adjustValue, setAdjustValue] = useState(0);
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustLoading, setAdjustLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace("/staff/login"); return; }
      setAuthToken(data.session.access_token);
    });
  }, [router]);

  useEffect(() => {
    if (!authToken) return;
    getAnalytics(authToken).then(setStats).catch(console.error);
  }, [authToken]);

  const loadCustomers = useCallback(async () => {
    if (!authToken) return;
    setLoading(true);
    try {
      const res = await listCustomers(authToken, { page, search });
      setCustomers(res.customers);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [authToken, page, search]);

  useEffect(() => {
    if (activeTab === "customers") loadCustomers();
  }, [activeTab, loadCustomers]);

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!authToken || !adjustTarget) return;
    setAdjustLoading(true);
    try {
      await adjustStamps(authToken, adjustTarget.id, {
        stamp_count: adjustValue,
        notes: adjustNote,
      });
      setAdjustTarget(null);
      setAdjustNote("");
      loadCustomers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAdjustLoading(false);
    }
  }

  return (
    <main className="flex flex-col min-h-screen p-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-navy-400 text-xs">Admin view</p>
        </div>
        <button
          onClick={() => router.push("/staff/scan")}
          className="bg-navy-400 hover:bg-navy-300 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          Scan
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-navy-800 rounded-xl p-1 mb-6">
        {(["stats", "customers"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={[
              "flex-1 py-2 text-sm font-medium rounded-lg transition-colors capitalize",
              activeTab === tab
                ? "bg-navy-400 text-white"
                : "text-navy-400 hover:text-white",
            ].join(" ")}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Stats tab */}
      {activeTab === "stats" && (
        <>
          {stats ? (
            <>
              <AdminStats stats={stats} />

              {/* Recent activity */}
              <div className="mt-6">
                <h2 className="text-navy-300 text-xs uppercase tracking-widest mb-3">
                  Recent Activity
                </h2>
                {stats.recent_activity.length === 0 ? (
                  <p className="text-navy-500 text-sm text-center py-6">No activity yet</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {stats.recent_activity.map((log: any) => (
                      <div
                        key={log.id}
                        className="bg-navy-800 border border-navy-600 rounded-xl px-4 py-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">
                            {log.action === "stamp" ? "✅" : log.action === "redeem" ? "🎁" : "👁"}
                          </span>
                          <div>
                            <p className="text-sm font-medium capitalize">{log.action}</p>
                            <p className="text-navy-400 text-xs">
                              {new Date(log.scanned_at).toLocaleString("en-GB", {
                                day: "numeric", month: "short",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-navy-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </>
      )}

      {/* Customers tab */}
      {activeTab === "customers" && (
        <>
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or phone…"
            className="w-full bg-navy-800 border border-navy-600 rounded-xl px-4 py-3 text-white placeholder-navy-500 focus:outline-none focus:border-navy-400 mb-4 text-sm"
          />

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-navy-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : customers.length === 0 ? (
            <p className="text-navy-500 text-sm text-center py-12">No customers found</p>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {customers.map((c) => (
                  <div
                    key={c.id}
                    className="bg-navy-800 border border-navy-600 rounded-xl px-4 py-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{c.name}</p>
                        <p className="text-navy-400 text-xs mt-0.5">{c.phone || c.email || "No contact"}</p>
                      </div>
                      <button
                        onClick={() => {
                          setAdjustTarget(c);
                          setAdjustValue(c.stamp_count);
                        }}
                        className="text-navy-300 text-xs border border-navy-600 rounded-lg px-2 py-1 hover:border-navy-400 transition-colors"
                      >
                        Adjust
                      </button>
                    </div>
                    <div className="flex gap-4 mt-3">
                      <div>
                        <p className="text-lg font-bold">{c.stamp_count}/5</p>
                        <p className="text-navy-400 text-xs">Stamps</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{c.total_stamps}</p>
                        <p className="text-navy-400 text-xs">Lifetime</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">#{c.cycle}</p>
                        <p className="text-navy-400 text-xs">Cycle</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-navy-300 text-sm disabled:opacity-40 border border-navy-600 rounded-lg px-3 py-2"
                >
                  Previous
                </button>
                <span className="text-navy-400 text-xs">
                  Page {page} · {total} customers
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * 20 >= total}
                  className="text-navy-300 text-sm disabled:opacity-40 border border-navy-600 rounded-lg px-3 py-2"
                >
                  Next
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* Adjust modal */}
      {adjustTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-end z-50">
          <div className="bg-navy-800 border-t border-navy-600 rounded-t-3xl p-6 w-full max-w-lg mx-auto slide-up">
            <div className="w-10 h-1 bg-navy-600 rounded-full mx-auto mb-5" />
            <h2 className="font-bold text-lg mb-1">Adjust Stamps</h2>
            <p className="text-navy-400 text-sm mb-5">{adjustTarget.name}</p>

            <form onSubmit={handleAdjust} className="flex flex-col gap-4">
              <div>
                <label className="text-navy-300 text-xs uppercase tracking-wider block mb-2">
                  New Stamp Count (0–5)
                </label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={adjustValue}
                  onChange={(e) => setAdjustValue(Number(e.target.value))}
                  className="w-full bg-navy-900 border border-navy-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-navy-400"
                />
              </div>
              <div>
                <label className="text-navy-300 text-xs uppercase tracking-wider block mb-2">
                  Reason / Note
                </label>
                <input
                  type="text"
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="e.g. Correcting duplicate scan"
                  className="w-full bg-navy-900 border border-navy-600 rounded-xl px-4 py-3 text-white placeholder-navy-500 focus:outline-none focus:border-navy-400 text-sm"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setAdjustTarget(null)}
                  className="flex-1 border border-navy-600 text-navy-300 py-3 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustLoading}
                  className="flex-1 bg-navy-400 hover:bg-navy-300 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
                >
                  {adjustLoading ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
