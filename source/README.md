# Personal Diary source

The app is one HTML page built from the files in `src/`.

- `python3 build.py` writes `dist/due-and-spend.html` (the page) and `dist/pwa/index.html` (the copy published at the repo root).
- `extras/` holds `rules.json`, the Gmail reader script and the pre-build check.
- `native_setup.py` adds the Android parts (widget, SMS and alert reading, fingerprint, update installer). The workflow carries its own embedded copy, so after changing it, re-embed it in `build-apk.yml`.
- `test/run*.py` are Playwright test suites (Python + Chrome). Run them from this folder after building; `test/mkpdfs.py` makes the PDF fixtures.
