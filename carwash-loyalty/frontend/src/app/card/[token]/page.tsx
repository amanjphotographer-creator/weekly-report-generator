import { Metadata } from "next";
import LoyaltyCard from "@/components/LoyaltyCard";
import QRCode from "qrcode";

interface PageProps {
  params: { token: string };
}

async function getCustomer(token: string) {
  const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  try {
    const res = await fetch(`${api}/api/customers/${token}`, {
      next: { revalidate: 10 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: "My Loyalty Card — Car Wash",
    description: "Your digital car wash loyalty card.",
  };
}

export default async function CardPage({ params }: PageProps) {
  const { token } = params;
  const result = await getCustomer(token);

  if (!result) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="max-w-sm w-full text-center">
          <div className="bg-navy-800 border border-navy-600 rounded-2xl p-8">
            <p className="text-4xl mb-4">❌</p>
            <h1 className="text-xl font-bold mb-2">Card Not Found</h1>
            <p className="text-navy-300 text-sm">
              This loyalty card link is invalid or has been deactivated.
              Please ask staff for help.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const { customer } = result;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";

  // Generate QR data URL server-side
  const qrDataUrl = await QRCode.toDataURL(`${frontendUrl}/card/${token}`, {
    width: 300,
    margin: 2,
    color: { dark: "#0A1628", light: "#FFFFFF" },
  });

  return (
    <main className="flex flex-col items-center min-h-screen p-6 py-10">
      <LoyaltyCard
        name={customer.name}
        stampCount={customer.stamp_count}
        cycle={customer.cycle}
        qrToken={token}
        qrDataUrl={qrDataUrl}
      />

      {/* Lifetime stats */}
      <div className="max-w-sm w-full mt-6">
        <div className="bg-navy-800 border border-navy-600 rounded-2xl p-4">
          <h3 className="text-navy-300 text-xs uppercase tracking-widest mb-3">
            Lifetime Stats
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xl font-bold">{customer.total_stamps}</p>
              <p className="text-navy-400 text-xs">Total stamps</p>
            </div>
            <div>
              <p className="text-xl font-bold">{Math.max(0, customer.cycle - 1)}</p>
              <p className="text-navy-400 text-xs">Free washes earned</p>
            </div>
          </div>
        </div>
      </div>

      <p className="text-navy-500 text-xs text-center mt-8 max-w-xs">
        Member since {new Date(customer.created_at).toLocaleDateString("en-GB", {
          day: "numeric", month: "long", year: "numeric"
        })}
      </p>
    </main>
  );
}
