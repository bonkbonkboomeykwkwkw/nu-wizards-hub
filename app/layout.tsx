import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NU Wizards Tournament Hub",
  description: "Tournament registration for National University Wizards esports.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
