"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/supabase";

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signIn(email, password);
      router.push("/staff/scan");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="max-w-sm w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-navy-700 border-2 border-navy-400 flex items-center justify-center mx-auto mb-4 shadow-glow">
            <span className="text-2xl">🚗</span>
          </div>
          <h1 className="text-2xl font-bold">Staff Login</h1>
          <p className="text-navy-300 text-sm mt-1">Car Wash Loyalty System</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-navy-300 text-xs uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-navy-800 border border-navy-600 rounded-xl px-4 py-3 text-white placeholder-navy-500 focus:outline-none focus:border-navy-400 transition-colors"
              placeholder="staff@yourcarwash.com"
            />
          </div>

          <div>
            <label className="block text-navy-300 text-xs uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-navy-800 border border-navy-600 rounded-xl px-4 py-3 text-white placeholder-navy-500 focus:outline-none focus:border-navy-400 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-navy-400 hover:bg-navy-300 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-base transition-colors active:scale-95 mt-2"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-navy-500 text-xs mt-8">
          Forgot password? Contact your admin.
        </p>
      </div>
    </main>
  );
}
