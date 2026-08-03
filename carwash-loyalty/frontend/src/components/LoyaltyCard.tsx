"use client";
import StampGrid from "./StampGrid";

const STAMPS_REQUIRED = 5;

interface LoyaltyCardProps {
  name: string;
  stampCount: number;
  cycle: number;
  qrToken: string;
  qrDataUrl: string;
}

export default function LoyaltyCard({
  name,
  stampCount,
  cycle,
  qrToken,
  qrDataUrl,
}: LoyaltyCardProps) {
  const freeWashReady = stampCount >= STAMPS_REQUIRED;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  return (
    <div className="max-w-sm w-full mx-auto">
      {/* Card */}
      <div
        className={[
          "rounded-3xl p-6 shadow-card border transition-all duration-700",
          freeWashReady
            ? "bg-gradient-to-br from-navy-600 to-navy-500 border-navy-300"
            : "bg-gradient-to-br from-navy-800 to-navy-700 border-navy-600",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-navy-300 text-xs uppercase tracking-widest font-medium">
              Loyalty Card
            </p>
            <h1 className="text-xl font-bold mt-0.5">{name}</h1>
          </div>
          <div className="text-right">
            <p className="text-navy-300 text-xs">Cycle</p>
            <p className="text-lg font-bold text-navy-300">#{cycle}</p>
          </div>
        </div>

        {/* Free wash banner */}
        {freeWashReady && (
          <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-center mb-4">
            <p className="text-white font-bold text-sm tracking-wide">
              FREE WASH AVAILABLE!
            </p>
            <p className="text-white/70 text-xs mt-0.5">
              Show this to staff to redeem
            </p>
          </div>
        )}

        {/* Stamp grid */}
        <StampGrid count={stampCount} />

        <p className="text-center text-navy-300 text-xs mb-6">
          {freeWashReady
            ? "You've earned a free wash!"
            : `${STAMPS_REQUIRED - stampCount} more wash${STAMPS_REQUIRED - stampCount !== 1 ? "es" : ""} until your free wash`}
        </p>

        {/* QR code */}
        <div className="flex flex-col items-center">
          <div className="bg-white rounded-2xl p-3 shadow-lg">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="Your loyalty QR code"
                className="w-36 h-36"
              />
            ) : (
              <div className="w-36 h-36 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-400 text-xs text-center px-2">QR loading…</p>
              </div>
            )}
          </div>
          <p className="text-navy-400 text-xs mt-2">Show this QR code at the car wash</p>
        </div>
      </div>

      {/* Wallet buttons */}
      <div className="flex flex-col gap-3 mt-4">
        <a
          href={`${apiUrl}/api/wallet/apple/${qrToken}`}
          className="flex items-center justify-center gap-2 bg-black text-white font-semibold py-3 px-6 rounded-xl hover:opacity-90 active:scale-95 transition-all"
        >
          <AppleWalletIcon />
          Add to Apple Wallet
        </a>
        <a
          href={`${apiUrl}/api/wallet/google/${qrToken}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 bg-white text-navy-900 font-semibold py-3 px-6 rounded-xl hover:opacity-90 active:scale-95 transition-all"
        >
          <GoogleWalletIcon />
          Add to Google Wallet
        </a>
      </div>

      {/* Disclaimer */}
      <p className="text-center text-navy-500 text-xs mt-6">
        This card is linked to your account. Please do not share.
      </p>
    </div>
  );
}

function AppleWalletIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M14.94 5.19A4.38 4.38 0 0016 2a4.44 4.44 0 00-3 1.52 4.17 4.17 0 00-1 3.09 3.69 3.69 0 002.94-1.42zm2.52 7.44a4.51 4.51 0 012.16-3.81 4.66 4.66 0 00-3.66-2c-1.56-.16-3 .91-3.83.91-.83 0-2-.89-3.3-.87a4.92 4.92 0 00-4.14 2.53C2.93 12.45 4.24 17 6 19.47c.8 1.21 1.8 2.58 3.12 2.53 1.25-.05 1.72-.8 3.23-.8s1.94.8 3.28.77c1.35-.03 2.2-1.24 3-2.45a11 11 0 001.38-2.85 4.41 4.41 0 01-2.55-4.04z"/>
    </svg>
  );
}

function GoogleWalletIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" fill="#4285F4"/>
      <path d="M12 5.5c1.77 0 3.32.6 4.55 1.77l-1.9 1.9C13.99 8.53 13.07 8.18 12 8.18c-2.1 0-3.88 1.42-4.52 3.33H5.4a6.5 6.5 0 016.6-6.01z" fill="#EA4335"/>
      <path d="M7.48 14.5c.2.58.5 1.12.88 1.6L6.6 17.85A6.5 6.5 0 015.4 14.5h2.08z" fill="#FBBC05"/>
      <path d="M12 18.5c1.18 0 2.28-.4 3.14-1.06l1.76 1.76A6.47 6.47 0 0112 20.5a6.5 6.5 0 01-5.4-2.65l1.76-1.76c.9.91 2.14 1.41 3.64 1.41z" fill="#34A853"/>
      <path d="M18.6 12c0-.45-.05-.88-.13-1.3H12v2.46h3.72a3.2 3.2 0 01-1.38 2.1l2.14 1.66A6.5 6.5 0 0018.6 12z" fill="#4285F4"/>
    </svg>
  );
}
