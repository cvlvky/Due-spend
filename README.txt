DUE & SPEND (version 11)

UPDATE THE ANDROID APP (widget, SMS, fingerprint and more)
1. In your GitHub repo: Add file > Upload files. Upload these from the zip:
     index.html, manifest.json, sw.js, icon-192.png, icon-512.png, native_setup.py
2. Open .github/workflows/build-apk.yml in the repo, tap the pencil (Edit),
   delete everything, paste the whole of the new build-apk.yml, and commit.
3. Actions tab > "Build Android app" > wait for the green tick (5-10 minutes).
   If it does not start by itself, tap Run workflow.
4. Releases page > download due-and-spend.apk > open it > Update.
   Your data stays, because the app is signed with the same key.
5. Open the app once. Home should end with "Version 11".
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

WEB APP (browser install) still works the same from index.html.
GOOGLE SYNC (optional): see SETUP-SYNC.txt.
