"use client";

const TOTAL = 5;

interface StampGridProps {
  count: number;
}

export default function StampGrid({ count }: StampGridProps) {
  return (
    <div className="flex gap-3 justify-center my-6">
      {Array.from({ length: TOTAL }).map((_, i) => {
        const filled = i < count;
        return (
          <div
            key={i}
            className={[
              "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500",
              filled
                ? "bg-navy-400 border-navy-300 stamp-filled"
                : "bg-navy-800 border-navy-600",
            ].join(" ")}
          >
            {filled && (
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}
