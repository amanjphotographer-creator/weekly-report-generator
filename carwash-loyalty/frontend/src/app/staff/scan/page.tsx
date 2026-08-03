"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import CustomerPanel from "@/components/CustomerPanel";
import { supabase } from "@/lib/supabase";
import { getCustomerHistory } from "@/lib/api";

// QR scanner must be client-only (accesses camera API)
const QRScanner = dynamic(() => import("@/components/QRScanner"), { ssr: false });

interface ScannedCustomer {
  id: string;
  name: string;
  stamp_count: number;
  cycle: number;
}

export default function ScanPage() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [customer, setCustomer] = useState<ScannedCustomer | null>(null);
  const [scannedToken, setScannedToken] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [staffName, setStaffName] = useState("");

  // Load auth token on mount
  useState(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setAuthToken(data.session.access_token);
        setStaffName(data.session.user.email?.split("@")[0] || "Staff");
      }
    });
  });

  const handleScan = useCallback(
    async (token: string) => {
      if (!authToken || customer) return;
      setScanning(false);

      try {
        const result = await getCustomerHistory(authToken, token);
        setCustomer(result.customer);
        setScannedToken(token);
        setLookupError("");
      } catch (err: any) {
        setLookupError(err.message || "Customer not found");
      }
    },
    [authToken, customer]
  );

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/staff/login");
  }

  return (
    <main className="flex flex-col min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold">Scan Customer</h1>
          <p className="text-navy-400 text-xs mt-0.5">Hi, {staffName}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/staff/dashboard")}
            className="text-navy-300 text-sm border border-navy-600 rounded-lg px-3 py-2 hover:border-navy-400 transition-colors"
          >
            Dashboard
          </button>
          <button
            onClick={handleSignOut}
            className="text-navy-400 text-sm hover:text-white transition-colors px-2"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Scanner toggle */}
      {!scanning && !customer && (
        <div className="flex flex-col items-center gap-6 mt-8">
          <div className="w-24 h-24 bg-navy-800 border-2 border-navy-600 rounded-3xl flex items-center justify-center">
            <span className="text-4xl">📷</span>
          </div>
          <div className="text-center">
            <h2 className="text-lg font-semibold">Ready to scan</h2>
            <p className="text-navy-400 text-sm mt-1">
              Tap below to open the camera and scan a customer QR code
            </p>
          </div>
          <button
            onClick={() => setScanning(true)}
            className="w-full max-w-xs bg-navy-400 hover:bg-navy-300 text-white font-bold py-4 rounded-xl text-base transition-colors active:scale-95"
          >
            Open Camera
          </button>

          {lookupError && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm text-center w-full max-w-xs">
              {lookupError}
              <br />
              <button
                onClick={() => setLookupError("")}
                className="text-xs text-red-400 underline mt-1"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active scanner */}
      {scanning && (
        <div className="flex flex-col items-center gap-4">
          <QRScanner
            onScan={handleScan}
            onError={(msg) => {
              setLookupError(msg);
              setScanning(false);
            }}
          />
          <button
            onClick={() => setScanning(false)}
            className="text-navy-400 text-sm underline hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Register new customer shortcut */}
      {!scanning && !customer && (
        <RegisterCustomerForm authToken={authToken} />
      )}

      {/* Customer action panel (slide-up) */}
      {customer && authToken && (
        <CustomerPanel
          customer={customer}
          customerToken={scannedToken}
          authToken={authToken}
          onClose={() => {
            setCustomer(null);
            setScannedToken("");
          }}
          onUpdated={(newCount) =>
            setCustomer((prev) => prev ? { ...prev, stamp_count: newCount } : null)
          }
        />
      )}
    </main>
  );
}

// ── Inline register form ─────────────────────────────────────────
function RegisterCustomerForm({ authToken }: { authToken: string | null }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ customer: any; qrDataUrl: string } | null>(null);
  const [error, setError] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!authToken) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/customers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ name, phone }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="mt-10 bg-navy-800 border border-navy-600 rounded-2xl p-5 text-center">
        <p className="text-green-400 font-semibold mb-1">Customer Registered!</p>
        <p className="text-white font-bold text-lg">{result.customer.name}</p>
        <p className="text-navy-300 text-xs mb-4">Show or share this QR code</p>
        {result.qrDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={result.qrDataUrl} alt="QR" className="w-40 h-40 mx-auto rounded-xl" />
        )}
        <button
          onClick={() => { setResult(null); setName(""); setPhone(""); setOpen(false); }}
          className="mt-4 text-navy-300 text-sm underline"
        >
          Register another
        </button>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full border border-navy-600 text-navy-300 hover:text-white hover:border-navy-400 py-3 rounded-xl text-sm transition-colors"
      >
        {open ? "Cancel" : "+ Register New Customer"}
      </button>

      {open && (
        <form onSubmit={handleRegister} className="mt-4 flex flex-col gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Customer full name"
            className="w-full bg-navy-800 border border-navy-600 rounded-xl px-4 py-3 text-white placeholder-navy-500 focus:outline-none focus:border-navy-400"
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number (optional)"
            className="w-full bg-navy-800 border border-navy-600 rounded-xl px-4 py-3 text-white placeholder-navy-500 focus:outline-none focus:border-navy-400"
          />
          {error && (
            <p className="text-red-400 text-xs text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-navy-400 hover:bg-navy-300 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors active:scale-95"
          >
            {loading ? "Registering…" : "Register Customer"}
          </button>
        </form>
      )}
    </div>
  );
}
