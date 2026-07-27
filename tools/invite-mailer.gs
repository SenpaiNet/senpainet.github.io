/**
 * SenpaiNet 招待メール送信スクリプト（Google Apps Script）
 *
 * Firebase を Blaze プランにしなくても、無料で招待メールを自動送信するための仕組み。
 * Google アカウントの無料枠（通常 1日100通、Workspace は 1日1500通）で送信されます。
 *
 * ── 設計方針（重要）─────────────────────────────────────
 * このウェブアプリのURLは index.html に書かれ、公開リポジトリに載ります。
 * つまり「URLを秘密にする」「合言葉を持たせる」といった守り方は成立しません
 * （合言葉もクライアント側にあるため、一緒に読まれてしまう）。
 *
 * そこで、このスクリプトは **件名と本文をサーバー側で固定** しています。
 * 外部から指定できるのは「宛先」と「招待者名」だけなので、URLを知られても
 * 送れるのは SenpaiNet の招待文だけになり、なりすましメールの踏み台にはできません。
 * さらに 1日あたりの送信数に上限を設けて、悪用時の被害を限定しています。
 *
 * ── 設定手順 ─────────────────────────────────────────────
 * 1. https://script.google.com/ を開き、既存のプロジェクトを開く（新規なら「新しいプロジェクト」）
 * 2. エディタの中身を全部消して、このファイルの中身を貼り付ける
 * 3. 💾 保存（Ctrl+S）
 * 4. 右上「デプロイ」→「デプロイを管理」→ 鉛筆アイコン（編集）
 *      → バージョン：「新バージョン」を選択  ← ここを忘れると古いコードのままです
 *      → アクセスできるユーザー：全員
 *      →「デプロイ」
 * 5. URLは変わりません。index.html の INVITE_ENDPOINT はそのままでOK
 *
 * ── 動作確認 ────────────────────────────────────────────
 * ブラウザでウェブアプリURLを開くと {"ok":true,...} が表示されます。
 */

// 招待リンク（管理コンソール）
var CONSOLE_URL = 'https://senpainet.github.io/#admin';

// 1日あたりの送信上限（悪用されたときの被害を抑えるため）
var DAILY_LIMIT = 20;

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var to = String(data.to || '').trim();
    var by = String(data.by || '').trim();
    var name = String(data.name || '').trim();

    // 宛先の形式チェック
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to) || to.length > 200) {
      return json({ ok: false, error: 'invalid recipient' });
    }
    // 招待者名は本文に差し込むため、長さを制限し改行を除去（ヘッダ汚染・水増し防止）
    by = by.replace(/[\r\n]/g, ' ').slice(0, 100);
    if (by && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(by)) by = '';
    // 宛名も同様に、改行を除いて長さを制限する
    name = name.replace(/[\r\n]/g, ' ').slice(0, 60);

    // 1日の送信上限チェック
    if (!underDailyLimit()) {
      return json({ ok: false, error: 'daily limit reached' });
    }

    // 件名・本文はサーバー側で固定する（外部からは差し替えられない）
    var subject = '【SenpaiNet】運営メンバーに招待されました';
    var body =
      (name ? name + ' 様\n\n' : '') +
      'SenpaiNet の運営メンバーに追加されました。\n\n' +
      'このメールアドレス（' + to + '）のGoogleアカウントで、管理コンソールにログインできます。\n\n' +
      '▼ 管理コンソール\n' + CONSOLE_URL + '\n\n' +
      'ログイン方法：上記を開き「Googleでログイン」を選択してください。\n' +
      (by ? '招待者：' + by + '\n' : '') +
      '\n心当たりがない場合は、このメールは破棄してください。\n' +
      'SenpaiNet 運営事務局';

    MailApp.sendEmail({
      to: to,
      subject: subject,
      body: body,                    // HTMLを表示できない環境向けの代替テキスト
      htmlBody: inviteHtml(to, by, name),
      name: 'SenpaiNet 運営事務局'
    });

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/**
 * 招待メールのHTML本文。
 * メールソフトはCSSの対応がまちまちなので、レイアウトは table、装飾は
 * すべてインラインstyleで書いている（flexbox / grid / <style>タグは使わない）。
 */
function inviteHtml(to, by, name) {
  var BLUE = '#2f73e8';
  var INK = '#14233f';
  var MUTED = '#66738c';
  var LOGO = 'https://senpainet.github.io/assets/logo/logo-horizontal.png';

  function step(n, title, desc) {
    return '' +
      '<tr>' +
        '<td valign="top" width="34" style="padding:0 12px 16px 0">' +
          '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="26" style="width:26px">' +
            '<tr><td align="center" style="width:26px;height:26px;background:#e8f1fe;border-radius:13px;' +
              'font:700 12px/26px Helvetica,Arial,sans-serif;color:' + BLUE + '">' + n + '</td></tr>' +
          '</table>' +
        '</td>' +
        '<td valign="top" style="padding:0 0 16px">' +
          '<div style="font:700 14px/1.5 Helvetica,Arial,sans-serif;color:' + INK + '">' + title + '</div>' +
          '<div style="font:400 13px/1.7 Helvetica,Arial,sans-serif;color:' + MUTED + ';margin-top:3px">' + desc + '</div>' +
        '</td>' +
      '</tr>';
  }

  return '' +
'<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8">' +
'<meta name="viewport" content="width=device-width,initial-scale=1">' +
'<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">' +
'<title>' + '運営メンバーへの招待' + '</title></head>' +
'<body style="margin:0;padding:0;background:#f4f7fb">' +

// プレビュー行（受信箱の一覧に出る要約。本文には表示されない）
'<div style="display:none;font-size:1px;color:#f4f7fb;max-height:0;overflow:hidden">' +
  'SenpaiNet の管理コンソールにログインできるようになりました。' +
'</div>' +

'<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f7fb">' +
'<tr><td align="center" style="padding:32px 16px">' +

  '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" ' +
    'style="width:600px;max-width:100%;background:#ffffff;border-radius:16px;overflow:hidden;' +
    'box-shadow:0 2px 10px rgba(20,35,63,.06)">' +

    // ヘッダー（ブランドカラーの帯＋ロゴ）
    '<tr><td style="background:' + BLUE + ';height:5px;font-size:0;line-height:0">&nbsp;</td></tr>' +
    '<tr><td align="center" style="padding:30px 32px 6px">' +
      '<img src="' + LOGO + '" width="168" alt="SenpaiNet" ' +
        'style="display:block;width:168px;max-width:60%;height:auto;border:0">' +
    '</td></tr>' +

    // 見出し
    '<tr><td align="center" style="padding:18px 32px 0">' +
      '<div style="font:700 11px/1 Helvetica,Arial,sans-serif;color:' + BLUE + ';letter-spacing:.14em">INVITATION</div>' +
      '<h1 style="margin:12px 0 0;font:700 22px/1.5 Helvetica,Arial,sans-serif;color:' + INK + '">' +
        '運営メンバーに招待されました</h1>' +
    '</td></tr>' +

    // 本文
    '<tr><td style="padding:16px 32px 0">' +
      '<p style="margin:0;font:400 14px/1.9 Helvetica,Arial,sans-serif;color:' + MUTED + ';text-align:center">' +
        (name ? '<span style="color:' + INK + ';font-weight:700">' + escapeHtml(name) + ' 様</span><br>' : '') +
        'SenpaiNet の運営メンバーに追加されました。<br>' +
        '下記のGoogleアカウントで管理コンソールにログインできます。</p>' +
    '</td></tr>' +

    // メールアドレスのカード
    '<tr><td style="padding:22px 32px 0">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" ' +
        'style="background:#f7f9fc;border:1px solid #e7edf6;border-radius:12px">' +
        '<tr><td style="padding:15px 18px">' +
          '<div style="font:700 11px/1 Helvetica,Arial,sans-serif;color:#8a97ac">ログインに使うアカウント</div>' +
          '<div style="margin-top:7px;font:700 15px/1.4 Helvetica,Arial,sans-serif;color:' + INK + ';' +
            'word-break:break-all">' + escapeHtml(to) + '</div>' +
          (by ? '<div style="margin-top:10px;padding-top:10px;border-top:1px solid #e7edf6;' +
                'font:400 12px/1.5 Helvetica,Arial,sans-serif;color:' + MUTED + '">招待者：' +
                escapeHtml(by) + '</div>' : '') +
        '</td></tr>' +
      '</table>' +
    '</td></tr>' +

    // ボタン（画像やCSSに依存しない table 方式）
    '<tr><td align="center" style="padding:26px 32px 0">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0">' +
        '<tr><td align="center" style="background:' + BLUE + ';border-radius:10px">' +
          '<a href="' + CONSOLE_URL + '" ' +
            'style="display:inline-block;padding:14px 34px;font:700 15px/1 Helvetica,Arial,sans-serif;' +
            'color:#ffffff;text-decoration:none;border-radius:10px">管理コンソールを開く</a>' +
        '</td></tr>' +
      '</table>' +
      '<div style="margin-top:12px;font:400 11px/1.7 Helvetica,Arial,sans-serif;color:#94a1b5;word-break:break-all">' +
        'ボタンが押せない場合はこちら<br>' + CONSOLE_URL + '</div>' +
    '</td></tr>' +

    // 区切り
    '<tr><td style="padding:26px 32px 0">' +
      '<div style="height:1px;background:#eef1f7;font-size:0;line-height:0">&nbsp;</div></td></tr>' +

    // 手順
    '<tr><td style="padding:22px 32px 0">' +
      '<div style="font:700 13px/1 Helvetica,Arial,sans-serif;color:' + INK + ';margin-bottom:16px">ログインの手順</div>' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">' +
        step(1, '上のボタンから管理コンソールを開く', 'スマートフォン・パソコンのどちらからでも利用できます。') +
        step(2, '「Googleでログイン」を選ぶ', '上に記載のメールアドレスのアカウントを選択してください。') +
        step(3, '相談・通報の管理をはじめる', '別のアカウントでログインすると権限がないため開けません。') +
      '</table>' +
    '</td></tr>' +

    // フッター
    '<tr><td style="padding:10px 32px 30px">' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" ' +
        'style="background:#f7f9fc;border-radius:12px">' +
        '<tr><td style="padding:14px 18px;font:400 12px/1.8 Helvetica,Arial,sans-serif;color:#8a97ac">' +
          'このメールに心当たりがない場合は、破棄していただいて問題ありません。' +
        '</td></tr>' +
      '</table>' +
      '<div style="margin-top:20px;text-align:center;font:400 11px/1.8 Helvetica,Arial,sans-serif;color:#a8b3c4">' +
        'SenpaiNet 運営事務局<br>先輩の経験を、後輩の一歩に。</div>' +
    '</td></tr>' +

  '</table>' +
'</td></tr></table></body></html>';
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 日付ごとの送信数をスクリプトプロパティに記録し、上限を超えたら false を返す
function underDailyLimit() {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(5000);
  } catch (e) {
    return false; // 同時アクセスが詰まっている場合は安全側に倒す
  }
  try {
    var props = PropertiesService.getScriptProperties();
    var today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
    var key = 'sent_' + today;
    var count = Number(props.getProperty(key) || 0);
    if (count >= DAILY_LIMIT) return false;
    props.setProperty(key, String(count + 1));
    return true;
  } finally {
    lock.releaseLock();
  }
}

// 動作確認用（ブラウザでURLを開くと表示される）
function doGet() {
  return json({ ok: true, message: 'SenpaiNet invite mailer is running' });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
