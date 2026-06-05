export type Business = "宮崎教室" | "白谷塾オンライン" | "ローカルメディ" | "その他";
export type Year = "令和7年度" | "令和8年度";

export interface MonthlyPL {
  id: string;
  title: string;
  monthStart: string; // YYYY-MM-DD
  yearMonth: string; // YYYY-MM
  business: Business;
  year: Year | null;

  uriage: number;          // 売上 (月謝)
  kyozaiUriage: number;    // 教材売上
  tankiUriage: number;     // 短期講座売上
  sonotaUriage: number;    // その他売上

  kyozaiGenka: number;     // 教材原価

  jinkenhiBaito: number;   // 人件費（バイト代）
  shainKyuyo: number;      // 社員給与
  gyoumuItaku: number;     // 業務委託費

  kokokuhi: number;            // 広告費（ボード集計）
  kokokuhiCard: number;        // 広告費（カード明細）

  jidaiKachin: number;     // 地代家賃
  suidoKonetsu: number;    // 水道光熱費
  tsushin: number;         // 通信費
  saas: number;            // SaaS利用料
  gaichu: number;          // 外注費
  shiharaiTesuryo: number; // 支払手数料
  riasu: number;           // リース料
  genka: number;           // 減価償却費
  sonotaKeihi: number;     // その他経費

  hojinIdo: number;        // 法人間移動
  kariireHensai: number;   // 借入返済

  seitoSu: number;         // 生徒数（合計）
  kou1Ninzu: number;       // 高1人数（宮崎のみ）
  kou2Ninzu: number;       // 高2人数（宮崎のみ）
  kou3Ninzu: number;       // 高3人数（宮崎のみ）

  datalessExempt: boolean; // データなし免除（運用開始前など）
}

export interface PLSummary {
  uriageGokei: number;
  uriageSogensoeki: number;
  hankanhiGokei: number;
  eigyouRiekishori: number;
  eigyouRieki: number;
  eigyouRiekiRitsu: number;
  seitoSuLatest: number; // 直近月の生徒数
  arpu: number;          // 1人あたり月謝（売上合計 / 月数 / 平均生徒数）
}

export interface BusinessYearRecord {
  id: string;
  url: string;
  business: Business;
  year: Year;
}
