import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import RefreshButton from "@/components/RefreshButton";
import AppNav from "@/components/AppNav";

export const metadata: Metadata = {
  title: "PL ダッシュボード｜株式会社武士道",
  description: "月次PL（事業別／合計）と入力状況の閲覧用ダッシュボード",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="font-bold text-lg">📊 PL ダッシュボード</Link>
              <AppNav />
            </div>
            <RefreshButton />
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
