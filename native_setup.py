#!/usr/bin/env python3
"""Adds the phone-only parts to the Android project that Capacitor generates:
home-screen widget, app-icon shortcuts, bank SMS reading, fingerprint unlock,
backup files in Downloads, share-to-app, back button, app icon and colours.
Usage: python3 native_setup.py <path to android project> [icon-512.png]"""
import os, re, sys

A = sys.argv[1] if len(sys.argv) > 1 else "build/android"
ICON = sys.argv[2] if len(sys.argv) > 2 else "icon-512.png"
MAIN = os.path.join(A, "app/src/main")
JAVA = os.path.join(MAIN, "java/com/personaldiary/app")
RES = os.path.join(MAIN, "res")
GREEN = "#0F6B5C"


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text.lstrip("\n"))


def edit(path, old, new, count=1):
    s = open(path, encoding="utf-8").read()
    if new.strip() and new.strip() in s:
        return  # already applied
    if old not in s:
        raise SystemExit("native_setup: could not find %r in %s" % (old[:60], path))
    open(path, "w", encoding="utf-8").write(s.replace(old, new, count))


# ---------------------------------------------------------------- Java
write(os.path.join(JAVA, "MainActivity.java"), r'''
package com.personaldiary.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    /** What the app was opened with (widget button, shortcut, shared text or file), as JSON. Read once by the page. */
    public static volatile String pending = "";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DueNativePlugin.class);
        super.onCreate(savedInstanceState);
        capture(getIntent());
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                try {
                    WebView w = getBridge().getWebView();
                    w.evaluateJavascript("(window.__dsBack?window.__dsBack():false)", value -> {
                        if (!"true".equals(value)) moveTaskToBack(true);
                    });
                } catch (Exception e) {
                    moveTaskToBack(true);
                }
            }
        });
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent == null) return;
        setIntent(intent);
        capture(intent);
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                final WebView w = getBridge().getWebView();
                w.post(() -> w.evaluateJavascript("window.__dsLaunch&&window.__dsLaunch()", null));
            }
        } catch (Exception ignored) {}
    }

    private void capture(Intent intent) {
        if (intent == null || intent.getBooleanExtra("ds_done", false)) return;
        try {
            JSONObject o = new JSONObject();
            String add = intent.getStringExtra("add");
            if (add != null) o.put("add", add);
            if (Intent.ACTION_SEND.equals(intent.getAction())) {
                CharSequence text = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
                if (text != null) o.put("text", text.toString());
                Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
                if (uri != null) {
                    String file = readText(uri);
                    if (file != null) o.put("file", file);
                }
            }
            if (o.length() > 0) {
                pending = o.toString();
                intent.putExtra("ds_done", true);
            }
        } catch (Exception ignored) {}
    }

    private String readText(Uri uri) {
        try (InputStream in = getContentResolver().openInputStream(uri)) {
            if (in == null) return null;
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            int n, total = 0;
            while ((n = in.read(buf)) > 0) {
                total += n;
                if (total > 40 * 1024 * 1024) return null;
                out.write(buf, 0, n);
            }
            return out.toString("UTF-8");
        } catch (Exception e) {
            return null;
        }
    }
}
''')

write(os.path.join(JAVA, "DueNativePlugin.java"), r'''
package com.personaldiary.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.speech.RecognizerIntent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.annotation.ActivityCallback;
import java.util.ArrayList;
import java.util.Collections;
import android.app.PendingIntent;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.IntentSenderRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.common.api.Scope;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(
    name = "DueNative",
    permissions = { @Permission(alias = "sms", strings = { Manifest.permission.READ_SMS }) }
)
public class DueNativePlugin extends Plugin {

    /* Google Drive backup: sign-in screen result comes back here */
    private ActivityResultLauncher<IntentSenderRequest> authL;
    private PluginCall authCall;

    @Override
    public void load() {
        try {
            authL = getActivity().registerForActivityResult(new ActivityResultContracts.StartIntentSenderForResult(), r -> {
                PluginCall c = authCall;
                authCall = null;
                if (c == null) return;
                try {
                    AuthorizationResult a = Identity.getAuthorizationClient(getActivity()).getAuthorizationResultFromIntent(r.getData());
                    JSObject o = new JSObject();
                    o.put("token", a.getAccessToken());
                    o.put("email", "");
                    c.resolve(o);
                } catch (Exception e) {
                    c.reject("cancelled");
                }
            });
        } catch (Exception e) {
            authL = null;
        }
    }

    /** Access token for files this app creates in the user's Google Drive. */
    @PluginMethod
    public void driveToken(PluginCall call) {
        final boolean ask = call.getBoolean("interactive", true);
        AuthorizationRequest req = AuthorizationRequest.builder()
            .setRequestedScopes(Collections.singletonList(new Scope("https://www.googleapis.com/auth/drive.file")))
            .build();
        try {
            Identity.getAuthorizationClient(getActivity()).authorize(req)
                .addOnSuccessListener(res -> {
                    if (res.hasResolution()) {
                        PendingIntent pi = res.getPendingIntent();
                        if (!ask || pi == null || authL == null) { call.reject("needs-consent"); return; }
                        if (authCall != null) { authCall.reject("cancelled"); }
                        authCall = call;
                        authL.launch(new IntentSenderRequest.Builder(pi.getIntentSender()).build());
                    } else {
                        JSObject o = new JSObject();
                        o.put("token", res.getAccessToken());
                        call.resolve(o);
                    }
                })
                .addOnFailureListener(e -> call.reject("Google sign-in failed: " + e.getMessage()));
        } catch (Exception e) {
            call.reject("Google sign-in isn't available on this phone");
        }
    }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences("due_native", Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void getLaunch(PluginCall call) {
        JSObject r = new JSObject();
        r.put("data", MainActivity.pending);
        MainActivity.pending = "";
        call.resolve(r);
    }

    @PluginMethod
    public void setWidget(PluginCall call) {
        getContext().getSharedPreferences("due_widget", Context.MODE_PRIVATE).edit()
            .putString("l1", call.getString("line1", ""))
            .putString("l2", call.getString("line2", ""))
            .putString("l3", call.getString("line3", ""))
            .apply();
        DueWidget.refresh(getContext());
        call.resolve();
    }

    /** Speech to text through the phone's own voice typing screen (no microphone permission needed). */
    @PluginMethod
    public void listen(PluginCall call) {
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, call.getString("lang", "en-IN"));
        i.putExtra(RecognizerIntent.EXTRA_PROMPT, call.getString("prompt", "Say the amount, place and category"));
        i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
        try {
            startActivityForResult(call, i, "listenDone");
        } catch (ActivityNotFoundException e) {
            call.reject("No voice typing app on this phone");
        } catch (Exception e) {
            call.reject("Couldn't start voice typing");
        }
    }

    @ActivityCallback
    private void listenDone(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent d = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || d == null) { call.reject("cancelled"); return; }
        ArrayList<String> r = d.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
        JSObject o = new JSObject();
        JSArray a = new JSArray();
        if (r != null) for (String x : r) a.put(x);
        o.put("text", r != null && !r.isEmpty() ? r.get(0) : "");
        o.put("all", a);
        call.resolve(o);
    }

    @PluginMethod
    public void readSms(PluginCall call) {
        if (getPermissionState("sms") != PermissionState.GRANTED) {
            requestPermissionForAlias("sms", call, "smsPermission");
            return;
        }
        doReadSms(call);
    }

    @PermissionCallback
    private void smsPermission(PluginCall call) {
        if (getPermissionState("sms") == PermissionState.GRANTED) doReadSms(call);
        else call.reject("SMS permission was not given");
    }

    private void doReadSms(PluginCall call) {
        long since = 0;
        try { since = Long.parseLong(call.getString("since", "0")); } catch (Exception ignored) {}
        JSArray list = new JSArray();
        Cursor c = null;
        try {
            c = getContext().getContentResolver().query(Uri.parse("content://sms/inbox"),
                new String[] { "_id", "address", "body", "date" }, "date > ?",
                new String[] { String.valueOf(since) }, "date DESC");
            int n = 0;
            int max = call.getInt("max", 150);
            while (c != null && c.moveToNext() && n < max) {
                JSObject m = new JSObject();
                m.put("id", c.getString(0));
                m.put("address", c.getString(1));
                m.put("body", c.getString(2));
                m.put("date", String.valueOf(c.getLong(3)));
                list.put(m);
                n++;
            }
        } catch (Exception e) {
            call.reject("Could not read messages: " + e.getMessage());
            return;
        } finally {
            if (c != null) c.close();
        }
        JSObject r = new JSObject();
        r.put("messages", list);
        call.resolve(r);
    }

    @PluginMethod
    public void saveDownload(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            call.reject("Needs Android 10 or newer");
            return;
        }
        try {
            String name = call.getString("name", "due-and-spend-backup.json");
            String text = call.getString("text", "");
            ContentResolver cr = getContext().getContentResolver();
            ContentValues v = new ContentValues();
            v.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
            v.put(MediaStore.MediaColumns.MIME_TYPE, call.getString("mime", "application/json"));
            v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/DueAndSpend");
            Uri uri = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
            if (uri == null) { call.reject("Could not create the file"); return; }
            String b64 = call.getString("b64", "");
            byte[] bytes = b64 != null && !b64.isEmpty() ? android.util.Base64.decode(b64, android.util.Base64.DEFAULT) : text.getBytes(StandardCharsets.UTF_8);
            try (OutputStream os = cr.openOutputStream(uri)) {
                if (os == null) { call.reject("Could not open the file"); return; }
                os.write(bytes);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Backup failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void notifStatus(PluginCall call) {
        JSObject r = new JSObject();
        boolean on = false;
        try {
            on = androidx.core.app.NotificationManagerCompat.getEnabledListenerPackages(getContext())
                .contains(getContext().getPackageName());
        } catch (Exception ignored) {}
        r.put("enabled", on);
        r.put("conn", String.valueOf(DueNotifListener.getLong(getContext(), "conn")));
        r.put("disc", String.valueOf(DueNotifListener.getLong(getContext(), "disc")));
        r.put("seen", String.valueOf(DueNotifListener.getLong(getContext(), "seen")));
        r.put("sms", getPermissionState("sms") == PermissionState.GRANTED);
        if (on && call.getBoolean("rebind", false)) {
            try {
                android.content.ComponentName cn = new android.content.ComponentName(getContext(), DueNotifListener.class);
                android.content.pm.PackageManager pm = getContext().getPackageManager();
                pm.setComponentEnabledSetting(cn, android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_DISABLED, android.content.pm.PackageManager.DONT_KILL_APP);
                pm.setComponentEnabledSetting(cn, android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_ENABLED, android.content.pm.PackageManager.DONT_KILL_APP);
                if (Build.VERSION.SDK_INT >= 24) android.service.notification.NotificationListenerService.requestRebind(cn);
            } catch (Exception ignored) {}
        }
        call.resolve(r);
    }

    @PluginMethod
    public void notifLog(PluginCall call) {
        try {
            JSObject r = new JSObject();
            r.put("items", new JSArray(DueNotifListener.getLog(getContext())));
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Could not read the alert log");
        }
    }

    @PluginMethod
    public void readClip(PluginCall call) {
        JSObject r = new JSObject();
        String t = "";
        try {
            android.content.ClipboardManager cm = (android.content.ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm != null && cm.hasPrimaryClip() && cm.getPrimaryClip().getItemCount() > 0) {
                CharSequence c = cm.getPrimaryClip().getItemAt(0).coerceToText(getContext());
                if (c != null) t = c.toString();
            }
        } catch (Exception ignored) {}
        r.put("text", t.length() > 2000 ? t.substring(0, 2000) : t);
        call.resolve(r);
    }

    @PluginMethod
    public void openNotifSettings(PluginCall call) {
        try {
            android.content.Intent i = new android.content.Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS");
            i.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open notification settings");
        }
    }

    @PluginMethod
    public void readNotifs(PluginCall call) {
        try {
            JSObject r = new JSObject();
            r.put("items", new JSArray(DueNotifListener.take(getContext())));
            call.resolve(r);
        } catch (Exception e) {
            call.reject("Could not read payment alerts");
        }
    }

    /** Deletes this app's older backup files in Downloads, keeping the newest ones. */
    @PluginMethod
    public void pruneBackups(PluginCall call) {
        int removed = 0;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            int keep = call.getInt("keep", 14);
            String prefix = call.getString("prefix", "due-and-spend-backup-");
            Cursor c = null;
            try {
                ContentResolver cr = getContext().getContentResolver();
                Uri base = MediaStore.Downloads.EXTERNAL_CONTENT_URI;
                c = cr.query(base, new String[] { MediaStore.MediaColumns._ID },
                    MediaStore.MediaColumns.DISPLAY_NAME + " LIKE ?", new String[] { prefix + "%" },
                    MediaStore.MediaColumns.DATE_ADDED + " DESC");
                int n = 0;
                while (c != null && c.moveToNext()) {
                    n++;
                    if (n <= keep) continue;
                    try {
                        removed += cr.delete(android.content.ContentUris.withAppendedId(base, c.getLong(0)), null, null);
                    } catch (Exception ignored) {}
                }
            } catch (Exception ignored) {
            } finally {
                if (c != null) c.close();
            }
        }
        JSObject r = new JSObject();
        r.put("removed", removed);
        call.resolve(r);
    }

    /** Opens an attached file in another app (PDF viewer, gallery). */
    @PluginMethod
    public void openFile(PluginCall call) {
        try {
            String name = call.getString("name", "file").replaceAll("[^A-Za-z0-9._ -]", "_");
            String mime = call.getString("mime", "*/*");
            byte[] data = android.util.Base64.decode(call.getString("data", ""), android.util.Base64.DEFAULT);
            java.io.File dir = new java.io.File(getContext().getCacheDir(), "shared");
            if (!dir.exists()) dir.mkdirs();
            java.io.File f = new java.io.File(dir, name);
            try (java.io.FileOutputStream out = new java.io.FileOutputStream(f)) { out.write(data); }
            Uri uri = androidx.core.content.FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
            android.content.Intent i = new android.content.Intent(android.content.Intent.ACTION_VIEW);
            i.setDataAndType(uri, mime == null || mime.isEmpty() ? "*/*" : mime);
            i.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);
            android.content.Intent chooser = android.content.Intent.createChooser(i, "Open with");
            chooser.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK | android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getContext().startActivity(chooser);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open the file: " + e.getMessage());
        }
    }

    /** Opens a web link (WhatsApp, a download) outside the app. */
    @PluginMethod
    public void openUrl(PluginCall call) {
        try {
            android.content.Intent i = new android.content.Intent(android.content.Intent.ACTION_VIEW, Uri.parse(call.getString("url", "")));
            i.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open the link");
        }
    }

    /** Downloads the newer APK from the GitHub release and opens Android's installer. */
    @PluginMethod
    public void installApk(PluginCall call) {
        final String url = call.getString("url", "");
        if (Build.VERSION.SDK_INT >= 26 && !getContext().getPackageManager().canRequestPackageInstalls()) {
            try {
                android.content.Intent s = new android.content.Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
                s.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(s);
            } catch (Exception ignored) {}
            JSObject r = new JSObject();
            r.put("needPermission", true);
            call.resolve(r);
            return;
        }
        new Thread(() -> {
            try {
                java.io.File dir = new java.io.File(getContext().getCacheDir(), "shared");
                if (!dir.exists()) dir.mkdirs();
                java.io.File f = new java.io.File(dir, "personal-diary-update.apk");
                String u = url;
                java.net.HttpURLConnection c = null;
                for (int hop = 0; hop < 6; hop++) {
                    c = (java.net.HttpURLConnection) new java.net.URL(u).openConnection();
                    c.setInstanceFollowRedirects(false);
                    c.setConnectTimeout(20000);
                    c.setReadTimeout(60000);
                    int code = c.getResponseCode();
                    if (code >= 300 && code < 400 && c.getHeaderField("Location") != null) { u = new java.net.URL(new java.net.URL(u), c.getHeaderField("Location")).toString(); c.disconnect(); continue; }
                    if (code != 200) throw new Exception("HTTP " + code);
                    break;
                }
                try (java.io.InputStream in = c.getInputStream(); java.io.FileOutputStream out = new java.io.FileOutputStream(f)) {
                    byte[] buf = new byte[65536];
                    int n;
                    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                }
                if (f.length() < 100000) throw new Exception("The download looks incomplete");
                Uri uri = androidx.core.content.FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
                android.content.Intent i = new android.content.Intent(android.content.Intent.ACTION_VIEW);
                i.setDataAndType(uri, "application/vnd.android.package-archive");
                i.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION | android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i);
                JSObject r = new JSObject();
                r.put("started", true);
                call.resolve(r);
            } catch (Exception e) {
                call.reject("Update download failed: " + e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void exitApp(PluginCall call) {
        call.resolve();
        getActivity().runOnUiThread(() -> getActivity().moveTaskToBack(true));
    }

    @PluginMethod
    public void canAuth(PluginCall call) {
        JSObject r = new JSObject();
        boolean ok = false;
        try {
            ok = BiometricManager.from(getContext()).canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK)
                == BiometricManager.BIOMETRIC_SUCCESS;
        } catch (Exception ignored) {}
        r.put("ok", ok);
        call.resolve(r);
    }

    /** Stores the PIN inside the app's private storage so a fingerprint can unlock; an empty PIN clears it. */
    @PluginMethod
    public void setPin(PluginCall call) {
        String pin = call.getString("pin", "");
        if (pin == null || pin.isEmpty()) prefs().edit().remove("pin").apply();
        else prefs().edit().putString("pin", pin).apply();
        call.resolve();
    }

    @PluginMethod
    public void auth(final PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                BiometricPrompt prompt = new BiometricPrompt(getActivity(), ContextCompat.getMainExecutor(getContext()),
                    new BiometricPrompt.AuthenticationCallback() {
                        @Override
                        public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                            JSObject r = new JSObject();
                            r.put("ok", true);
                            r.put("pin", prefs().getString("pin", ""));
                            call.resolve(r);
                        }

                        @Override
                        public void onAuthenticationError(int errorCode, CharSequence errString) {
                            call.reject(String.valueOf(errString));
                        }
                    });
                BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
                    .setTitle("Unlock Personal Diary")
                    .setNegativeButtonText("Use PIN")
                    .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_WEAK)
                    .build();
                prompt.authenticate(info);
            } catch (Exception e) {
                call.reject("Fingerprint is not available: " + e.getMessage());
            }
        });
    }
}
''')

write(os.path.join(JAVA, "DueWidget.java"), r'''
package com.personaldiary.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class DueWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) manager.updateAppWidget(id, build(context));
    }

    static RemoteViews build(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.due_widget);
        SharedPreferences p = c.getSharedPreferences("due_widget", Context.MODE_PRIVATE);
        v.setTextViewText(R.id.w_l1, p.getString("l1", "Personal Diary"));
        v.setTextViewText(R.id.w_l2, p.getString("l2", "Open the app once to fill this in"));
        String l3 = p.getString("l3", "");
        v.setTextViewText(R.id.w_l3, l3);
        v.setViewVisibility(R.id.w_l3, l3.isEmpty() ? android.view.View.GONE : android.view.View.VISIBLE);
        v.setOnClickPendingIntent(R.id.w_mic, open(c, 4, "voice"));
        v.setOnClickPendingIntent(R.id.w_root, open(c, 0, null));
        v.setOnClickPendingIntent(R.id.w_out, open(c, 1, "out"));
        v.setOnClickPendingIntent(R.id.w_in, open(c, 2, "in"));
        v.setOnClickPendingIntent(R.id.w_sms, open(c, 3, "sms"));
        return v;
    }

    private static PendingIntent open(Context c, int request, String add) {
        Intent i = new Intent(c, MainActivity.class);
        i.setAction("com.personaldiary.app.WIDGET_" + request);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (add != null) i.putExtra("add", add);
        return PendingIntent.getActivity(c, request, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    public static void refresh(Context c) {
        try {
            AppWidgetManager m = AppWidgetManager.getInstance(c);
            int[] ids = m.getAppWidgetIds(new ComponentName(c, DueWidget.class));
            for (int id : ids) m.updateAppWidget(id, build(c));
        } catch (Exception ignored) {}
    }
}
''')

write(os.path.join(JAVA, "DueNotifListener.java"), r'''
package com.personaldiary.app;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

/** Keeps notifications that look like payments (bank apps, Gmail, Outlook, SMS) for the app to review. */
public class DueNotifListener extends NotificationListenerService {
    static final String PREFS = "due_notifs";
    private static final Pattern MONEY = Pattern.compile(
        "(?i)(inr|rs\\.?|\\u20B9|qar|qr|usd|aed|sar|\\$|\\u0631\\.?\\s?\\u0642)\\s?[0-9][0-9,]*(\\.[0-9]+)?|[0-9][0-9,]*(\\.[0-9]+)?\\s?(inr|qar|qr|rs|\\u0631\\.?\\s?\\u0642|\\u0631\\u064A\\u0627\\u0644)");
    private static final Pattern BANKY = Pattern.compile(
        "(?i)bank|alert|transaction|txn|card|a/c|account|credit|debit|upi|imps|neft|sms service|payment|purchase|\\u0628\\u0637\\u0627\\u0642\\u0629|\\u062D\\u0633\\u0627\\u0628");
    private static final java.util.Set<String> MAIL = new java.util.HashSet<>(java.util.Arrays.asList(
        "com.google.android.gm", "com.microsoft.office.outlook", "com.samsung.android.email.provider", "com.yahoo.mobile.client.android.mail",
        "com.google.android.apps.messaging", "com.samsung.android.messaging", "com.android.mms", "com.truecaller"));
    private static final Pattern WORDS = Pattern.compile(
        "(?i)debited|credited|debit|credit|spent|paid|payment|purchase|received|withdrawn|withdrawal|transaction|txn|charged|refund|deducted|transferred|sent|used|approved|\\u0634\\u0631\\u0627\\u0621|\\u062E\\u0635\\u0645|\\u0625\\u064A\\u062F\\u0627\\u0639|\\u0633\\u062D\\u0628");
    private static final Pattern SKIP = Pattern.compile("(?i)\\botp\\b|one[ -]time password|verification code|passcode");

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            if (sbn == null || getPackageName().equals(sbn.getPackageName())) return;
            Notification n = sbn.getNotification();
            if (n == null || n.extras == null) return;
            if ((n.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;
            Bundle e = n.extras;
            String title = str(e.getCharSequence(Notification.EXTRA_TITLE));
            String text = str(e.getCharSequence(Notification.EXTRA_BIG_TEXT));
            if (text.isEmpty()) text = str(e.getCharSequence(Notification.EXTRA_TEXT));
            CharSequence[] lines = e.getCharSequenceArray(Notification.EXTRA_TEXT_LINES);
            if (text.isEmpty() && lines != null) {
                StringBuilder b = new StringBuilder();
                for (CharSequence l : lines) if (l != null) b.append(l).append(". ");
                text = b.toString();
            }
            String sub = str(e.getCharSequence(Notification.EXTRA_SUB_TEXT));
            String all = (title + ". " + text + (sub.isEmpty() ? "" : ". " + sub)).trim();
            if (all.length() > 1500) all = all.substring(0, 1500);
            String pkg = sbn.getPackageName();
            boolean mail = MAIL.contains(pkg), money = MONEY.matcher(all).find(), words = WORDS.matcher(all).find(), bank = BANKY.matcher(all).find();
            if (!mail && !money && !bank) return;
            String why;
            if (SKIP.matcher(all).find()) why = "code";
            else if (money && (words || bank)) why = "kept";
            else if (mail && bank) why = "noamt";
            else why = money ? "nowords" : "noamt0";
            log(this, label(pkg), all, sbn.getPostTime(), why);
            if (why.equals("kept") || why.equals("noamt")) save(this, pkg, label(pkg), all, sbn.getPostTime());
        } catch (Exception ignored) {}
    }

    @Override
    public void onListenerConnected() {
        getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putLong("conn", System.currentTimeMillis()).apply();
    }

    @Override
    public void onListenerDisconnected() {
        getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putLong("disc", System.currentTimeMillis()).apply();
        try {
            if (android.os.Build.VERSION.SDK_INT >= 24)
                requestRebind(new android.content.ComponentName(this, DueNotifListener.class));
        } catch (Exception ignored) {}
    }

    /** The last 40 notifications that looked money-related, with what happened to each. Stays on the phone. */
    private static synchronized void log(Context c, String app, String body, long time, String why) {
        try {
            SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            JSONArray a = new JSONArray(p.getString("log", "[]"));
            JSONObject o = new JSONObject();
            o.put("app", app);
            o.put("body", body.length() > 220 ? body.substring(0, 220) : body);
            o.put("time", String.valueOf(time));
            o.put("why", why);
            a.put(o);
            JSONArray out = new JSONArray();
            for (int i = Math.max(0, a.length() - 40); i < a.length(); i++) out.put(a.get(i));
            p.edit().putString("log", out.toString()).putLong("seen", time).apply();
        } catch (Exception ignored) {}
    }

    static String getLog(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("log", "[]");
    }

    static long getLong(Context c, String k) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getLong(k, 0);
    }

    private static String str(CharSequence c) {
        return c == null ? "" : c.toString().trim();
    }

    private String label(String pkg) {
        try {
            PackageManager pm = getPackageManager();
            ApplicationInfo ai = pm.getApplicationInfo(pkg, 0);
            return String.valueOf(pm.getApplicationLabel(ai));
        } catch (Exception e) {
            return pkg;
        }
    }

    private static synchronized void save(Context c, String pkg, String app, String body, long time) throws Exception {
        SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSONArray a = new JSONArray(p.getString("q", "[]"));
        String id = pkg + ":" + Integer.toHexString(body.hashCode());
        for (int i = 0; i < a.length(); i++) {
            if (id.equals(a.getJSONObject(i).optString("id"))) return;
        }
        JSONObject o = new JSONObject();
        o.put("id", id);
        o.put("pkg", pkg);
        o.put("app", app);
        o.put("body", body);
        o.put("time", String.valueOf(time));
        a.put(o);
        JSONArray out = new JSONArray();
        for (int i = Math.max(0, a.length() - 100); i < a.length(); i++) out.put(a.get(i));
        p.edit().putString("q", out.toString()).apply();
    }

    /** Returns everything kept so far and clears the list. */
    static synchronized String take(Context c) {
        SharedPreferences p = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String s = p.getString("q", "[]");
        p.edit().putString("q", "[]").apply();
        return s;
    }
}
''')

# ---------------------------------------------------------------- resources
write(os.path.join(RES, "layout/due_widget.xml"), '''
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/w_root" android:layout_width="match_parent" android:layout_height="match_parent"
    android:orientation="vertical" android:padding="12dp" android:background="@drawable/due_widget_bg">
    <TextView android:id="@+id/w_l1" android:layout_width="match_parent" android:layout_height="wrap_content"
        android:text="Personal Diary" android:textColor="#FFFFFF" android:textSize="15sp" android:textStyle="bold"
        android:maxLines="1" android:ellipsize="end" />
    <TextView android:id="@+id/w_l2" android:layout_width="match_parent" android:layout_height="wrap_content"
        android:text="" android:textColor="#D6F0E8" android:textSize="12sp" android:maxLines="1" android:ellipsize="end" />
    <TextView android:id="@+id/w_l3" android:layout_width="match_parent" android:layout_height="wrap_content"
        android:layout_marginTop="4dp" android:text="" android:textColor="#FFFFFF" android:textSize="12sp"
        android:maxLines="3" android:ellipsize="end" android:visibility="gone" />
    <LinearLayout android:layout_width="match_parent" android:layout_height="wrap_content"
        android:orientation="horizontal" android:layout_marginTop="8dp">
        <TextView android:id="@+id/w_out" android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1"
            android:gravity="center" android:padding="8dp" android:text="+ Expense" android:textColor="#0F6B5C"
            android:textSize="13sp" android:textStyle="bold" android:background="@drawable/due_widget_btn" />
        <TextView android:id="@+id/w_in" android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1"
            android:layout_marginStart="6dp" android:gravity="center" android:padding="8dp" android:text="+ Income"
            android:textColor="#0F6B5C" android:textSize="13sp" android:textStyle="bold" android:background="@drawable/due_widget_btn" />
        <TextView android:id="@+id/w_sms" android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1"
            android:layout_marginStart="6dp" android:gravity="center" android:padding="8dp" android:text="Bank SMS"
            android:textColor="#0F6B5C" android:textSize="13sp" android:textStyle="bold" android:background="@drawable/due_widget_btn" />
        <TextView android:id="@+id/w_mic" android:layout_width="wrap_content" android:layout_height="wrap_content"
            android:layout_marginStart="6dp" android:gravity="center" android:paddingTop="8dp" android:paddingBottom="8dp"
            android:paddingStart="12dp" android:paddingEnd="12dp" android:text="&#x1F3A4;" android:textColor="#0F6B5C"
            android:textSize="13sp" android:background="@drawable/due_widget_btn" android:contentDescription="Add by voice" />
    </LinearLayout>
</LinearLayout>
''')
write(os.path.join(RES, "drawable/due_widget_bg.xml"), '''
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#0F6B5C" /><corners android:radius="20dp" />
</shape>
''')
write(os.path.join(RES, "drawable/due_widget_btn.xml"), '''
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#FFFFFF" /><corners android:radius="14dp" />
</shape>
''')
write(os.path.join(RES, "xml/due_widget_info.xml"), '''
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp" android:minHeight="110dp" android:updatePeriodMillis="0"
    android:initialLayout="@layout/due_widget" android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen" />
''')
write(os.path.join(RES, "values/due_strings.xml"), '''
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="ds_add_out">Add expense</string>
    <string name="ds_add_in">Add income</string>
    <string name="ds_add_sms">Paste bank SMS</string>
</resources>
''')


def shortcut(sid, label, add):
    return ('''    <shortcut android:shortcutId="%s" android:enabled="true" android:icon="@mipmap/ic_launcher"
        android:shortcutShortLabel="@string/%s" android:shortcutLongLabel="@string/%s">
        <intent android:action="android.intent.action.VIEW" android:targetPackage="com.personaldiary.app"
            android:targetClass="com.personaldiary.app.MainActivity">
            <extra android:name="add" android:value="%s" />
        </intent>
    </shortcut>
''' % (sid, label, label, add))


write(os.path.join(RES, "xml/shortcuts.xml"),
      '<?xml version="1.0" encoding="utf-8"?>\n<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">\n'
      + shortcut("add_out", "ds_add_out", "out") + shortcut("add_in", "ds_add_in", "in")
      + shortcut("add_sms", "ds_add_sms", "sms") + "</shortcuts>\n")

# ---------------------------------------------------------------- manifest, gradle, theme
MAN = os.path.join(MAIN, "AndroidManifest.xml")
edit(MAN, '''                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
''', '''                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.SEND" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="text/plain" />
                <data android:mimeType="application/json" />
            </intent-filter>
            <meta-data android:name="android.app.shortcuts" android:resource="@xml/shortcuts" />
''')
edit(MAN, '''        <provider
            android:name="androidx.core.content.FileProvider"''', '''        <service android:name=".DueNotifListener" android:label="Personal Diary payment alerts"
            android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE" android:exported="true">
            <intent-filter>
                <action android:name="android.service.notification.NotificationListenerService" />
            </intent-filter>
        </service>

        <receiver android:name=".DueWidget" android:exported="true" android:label="Personal Diary">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/due_widget_info" />
        </receiver>

        <provider
            android:name="androidx.core.content.FileProvider"''')
edit(MAN, '''    <uses-permission android:name="android.permission.INTERNET" />''',
     '''    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.READ_SMS" />
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />
    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />
    <queries>
        <intent><action android:name="android.speech.action.RECOGNIZE_SPEECH" /></intent>
        <intent><action android:name="android.intent.action.VIEW" /><data android:scheme="https" /></intent>
    </queries>''')
edit(os.path.join(A, "app/build.gradle"),
     '''    implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"''',
     '''    implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"
    implementation "androidx.biometric:biometric:1.1.0"
    implementation "com.google.android.gms:play-services-auth:21.2.0"''')
edit(os.path.join(RES, "values/styles.xml"),
     '''        <item name="windowNoTitle">true</item>''',
     '''        <item name="windowNoTitle">true</item>
        <item name="android:statusBarColor">%s</item>
        <item name="android:navigationBarColor">#FFFFFF</item>''' % GREEN)

# ---------------------------------------------------------------- app icon and opening screen
try:
    from PIL import Image
    src = Image.open(ICON).convert("RGBA")
    green = (15, 107, 92, 255)
    for dens, size in {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}.items():
        d = os.path.join(RES, "mipmap-" + dens)
        os.makedirs(d, exist_ok=True)
        icon = src.resize((size, size), Image.LANCZOS)
        icon.save(os.path.join(d, "ic_launcher.png"))
        icon.save(os.path.join(d, "ic_launcher_round.png"))
        fg = Image.new("RGBA", (size * 9 // 4, size * 9 // 4), (0, 0, 0, 0))
        inner = src.resize((size * 3 // 2, size * 3 // 2), Image.LANCZOS)
        fg.paste(inner, ((fg.width - inner.width) // 2, (fg.height - inner.height) // 2))
        fg.save(os.path.join(d, "ic_launcher_foreground.png"))
    for root, _dirs, files in os.walk(RES):
        for f in files:
            p = os.path.join(root, f)
            if f == "splash.png":
                old = Image.open(p)
                w, h = old.size
                bg = Image.new("RGBA", (w, h), green)
                s = max(48, min(w, h) // 4)
                ic = src.resize((s, s), Image.LANCZOS)
                bg.paste(ic, ((w - s) // 2, (h - s) // 2))
                bg.convert("RGB").save(p)
            if f == "ic_launcher_background.xml" and "values" in root:
                t = open(p, encoding="utf-8").read()
                open(p, "w", encoding="utf-8").write(re.sub(r"#[0-9A-Fa-f]{6,8}", GREEN, t))
    print("native_setup: icons and opening screen done")
except Exception as e:  # the app still builds with the default icon
    print("native_setup: icon step skipped:", e)

print("native_setup: done")
