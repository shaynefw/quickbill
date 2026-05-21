import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "QuickBill - Invoice Management";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 120,
            height: 120,
            borderRadius: 28,
            backgroundColor: "rgba(255,255,255,0.2)",
            marginBottom: 32,
            border: "3px solid rgba(255,255,255,0.3)",
          }}
        >
          <span
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "white",
            }}
          >
            Q
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "white",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          QuickBill
        </h1>

        {/* Tagline */}
        <p
          style={{
            fontSize: 28,
            color: "rgba(255,255,255,0.85)",
            margin: "16px 0 0 0",
            fontWeight: 400,
          }}
        >
          Create and send professional invoices in minutes
        </p>

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 40,
          }}
        >
          {["Invoicing", "Email Templates", "PDF Export", "Dashboard"].map(
            (feature) => (
              <div
                key={feature}
                style={{
                  padding: "10px 24px",
                  borderRadius: 100,
                  backgroundColor: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  color: "white",
                  fontSize: 18,
                  fontWeight: 500,
                }}
              >
                {feature}
              </div>
            )
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
