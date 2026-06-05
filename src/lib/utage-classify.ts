// UTAGE シナリオ名 → 経路カテゴリ判定ルール

export type RouteCategory = "メタ広告" | "YouTube自然流入" | "面談予約" | "公式LINE" | "教材販売" | "集計外";

// アカウント単位の分類（シナリオを問わずアカウント全体を一つの経路として扱う）
export const ACCOUNT_CATEGORIES: Record<string, { category: RouteCategory; business: string | null; note?: string }> = {
  // メタ広告（scenario-mode、内訳に従う）
  "Tm32etw7epfS": { category: "メタ広告", business: "ローカルメディ" },
  "Cj6XBnqUWjjU": { category: "メタ広告", business: "ローカルメディ" },
  "rOYD8sgrLdAP": { category: "メタ広告", business: "白谷塾オンライン" },
  "cFwIiZpTXRrQ": { category: "メタ広告", business: "白谷塾オンライン" },
  "NpJjwohj4a8s": { category: "メタ広告", business: "白谷塾オンライン" },
  "xVMnVBF3fzuI": { category: "メタ広告", business: "白谷塾オンライン" },
  "DS7H8oI4ZEI0": { category: "メタ広告", business: "白谷塾オンライン" },
  "Zp6OhqYDlg9i": { category: "メタ広告", business: "白谷塾オンライン" },
  "2JFOhbEZJBSs": { category: "メタ広告", business: "白谷塾オンライン" },
  "Z0kJVSw022ed": { category: "メタ広告", business: "白谷塾オンライン" },
  // 混在（シナリオ単位で分類）
  "7qQJ38rzLtbM": { category: "メタ広告", business: "白谷塾オンライン", note: "混在: シナリオ単位で分類" },
  "PjocL14v2u6j": { category: "メタ広告", business: "ローカルメディ", note: "混在: シナリオ単位で分類" },
  // YouTube自然流入（account-mode）
  "A3VabSziUdPO": { category: "YouTube自然流入", business: "白谷塾オンライン" },
  "TZq4ob5n4GZ1": { category: "YouTube自然流入", business: "ローカルメディ" },
  // 公式LINE（account-mode）
  "75qj4QCIIFrE": { category: "公式LINE", business: "白谷塾オンライン" },
  "AejpZj4o5f8v": { category: "公式LINE", business: "白谷塾オンライン" },
  "tG9qRaflLotn": { category: "公式LINE", business: "白谷塾オンライン" },
  "l4sfwCJFWYP6": { category: "公式LINE", business: "白谷塾オンライン" },
  // 教材販売（集計対象外）
  "qN7MMxMWLx3n": { category: "教材販売", business: "白谷塾オンライン" },
  "y7hyqMysZhxd": { category: "教材販売", business: "白谷塾オンライン" },
  "7oxtilRUXOBi": { category: "教材販売", business: "白谷塾オンライン" },
  // 集計外
  "NX0ztS9ct3oN": { category: "集計外", business: null, note: "シナリオ0件・未使用" },
  "Tagv60l1P33y": { category: "集計外", business: null, note: "R7公式予備" },
  "nmr2oWmoVm40": { category: "集計外", business: null, note: "チャンネル予備" },
  "pQQKDWMWZfLd": { category: "集計外", business: null, note: "宮崎冬季講座" },
  "E6WNSFdvOwUn": { category: "集計外", business: null, note: "うちふぉと（別事業）" },
  "WXufzbwUHLSo": { category: "集計外", business: null, note: "えな先生（別事業）" },
  "e5EqxQLNRlrt": { category: "集計外", business: null, note: "青雲学舎（別事業）" },
};

// シナリオ名の手動オーバーライド（パターンルールより優先）
export const SCENARIO_OVERRIDES: Record<string, RouteCategory> = {
  // 熊大超特化塾
  "XAz7XmBFO3yX": "メタ広告",
  // 再受験コース
  "ss0Y2tqzi9hW": "YouTube自然流入",
  "yyog9fvedOtP": "メタ広告",
  "V98BSMwhViZC": "面談予約",
  // ローカルメディ九州 メタ広告
  "fpZvVLcMvLMK": "メタ広告",
  "17Px1lEqob17": "メタ広告",
  "MV21NZKu9Rzr": "メタ広告",
};

// シナリオ名パターン → 経路カテゴリ
// 上から順に評価、最初にマッチしたもの採用
const SCENARIO_PATTERNS: { pattern: RegExp; category: RouteCategory }[] = [
  // メタ広告流入
  { pattern: /【メタ広告から】|メタ広告シナリオ|【無料相談 メタ広告】|【お試しキャンペーン】|【お試し】$|LINE追加用 メタ広告/, category: "メタ広告" },
  // YouTube流入
  { pattern: /YouTubeシナリオ/, category: "YouTube自然流入" },
  // 面談予約
  { pattern: /Zoom無料相談リマインダ|個別Zoom無料相談|面談予約者シナリオ|【予約完了シナリオ】|営業面談予約リマインダ/, category: "面談予約" },
  // 教材販売
  { pattern: /教材販売シナリオ|テキスト購入者シナリオ|コンテンツ配信シナリオ/, category: "教材販売" },
  // 集計外（既存LINE導線・決済済み・テンプレ）
  { pattern: /LINE友達追加用|受講料決済者|【メインのLINEから】|【\d+月LINEから】|【その他LINEから】|GW企画|早期対策マークの解説動画|通年シナリオ|メインシナリオ|【令和\d+年度】共通テスト|共通テスト物理|6月企画シナリオ|夏期講習シナリオ R7|熊本大学のLINEから|浪人生無料Zoom面談の特典からメイン|ローカルメディリマインダ/, category: "集計外" },
];

export function classifyScenarioName(scenarioName: string): RouteCategory {
  for (const { pattern, category } of SCENARIO_PATTERNS) {
    if (pattern.test(scenarioName)) return category;
  }
  return "集計外"; // デフォルト: 未知パターンは集計外（Notion側で手動修正可能）
}

export function classifyScenario(scenarioId: string, scenarioName: string): RouteCategory {
  if (SCENARIO_OVERRIDES[scenarioId]) return SCENARIO_OVERRIDES[scenarioId];
  return classifyScenarioName(scenarioName);
}

// アカウント全体の同期モードを判定
// "scenario" = シナリオごとに分類して保存（meta_ad/mixed）
// "account"  = アカウント全体を1経路として保存（youtube/official_line）
// "skip"     = 同期しない（textbook_sales/out_of_scope）
export function getAccountSyncMode(accountId: string): "scenario" | "account" | "skip" {
  const info = ACCOUNT_CATEGORIES[accountId];
  if (!info) return "skip";
  if (info.category === "メタ広告") return "scenario";
  if (info.category === "YouTube自然流入" || info.category === "公式LINE") return "account";
  return "skip";
}
