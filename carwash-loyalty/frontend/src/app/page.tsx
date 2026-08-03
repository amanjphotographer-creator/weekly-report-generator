"use client";
import { useState } from "react";

export default function LandingPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="max-w-sm w-full text-center">
        {/* Logo mark */}
        <div className="w-20 h-20 rounded-full bg-navy-700 border-2 border-navy-400 flex items-center justify-center mx-auto mb-8 shadow-glow">
          <span className="text-3xl">🚗</span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Car Wash Loyalty
        </h1>
        <p className="text-navy-300 text-sm mb-10 leading-relaxed">
          Collect 5 stamps, earn 1 free wash.<br />
          Ask a staff member to register you.
        </p>

        <div className="bg-navy-800 border border-navy-600 rounded-2xl p-6 text-left">
          <h2 className="font-semibold text-navy-300 text-xs uppercase tracking-widest mb-4">
            How it works
          </h2>
          {[
            { n: "1", t: "Get registered", d: "Staff scans or creates your loyalty card." },
            { n: "2", t: "Add to your Wallet", d: "Save to Apple Wallet or Google Wallet." },
            { n: "3", t: "Earn stamps", d: "Show your QR code each visit." },
            { n: "4", t: "Free wash!", d: "Redeem after 5 paid washes." },
          ].map((step) => (
            <div key={step.n} className="flex gap-4 mb-4 last:mb-0">
              <div className="w-8 h-8 rounded-full bg-navy-700 border border-navy-400 flex items-center justify-center text-navy-300 text-sm font-bold shrink-0">
                {step.n}
              </div>
              <div>
                <p className="font-semibold text-sm">{step.t}</p>
                <p className="text-navy-300 text-xs mt-0.5">{step.d}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-navy-400 text-xs mt-8">
          Staff?{" "}
          <a href="/staff/login" className="text-navy-300 underline hover:text-white transition-colors">
            Sign in here
          </a>
        </p>
      </div>
    </main>
  );
}
