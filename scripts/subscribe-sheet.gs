/**
 * AbundanceAI — "Stay Updated" subscriber capture (Google Apps Script).
 *
 * Appends one row per landing-page footer signup to a dedicated Google Sheet.
 * Paired with apps/web/src/lib/subscribe.ts, which POSTs to this script's URL.
 *
 * ─── DEPLOYMENT ──────────────────────────────────────────────────────────────
 * 1. Open the target Google Sheet → Extensions → Apps Script.
 *    (Creating the project at script.google.com instead makes it "standalone",
 *    with no sheet attached — that still works, but you must then set the
 *    SHEET_ID script property in step 3.)
 * 2. Delete the placeholder Code.gs contents; paste this file in full. Save.
 * 3. STANDALONE PROJECTS ONLY: ⚙ Project Settings → Script Properties →
 *    Add script property → name `SHEET_ID`, value = the long id from the
 *    sheet's URL (.../spreadsheets/d/<SHEET_ID>/edit).
 * 4. Select `testAppend` in the toolbar dropdown → Run. Authorize when
 *    prompted. This writes a test row and proves auth + sheet access work.
 *    Delete the test row afterwards.
 *
 *    Do NOT select `doPost` and press Run. doPost takes an event object that
 *    only exists on a real HTTP request; running it by hand passes `undefined`
 *    and the editor reports "An unknown error has occurred". That is the
 *    editor, not this script. Use `testAppend` to test from the editor.
 * 5. Deploy → New deployment → type "Web app":
 *      Execute as:       Me
 *      Who has access:   Anyone            ← required; "Anyone with Google
 *                                            account" breaks anonymous visitors
 * 6. Copy the /exec URL and set it in the frontend host's env as:
 *      VITE_SUBSCRIBE_URL=https://script.google.com/macros/s/AKfy.../exec
 * 7. Redeploy the frontend so the new env var is baked into the bundle.
 *
 * Editing this script later requires Deploy → Manage deployments → edit the
 * existing deployment (NOT "New deployment"), or the /exec URL changes and the
 * form silently starts 404ing.
 *
 * ─── WHY text/plain, NOT application/json ────────────────────────────────────
 * The client sends Content-Type: text/plain;charset=utf-8 with a JSON string as
 * the body. That is deliberate and load-bearing: application/json is not a CORS
 * "simple request" content type, so the browser would fire an OPTIONS preflight
 * first — and Apps Script web apps do not serve OPTIONS. The preflight fails and
 * the real request never leaves the browser. text/plain avoids the preflight
 * entirely. Do not "fix" the client's Content-Type to application/json.
 */

/** Columns written to the sheet, in order. */
var HEADERS = ['Timestamp', 'Email', 'Source'];

/** Basic shape check. Real deliverability is proven by sending, not by regex. */
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    // Honeypot: a field hidden from humans via CSS. Anything that fills it in is
    // a bot. Return ok so it can't distinguish a hit from a miss and retry.
    if (body.company) {
      return jsonOut({ status: 'ok' });
    }

    var email = String(body.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return jsonOut({ status: 'invalid' });
    }

    var source = String(body.source || 'landing-footer').slice(0, 64);

    // Serialize appends. Without this, two submissions landing in the same
    // instant can both pass the duplicate check, or collide on the same row.
    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var sheet = getSheet_();

      if (sheet.getLastRow() === 0) {
        sheet.appendRow(HEADERS);
        sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
        sheet.setFrozenRows(1);
      }

      // The sheet is the only store, so the sheet is also the dedupe index.
      // This design has no server-side rate limit, so without this one person
      // hammering the button fills the sheet with noise.
      if (emailExists(sheet, email)) {
        return jsonOut({ status: 'duplicate' });
      }

      sheet.appendRow([new Date(), email, source]);
      return jsonOut({ status: 'ok' });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    // Logger output is visible in Apps Script → Executions.
    Logger.log('subscribe failed: ' + err);
    return jsonOut({ status: 'error' });
  }
}

/**
 * Resolve the target sheet, whether this project is bound to a spreadsheet or
 * standalone. Trailing underscore keeps it out of the editor's Run dropdown.
 */
function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (!ss) {
    // Standalone project: nothing is "active", so fall back to an explicit id.
    var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
    if (!id) {
      throw new Error(
        'No spreadsheet attached. This project is standalone, so set a ' +
          'SHEET_ID script property (Project Settings → Script Properties) to ' +
          "the id in your sheet's URL, or recreate the script from the sheet " +
          'via Extensions → Apps Script.',
      );
    }
    ss = SpreadsheetApp.openById(id);
  }

  var sheet = ss.getSheets()[0];
  if (!sheet) throw new Error('Spreadsheet has no sheets/tabs.');
  return sheet;
}

/**
 * Run this from the editor to verify authorization and sheet access. It writes
 * a real row — delete it afterwards. Use this instead of running doPost, which
 * cannot work without a real HTTP request behind it.
 */
function testAppend() {
  var sheet = getSheet_();
  Logger.log('Resolved sheet: "%s" in "%s"', sheet.getName(), sheet.getParent().getName());

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([new Date(), 'test@example.com', 'editor-test']);
  Logger.log('Appended a test row. Delete it before going live.');
}

/** Case-insensitive scan of the Email column. */
function emailExists(sheet, email) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  var emailCol = HEADERS.indexOf('Email') + 1;
  var values = sheet.getRange(2, emailCol, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === email) return true;
  }
  return false;
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

/**
 * GET returns a health string rather than an error, so you can paste the /exec
 * URL into a browser to confirm the deployment is live before wiring the form.
 */
function doGet() {
  return ContentService.createTextOutput('AbundanceAI subscribe endpoint: ok');
}
