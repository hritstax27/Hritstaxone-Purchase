import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "HritsTaxOne Purchase - Complete Accounts Payables Software",
  description:
    "Digitize invoices, update inventory, manage payables. AI-powered invoice scanning with Tally automation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#1e293b",
                color: "#f8fafc",
                borderRadius: "12px",
                padding: "12px 16px",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
