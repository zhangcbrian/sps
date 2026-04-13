import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SPS — Requirements Portal",
  description:
    "Turn natural language requirements into structured, traceable specs",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          margin: 0,
          padding: 0,
          backgroundColor: "#0a0a0b",
          color: "#fafaf9",
        }}
      >
        <nav
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #333",
            display: "flex",
            gap: "24px",
            alignItems: "center",
          }}
        >
          <strong style={{ fontSize: "18px" }}>SPS</strong>
          <a href="/" style={{ color: "#ccc", textDecoration: "none" }}>
            Dashboard
          </a>
          <a href="/submit" style={{ color: "#ccc", textDecoration: "none" }}>
            Submit
          </a>
          <a href="/history" style={{ color: "#ccc", textDecoration: "none" }}>
            History
          </a>
        </nav>
        <main style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
