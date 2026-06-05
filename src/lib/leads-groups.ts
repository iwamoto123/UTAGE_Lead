import type { UtageRouteCategory } from "@/lib/marketing";

export interface LeadAccountDefinition {
  id: string;
  name: string;
  routeLabel: string;
  expectedRoutes: UtageRouteCategory[];
}

export interface LeadAccountSection {
  title: string;
  accounts: LeadAccountDefinition[];
}

export const LEAD_ACCOUNT_SECTIONS: LeadAccountSection[] = [
  {
    title: "R8 白谷塾オンライン教室 メインアカウント",
    accounts: [
      { id: "75qj4QCIIFrE", name: "白谷塾オンライン教室【R8公式】", routeLabel: "YouTube他", expectedRoutes: ["YouTube自然流入", "公式LINE"] },
      { id: "7qQJ38rzLtbM", name: "熊大超特化塾｜白谷塾オンライン教室", routeLabel: "メタ広告/YouTube", expectedRoutes: ["メタ広告", "YouTube自然流入"] },
      { id: "qN7MMxMWLx3n", name: "国語 R8", routeLabel: "メタ広告/YouTube", expectedRoutes: ["メタ広告", "YouTube自然流入"] },
      { id: "7oxtilRUXOBi", name: "情報2026", routeLabel: "YouTube", expectedRoutes: ["YouTube自然流入"] },
      { id: "y7hyqMysZhxd", name: "物理2026", routeLabel: "メタ広告/YouTube", expectedRoutes: ["メタ広告", "YouTube自然流入"] },
    ],
  },
  {
    title: "R8 白谷塾オンライン教室 キャンペーン・短期講習",
    accounts: [
      { id: "xVMnVBF3fzuI", name: "白谷塾オンライン教室【1月進研模試対策】", routeLabel: "メタ広告のみ", expectedRoutes: ["メタ広告"] },
      { id: "NpJjwohj4a8s", name: "2月スタートダッシュプログラム【白谷塾】", routeLabel: "メタ広告のみ", expectedRoutes: ["メタ広告"] },
      { id: "cFwIiZpTXRrQ", name: "【浪人生用LINE】白谷塾オンライン教室", routeLabel: "メタ広告のみ", expectedRoutes: ["メタ広告"] },
      { id: "rOYD8sgrLdAP", name: "白谷塾 本気の春期講習【R8 新高3】", routeLabel: "メタ広告のみ", expectedRoutes: ["メタ広告"] },
    ],
  },
  {
    title: "ローカルメディ",
    accounts: [
      { id: "TZq4ob5n4GZ1", name: "地方医学部オンライン塾 ローカルメディ", routeLabel: "メタ広告/YouTube", expectedRoutes: ["メタ広告", "メタ広告(合流)", "YouTube自然流入", "SNS自然流入", "HP/ブログ", "公式LINE"] },
      { id: "Cj6XBnqUWjjU", name: "ローカルメディ 高校数学の予習講座【新高1 春講座】", routeLabel: "メタ広告のみ", expectedRoutes: ["メタ広告"] },
      { id: "Tm32etw7epfS", name: "【メタ広告】医学部塾ローカルメディ九州 高1高2", routeLabel: "メタ広告のみ", expectedRoutes: ["メタ広告"] },
      { id: "PjocL14v2u6j", name: "【再受験コース】医学部塾ローカルメディ", routeLabel: "メタ広告/YouTube", expectedRoutes: ["メタ広告", "YouTube自然流入"] },
    ],
  },
  {
    title: "R7 白谷塾オンライン教室 キャンペーン・短期講習",
    accounts: [
      { id: "A3VabSziUdPO", name: "【6月】白谷塾オンライン教室【R7】", routeLabel: "YouTube他", expectedRoutes: ["YouTube自然流入", "公式LINE"] },
      { id: "Z0kJVSw022ed", name: "夏期講習【白谷塾オンライン教室R7】", routeLabel: "メタ広告のみ", expectedRoutes: ["メタ広告"] },
      { id: "2JFOhbEZJBSs", name: "9月模試の集中対策プログラム【白谷塾】", routeLabel: "メタ広告のみ", expectedRoutes: ["メタ広告"] },
      { id: "Zp6OhqYDlg9i", name: "共テ残り100日｜白谷塾オンライン教室", routeLabel: "メタ広告のみ", expectedRoutes: ["メタ広告"] },
      { id: "DS7H8oI4ZEI0", name: "【最後の企画】共通テスト短期プログラム", routeLabel: "メタ広告のみ", expectedRoutes: ["メタ広告"] },
    ],
  },
];
