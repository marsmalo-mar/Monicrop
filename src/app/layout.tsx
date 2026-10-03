import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Monicrop | Farm with confidence",
    template: "%s | Monicrop",
  },
  description:
    "Record planting details, track crop care, and connect with agricultural consultants.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
