PERSONAL DIARY (version 17, formerly Due & Spend)

UPDATE THE ANDROID APP (widget, SMS, fingerprint and more)
1. In your GitHub repo: Add file > Upload files. Upload these from the zip:
     index.html, manifest.json, sw.js, icon-192.png, icon-512.png
2. Open .github/workflows/build-apk.yml in the repo, tap the pencil (Edit),
   delete everything, paste the whole of the new build-apk.yml, and commit.
3. Actions tab > "Build Android app" > wait for the green tick (5-10 minutes).
   If it does not start by itself, tap Run workflow.
4. Releases page > download due-and-spend.apk > open it > Update.
   Your data stays, because the app is signed with the same key.
5. Open the app once. Home should end with "Version 17".
If the build shows a red cross, open it and send Claude the red error lines.

WHAT IS NEW IN THE PHONE APP
- Widget: long-press the home screen > Widgets > Due & Spend. It shows the next due
  date and safe-to-spend, with buttons for Expense, Income and Bank SMS.
- Long-press the app icon for Add expense, Add income, Paste bank SMS.
- Bank SMS: Home > Settings and backup > "Read bank SMS automatically". Allow the
  permission. New bank messages wait on Home for you to Add or Skip.
- Share an SMS, or a backup file from the web app, to Due & Spend.
- Reminders at 9am (2 days before and on the day) with a "Mark paid" button,
  a summary at 9pm, and an alert when a budget passes 90%.
- Fingerprint: Settings and backup > App lock > set a PIN > open App lock again >
  enter the PIN > Use fingerprint.
- A backup file is saved every week to Downloads/DueAndSpend while app lock is off.
- The phone's back button closes the open form.

NEW IN VERSION 17 (replace BOTH index.html and build-apk.yml)
- New name and app id: "Personal Diary" (com.personaldiary.app). It installs as a NEW app
  next to the old "Due and Spend", so the install conflict is gone.
  Move your data: sign in to sync with your setup code, or restore a backup file.
  Then uninstall the old app. The APK file is now personal-diary.apk.
- Each build has a higher version number, so updates install over each other.
- Attached files open in your phone's PDF viewer or gallery.
- Wealth tab: live gold (24K, 22K, 18K) and silver prices for India and Qatar, and the
  QAR to INR rate, updated daily. The app's QAR rate follows it (can be turned off).
- Gold holdings (grams and purity) and mutual funds (scheme code and units) are valued daily.
- Post office scheme rates (1 Oct - 31 Dec 2026) with calculators.

NEW IN VERSION 16
- Every time the app opens it saves, syncs and (phone app) writes a backup file to
  Downloads/DueAndSpend once a day. Only the latest 14 daily files are kept.
- Pressing back on Home saves and syncs, then shows "All saved" with the last sync and
  backup times, and a Close app button.
- This version changes the Android part too: replace build-apk.yml as well as index.html.

NEW IN VERSION 15
- Dues tab now has three views: Dues, Subscriptions, Documents.
- Subscriptions: Netflix, Prime, Spotify, mobile plans and more, with price paid, billing,
  start and end/renewal dates, paid-so-far, monthly and yearly totals, renewal reminders.
- Documents: passport, visa, QID, licence, warranties, with holder, number, issued by,
  issue and expiry dates, fee paid, reminder 15-90 days before, and renewal history.
- Only index.html changed: upload it and the build runs by itself.

NEW IN VERSION 14
- Payment alerts: Settings and backup > "Read payment alerts (Gmail, Outlook, banks)".
  Allow notification access when asked (if Android says it is restricted: phone Settings >
  Apps > Due & Spend > three dots > Allow restricted settings). Payments from Gmail, Outlook,
  bank apps and SMS then wait on Home to Add or Skip. Only alerts that arrive after this is on.
- Setup code: Google sync shows a code and QR square. Paste it on another phone (or after
  reinstalling) to connect in one step. Settings such as the QAR rate now sync too.
- Data safety check: Settings and backup > Data safety check shows what would come back.
- A full backup with attached files is saved to Downloads/DueAndSpend each month.

WEB APP (browser install) still works the same from index.html.
SYNC BETWEEN PHONES (optional): see SETUP-SYNC.txt. In the phone app you sign in with email and password.
