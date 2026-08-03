"use client";
import { useEffect, useRef, useState } from "react";

interface QRScannerProps {
  onScan: (result: string) => void;
  onError?: (err: string) => void;
}

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let scanner: any;

    async function start() {
      setStatus("starting");
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const id = "qr-reader-" + Math.random().toString(36).slice(2);
        if (containerRef.current) containerRef.current.id = id;

        scanner = new Html5Qrcode(id);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText: string) => {
            // Extract token from URL if user has a card URL encoded in QR
            const match = decodedText.match(/\/card\/([a-f0-9]+)$/);
            const token = match ? match[1] : decodedText;
            onScan(token);
          },
          () => {} // ignore per-frame errors
        );

        setStatus("scanning");
      } catch (err: any) {
        const msg = err?.message || "Camera access denied";
        setErrorMsg(msg);
        setStatus("error");
        onError?.(msg);
      }
    }

    start();

    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full flex flex-col items-center">
      {status === "starting" && (
        <div className="flex items-center gap-2 text-navy-300 text-sm mb-4">
          <div className="w-4 h-4 border-2 border-navy-400 border-t-transparent rounded-full animate-spin" />
          Starting camera…
        </div>
      )}

      {status === "error" && (
        <div className="bg-red-900/40 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm mb-4 text-center">
          {errorMsg}
          <br />
          <span className="text-xs text-red-400">
            Please allow camera access and reload.
          </span>
        </div>
      )}

      {/* Camera viewport */}
      <div
        ref={containerRef}
        className="w-full max-w-xs rounded-2xl overflow-hidden border border-navy-600 bg-navy-900"
        style={{ minHeight: 280 }}
      />

      {status === "scanning" && (
        <p className="text-navy-400 text-xs mt-3 text-center">
          Point at customer's QR code
        </p>
      )}
    </div>
  );
}
