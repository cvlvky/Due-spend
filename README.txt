DUE & SPEND (version 9)

INSTALL OR UPDATE (web app)
1. Upload these files to your GitHub repo (Add file > Upload files); they replace the old ones:
   index.html, manifest.json, sw.js, icon-192.png, icon-512.png
2. Wait 1-2 minutes, open https://YOURNAME.github.io/REPO/ in Chrome, menu > Install app.
3. Close and reopen once or twice. Home should end with "Version 9".

ENTRIES WITHOUT TYPING
- Paste bank SMS: Quick add > Paste bank SMS. Add each account's last 4 digits
  (Accounts > tap the name) so the right account is picked.
- From the Messages app: select the SMS text > Share > Due & Spend (installed app only;
  reinstall the app once so Android picks up the new Share option).
- Bank statement: Home > Settings and backup > Import bank statement (CSV file).
- Receipt photo and "Ask about your money" work only in the Claude link.

REAL ANDROID APP WITH REMINDERS (optional, not tested by Claude)
1. In your repo: Add file > Create new file. Name it exactly:
     .github/workflows/build-apk.yml
   Paste everything from build-apk.yml (in this folder) and commit.
2. Open the Actions tab. If asked, enable workflows. Open "Build Android app" > Run workflow.
3. After about 5-10 minutes open the repo's Releases page and download due-and-spend.apk.
   Android will ask you to allow installing from the browser.
4. The app starts empty. Move data with Settings and backup > Share backup in the old app,
   then Restore from a backup file in the new one.
5. Allow notifications when asked. Reminders arrive 2 days before and on each due date at 9am.
Notes: the build saves a signing key file in your repo so later builds update the same app.
In a public repo anyone can see that key, which is fine for a personal app but not for the Play Store.
If the build fails, send Claude the red error lines from the Actions page.

YOUR DATA
- Kept in the phone's database; a copy for each of the last 7 days you opened the app.
- Deleted items stay in the Recycle bin for 30 days.
- Export a backup file now and then. App lock encrypts data with your PIN (cannot be recovered).

GOOGLE SYNC (optional): see SETUP-SYNC.txt.
