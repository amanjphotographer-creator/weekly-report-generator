"use client";
import { useState } from "react";
import StampGrid from "./StampGrid";
import { addStamp, redeemReward } from "@/lib/api";

const STAMPS_REQUIRED = 5;

interface Customer {
  id: string;
  name: string;
  stamp_count: number;
  cycle: number;
}

interface CustomerPanelProps {
  customer: Customer;
  customerToken: string;
  authToken: string;
  onClose: () => void;
  onUpdated: (newCount: number) => void;
}

type ActionState = "idle" | "loading" | "success" | "error";

export default function CustomerPanel({
  customer,
  customerToken,
  authToken,
  onClose,
  onUpdated,
}: CustomerPanelProps) {
  const [stampCount, setStampCount] = useState(customer.stamp_count);
  const [state, setState] = useState<ActionState>("idle");
  const [message, setMessage] = useState("");

  const freeWashReady = stampCount >= STAMPS_REQUIRED;

  async function handleAddStamp() {
    setState("loading");
    try {
      const res = await addStamp(authToken, { customer_token: customerToken });
      setStampCount(res.stamp_count);
      onUpdated(res.stamp_count);
      setMessage(
        res.free_wash_available
          ? "Stamp added! FREE WASH is now available."
          : `Stamp added! ${res.stamps_remaining} more until free wash.`
      );
      setState("success");
    } catch (err: any) {
      setMessage(err.message);
      setState("error");
    }
  }

  async function handleRedeem() {
    setState("loading");
    try {
      await redeemReward(authToken, { customer_token: customerToken });
      setStampCount(0);
      onUpdated(0);
      setMessage("Free wash redeemed! Stamps reset to 0. New cycle started.");
      setState("success");
    } catch (err: any) {
      setMessage(err.message);
      setState("error");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end z-50" onClick={onClose}>
      <div
        className="bg-navy-800 border-t border-navy-600 rounded-t-3xl p-6 w-full max-w-lg mx-auto slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-navy-600 rounded-full mx-auto mb-5" />

        {/* Customer info */}
        <div className="text-center mb-4">
          <p className="text-navy-300 text-xs uppercase tracking-widest">Customer</p>
          <h2 className="text-xl font-bold mt-1">{customer.name}</h2>
          <p className="text-navy-400 text-xs mt-1">Cycle #{customer.cycle}</p>
        </div>

        {/* Stamps */}
        <StampGrid count={stampCount} />
        <p className="text-center text-sm text-navy-300 mb-6">
          {stampCount} / {STAMPS_REQUIRED} stamps
        </p>

        {/* Status message */}
        {message && (
          <div
            className={[
              "rounded-xl px-4 py-3 text-sm text-center mb-4",
              state === "success"
                ? "bg-green-900/40 border border-green-700 text-green-300"
                : "bg-red-900/40 border border-red-700 text-red-300",
            ].join(" ")}
          >
            {message}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          {freeWashReady ? (
            <button
              onClick={handleRedeem}
              disabled={state === "loading"}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-base transition-colors active:scale-95"
            >
              {state === "loading" ? "Processing…" : "Redeem Free Wash"}
            </button>
          ) : (
            <button
              onClick={handleAddStamp}
              disabled={state === "loading"}
              className="w-full bg-navy-400 hover:bg-navy-300 disabled:opacity-50 text-white font-bold py-4 rounded-xl text-base transition-colors active:scale-95"
            >
              {state === "loading" ? "Adding Stamp…" : "Add Stamp"}
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full border border-navy-600 text-navy-300 hover:text-white py-3 rounded-xl text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
