/**
 * シフトパズル タスクサンプルデータ
 * 技大祭の実際のタスクから代表的なものを抜粋（60件）
 *
 * 実運用では500件程度になる想定。
 * 管轄局: 渉外局 / 産学局 / 総務局 / 財務局 / 制作局 / 情報局 / 執行部 / 実行委員
 */

import { Task } from "../domain/index.js";

export function createSampleTasks(): Task[] {
  return [
    // ========== 総務局 (10件) ==========
    new Task({
      id: "task-somu-shiki",
      name: "総務指揮",
      task: "総務局全体の指揮・調整",
      responsibleDepartment: "総務局",
      description: "各担当への指示出し、状況把握、トラブル対応",
    }),
    new Task({
      id: "task-sandan-taiou",
      name: "参団対応",
      task: "参加団体からの問い合わせ・受付対応",
      responsibleDepartment: "総務局",
      description: "参加団体受付窓口、書類確認、案内業務",
    }),
    new Task({
      id: "task-kokudan-taiou",
      name: "国団対応",
      task: "国内団体の対応・サポート",
      responsibleDepartment: "総務局",
      description: "国内団体本部での対応、物品管理サポート",
    }),
    new Task({
      id: "task-kyukeijo-setsuei",
      name: "休憩所設営",
      task: "来場者向け休憩スペースの設営",
      responsibleDepartment: "総務局",
      description: "テーブル・椅子の設置、案内表示の設置",
    }),
    new Task({
      id: "task-annaijo-pool",
      name: "案内所設営(プール前)",
      task: "プール前案内所の設営",
      responsibleDepartment: "総務局",
      description: "案内テント設置、パンフレット・案内物の準備",
    }),
    new Task({
      id: "task-annaijo-gym",
      name: "案内所設営(体育館)",
      task: "体育館前案内所の設営",
      responsibleDepartment: "総務局",
      description: "案内テント設置、パンフレット・案内物の準備",
    }),
    new Task({
      id: "task-eisei-taiou",
      name: "衛生対応",
      task: "会場内の衛生管理・救護対応",
      responsibleDepartment: "総務局",
      description: "救護物品の準備、体調不良者への初期対応、衛生巡回",
    }),
    new Task({
      id: "task-roundman",
      name: "ラウンドマン",
      task: "会場内巡回・状況確認",
      responsibleDepartment: "総務局",
      description: "定期的な会場巡回、問題発生時の初期対応・報告",
    }),
    new Task({
      id: "task-roundman-final",
      name: "最終ラウンドマン",
      task: "閉園前の最終巡回・確認",
      responsibleDepartment: "総務局",
      description: "閉園時の最終確認巡回、残留者確認、施錠確認",
    }),
    new Task({
      id: "task-sandan-honbu-setsuei",
      name: "参団本部設営",
      task: "参加団体本部テントの設営",
      responsibleDepartment: "総務局",
      description: "参加団体向け本部テントの設置・備品準備",
    }),

    // ========== 財務局 (8件) ==========
    new Task({
      id: "task-zaimu-shiki-junk",
      name: "財務指揮（準準備日）",
      task: "準準備日の財務局全体指揮",
      responsibleDepartment: "財務局",
      description: "準準備日の財務業務全般の統括・調整",
    }),
    new Task({
      id: "task-zaimu-shiki-day1",
      name: "財務指揮（1日目）",
      task: "1日目の財務局全体指揮",
      responsibleDepartment: "財務局",
      description: "当日の収支管理、物販監督、食事運営統括",
    }),
    new Task({
      id: "task-zaimu-shiki-day2",
      name: "財務指揮（2日目）",
      task: "2日目の財務局全体指揮",
      responsibleDepartment: "財務局",
      description: "当日の収支管理、物販監督、食事運営統括",
    }),
    new Task({
      id: "task-zaimu-shiki-kataduke",
      name: "財務指揮（片付け日）",
      task: "片付け日の財務局全体指揮",
      responsibleDepartment: "財務局",
      description: "最終精算、返品対応、物販片付け統括",
    }),
    new Task({
      id: "task-bussan-tent-day1",
      name: "物販テント運営",
      task: "技大祭グッズ・物販テントの運営",
      responsibleDepartment: "財務局",
      description: "販売対応、在庫管理、売上記録",
    }),
    new Task({
      id: "task-bussan-tent-kataduke",
      name: "物販テント片付け",
      task: "物販テントの片付け・在庫回収",
      responsibleDepartment: "財務局",
      description: "残品回収、売上集計、テント撤去",
    }),
    new Task({
      id: "task-choshoku-prep",
      name: "朝ご飯準備・運営",
      task: "実行委員向け朝食の準備・提供",
      responsibleDepartment: "財務局",
      description: "食材調達確認、配膳準備、食事提供・後片付け",
    }),
    new Task({
      id: "task-chushoku-prep",
      name: "昼ご飯準備・運営",
      task: "実行委員向け昼食の準備・提供",
      responsibleDepartment: "財務局",
      description: "業者ケータリング受け取り、配膳、食事提供・後片付け",
    }),

    // ========== 制作局 (7件) ==========
    new Task({
      id: "task-seisaku-shiki",
      name: "制作指揮",
      task: "制作局全体の指揮・統括",
      responsibleDepartment: "制作局",
      description: "装飾・配線・ラミ貼など制作業務全般の指揮",
    }),
    new Task({
      id: "task-haisen-shikaikan",
      name: "配線(指揮官)",
      task: "会場内電気配線作業の指揮",
      responsibleDepartment: "制作局",
      description: "電源ルート確認、配線班への指示、安全確認",
    }),
    new Task({
      id: "task-haisen-support",
      name: "配線(サポート)",
      task: "会場内電気配線作業のサポート",
      responsibleDepartment: "制作局",
      description: "配線ケーブル敷設、テーピング、機材接続作業",
    }),
    new Task({
      id: "task-rami-shikaikan",
      name: "ラミ貼(指揮官)",
      task: "ラミネートシール貼り作業の指揮",
      responsibleDepartment: "制作局",
      description: "貼り付け箇所の確認・指示、品質チェック",
    }),
    new Task({
      id: "task-rami-support",
      name: "ラミ貼(サポート)",
      task: "ラミネートシール貼り作業",
      responsibleDepartment: "制作局",
      description: "指定箇所へのラミネートシール貼り付け作業",
    }),
    new Task({
      id: "task-kaijou-soshi-age",
      name: "会場装飾立ち上げ",
      task: "会場全体の装飾設置",
      responsibleDepartment: "制作局",
      description: "横断幕・バナー・装飾物の設置、装飾効果の確認",
    }),
    new Task({
      id: "task-kaijou-soshi-sage",
      name: "会場装飾立ち下げ",
      task: "会場全体の装飾撤去",
      responsibleDepartment: "制作局",
      description: "横断幕・バナー・装飾物の撤去、資材の回収・保管",
    }),

    // ========== 情報局 (6件) ==========
    new Task({
      id: "task-joho-server-day1",
      name: "情報局サーバー運営1日目",
      task: "技大祭公式サーバーの監視・運用（1日目）",
      responsibleDepartment: "情報局",
      description: "Webサイト・アプリのサーバー監視、障害対応、ログ確認",
    }),
    new Task({
      id: "task-joho-server-day2",
      name: "情報局サーバー運営2日目",
      task: "技大祭公式サーバーの監視・運用（2日目）",
      responsibleDepartment: "情報局",
      description: "Webサイト・アプリのサーバー監視、障害対応、ログ確認",
    }),
    new Task({
      id: "task-seeft-day1",
      name: "SeeFTアプリ運営1日目",
      task: "SeeFTアプリの運用サポート（1日目）",
      responsibleDepartment: "情報局",
      description: "来場者向けアプリの動作確認、不具合対応、FAQ対応",
    }),
    new Task({
      id: "task-seeft-day2",
      name: "SeeFTアプリ運営2日目",
      task: "SeeFTアプリの運用サポート（2日目）",
      responsibleDepartment: "情報局",
      description: "来場者向けアプリの動作確認、不具合対応、FAQ対応",
    }),
    new Task({
      id: "task-ar-hanabi-day1",
      name: "AR花火準備補佐1日目",
      task: "AR花火コンテンツの準備・補佐（1日目）",
      responsibleDepartment: "情報局",
      description: "AR表示の動作確認、来場者向け案内サポート",
    }),
    new Task({
      id: "task-bingo-app",
      name: "Bingoアプリ運営",
      task: "ビンゴ大会向けアプリの運用",
      responsibleDepartment: "情報局",
      description: "ビンゴアプリの設定・動作確認、当日の操作補佐",
    }),

    // ========== 渉外局 (7件) ==========
    new Task({
      id: "task-shogai-shiki",
      name: "渉外指揮",
      task: "渉外局全体の指揮・統括",
      responsibleDepartment: "渉外局",
      description: "企業・他大学・外部団体対応の統括、スタッフへの指示",
    }),
    new Task({
      id: "task-tent-nagaoka-univ",
      name: "テント借用（長岡大学）",
      task: "長岡大学からのテント借用対応",
      responsibleDepartment: "渉外局",
      description: "借用手続き、受け取り・返却対応、状態確認",
    }),
    new Task({
      id: "task-tent-nagaoka-kosen",
      name: "テント借用（長岡高専）",
      task: "長岡高専からのテント借用対応",
      responsibleDepartment: "渉外局",
      description: "借用手続き、受け取り・返却対応、状態確認",
    }),
    new Task({
      id: "task-kigyo-booth-setsuei",
      name: "企業ブース設営",
      task: "企業出展ブースの設営補佐",
      responsibleDepartment: "渉外局",
      description: "企業担当者の案内、設営レイアウト確認、物品搬入補佐",
    }),
    new Task({
      id: "task-kigyo-booth-yobikomi",
      name: "企業ブース呼び込み",
      task: "企業ブースへの来場者誘導・呼び込み",
      responsibleDepartment: "渉外局",
      description: "来場者への声掛け、ブース案内、PR補佐",
    }),
    new Task({
      id: "task-kigyo-booth-kanshi",
      name: "企業ブース監視",
      task: "企業出展ブースエリアの監視・サポート",
      responsibleDepartment: "渉外局",
      description: "ブースエリアの秩序維持、企業担当者からの要望対応",
    }),
    new Task({
      id: "task-kigyo-booth-kataduke",
      name: "企業ブース片付け",
      task: "企業出展ブースの撤去補佐",
      responsibleDepartment: "渉外局",
      description: "企業担当者の荷物搬出補佐、ブースエリアの清掃確認",
    }),

    // ========== 産学局 (5件) ==========
    new Task({
      id: "task-chiki-taida-setsuei",
      name: "地域他大設営",
      task: "地域・他大学参加団体のブース設営補佐",
      responsibleDepartment: "産学局",
      description: "参加団体ごとの割当スペース案内、設営サポート",
    }),
    new Task({
      id: "task-taida-mukae",
      name: "他大学迎え入れ",
      task: "他大学参加団体の受け入れ対応",
      responsibleDepartment: "産学局",
      description: "到着確認、案内、必要物品の提供",
    }),
    new Task({
      id: "task-taida-miokuri",
      name: "他大学見送り",
      task: "他大学参加団体の撤収・見送り対応",
      responsibleDepartment: "産学局",
      description: "撤収確認、忘れ物チェック、見送り",
    }),
    new Task({
      id: "task-furima-mukae",
      name: "フリマ迎え入れ",
      task: "フリーマーケット出展者の受け入れ対応",
      responsibleDepartment: "産学局",
      description: "出展者受付、スペース案内、規約説明",
    }),
    new Task({
      id: "task-kakatsu-mihari",
      name: "課活見張り",
      task: "課外活動団体ブースエリアの見張り",
      responsibleDepartment: "産学局",
      description: "課外活動団体エリアの秩序維持、問い合わせ対応",
    }),

    // ========== 執行部 (7件) ==========
    new Task({
      id: "task-honbu-shiki",
      name: "本部指揮",
      task: "技大祭全体の総合指揮",
      responsibleDepartment: "執行部",
      description: "全局・全企画の統括指揮、緊急対応の最終判断",
    }),
    new Task({
      id: "task-honbu-shiki-hosa",
      name: "本部指揮補佐",
      task: "本部指揮のサポート・補佐",
      responsibleDepartment: "執行部",
      description: "指揮官のサポート、情報収集・整理、各局との調整",
    }),
    new Task({
      id: "task-kaien-mt",
      name: "開園MT",
      task: "開園前の全体ミーティング実施",
      responsibleDepartment: "執行部",
      description: "各局代表者への最終確認、開園宣言、安全確認",
    }),
    new Task({
      id: "task-heien-mt",
      name: "閉園MT",
      task: "閉園後の全体ミーティング実施",
      responsibleDepartment: "執行部",
      description: "当日の振り返り、翌日の確認事項共有、各局報告聴取",
    }),
    new Task({
      id: "task-shikkobu-honbu-setsuei",
      name: "執行部本部設営",
      task: "執行部本部の設営",
      responsibleDepartment: "執行部",
      description: "執行部テント・備品の設置、通信機器の配置確認",
    }),
    new Task({
      id: "task-shikkobu-mt-day1",
      name: "執行部MT（1日目）",
      task: "1日目の執行部内部ミーティング",
      responsibleDepartment: "執行部",
      description: "1日目状況確認、2日目に向けた修正事項の共有",
    }),
    new Task({
      id: "task-shikkobu-mt-day2",
      name: "執行部MT（2日目）",
      task: "2日目の執行部内部ミーティング",
      responsibleDepartment: "執行部",
      description: "2日目状況確認、片付け日に向けた指示事項の共有",
    }),

    // ========== 実行委員 (10件) ==========
    new Task({
      id: "task-kikaku-shiki",
      name: "企画指揮",
      task: "企画エリア全体の指揮・統括",
      responsibleDepartment: "実行委員",
      description: "各企画担当への指示出し、タイムスケジュール管理",
    }),
    new Task({
      id: "task-ennichi-setsuei",
      name: "縁日設営",
      task: "縁日エリアの設営",
      responsibleDepartment: "実行委員",
      description: "縁日ブース・物品の配置、装飾設置",
    }),
    new Task({
      id: "task-ennichi-unei",
      name: "縁日 運営",
      task: "縁日エリアの運営",
      responsibleDepartment: "実行委員",
      description: "来場者対応、ゲーム進行、景品管理",
    }),
    new Task({
      id: "task-obakeyashiki-setsuei",
      name: "お化け屋敷設営",
      task: "お化け屋敷の設営・準備",
      responsibleDepartment: "実行委員",
      description: "内装・演出機材の設置、動線・安全確認",
    }),
    new Task({
      id: "task-obakeyashiki-unei",
      name: "お化け屋敷 運営",
      task: "お化け屋敷の運営",
      responsibleDepartment: "実行委員",
      description: "入場案内、演者対応、来場者への安全誘導",
    }),
    new Task({
      id: "task-game-taikai-unei",
      name: "ゲーム大会運営",
      task: "ゲーム大会の進行・運営",
      responsibleDepartment: "実行委員",
      description: "参加者受付、対戦進行、機器トラブル対応",
    }),
    new Task({
      id: "task-mikoshi-ninau-1",
      name: "神輿 運営① 担ぐ",
      task: "第1回神輿運行の担ぎ手担当",
      responsibleDepartment: "実行委員",
      description: "神輿担ぎ、掛け声合わせ、ルートに沿った運行",
    }),
    new Task({
      id: "task-hero-show-hare",
      name: "ヒーローショー運営 晴れ",
      task: "晴れ時のヒーローショー進行補佐",
      responsibleDepartment: "実行委員",
      description: "ステージ周辺の来場者整理、演者サポート、機材確認",
    }),
    new Task({
      id: "task-onkyo-setsuei-junk",
      name: "音響機器 設営 準備日",
      task: "準備日の音響機器設置",
      responsibleDepartment: "実行委員",
      description: "スピーカー・アンプ等の設置、音響テスト実施",
    }),
    new Task({
      id: "task-stamp-rally-setsuei",
      name: "スタンプラリー設営",
      task: "スタンプラリーの設営準備",
      responsibleDepartment: "実行委員",
      description: "スタンプ台の設置、台紙・景品の準備、設置場所の確認",
    }),
  ];
}
