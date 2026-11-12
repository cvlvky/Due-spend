#!/usr/bin/env python3
"""Adds the phone-only parts to the Android project that Capacitor generates:
home-screen widget, app-icon shortcuts, bank SMS reading, fingerprint unlock,
backup files in Downloads, share-to-app, back button, app icon and colours.
Usage: python3 native_setup.py <path to android project> [icon-512.png]"""
import os, re, sys

A = sys.argv[1] if len(sys.argv) > 1 else "build/android"
ICON = sys.argv[2] if len(sys.argv) > 2 else "icon-512.png"
MAIN = os.path.join(A, "app/src/main")
JAVA = os.path.join(MAIN, "java/com/duespend/app")
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
package com.duespend.app;

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
package com.duespend.app;

import android.Manifest;
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
            .apply();
        DueWidget.refresh(getContext());
        call.resolve();
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
            while (c != null && c.moveToNext() && n < 80) {
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
            v.put(MediaStore.MediaColumns.MIME_TYPE, "application/json");
            v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/DueAndSpend");
            Uri uri = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
            if (uri == null) { call.reject("Could not create the file"); return; }
            try (OutputStream os = cr.openOutputStream(uri)) {
                if (os == null) { call.reject("Could not open the file"); return; }
                os.write(text.getBytes(StandardCharsets.UTF_8));
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Backup failed: " + e.getMessage());
        }
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
                    .setTitle("Unlock Due & Spend")
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
package com.duespend.app;

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
        v.setTextViewText(R.id.w_l1, p.getString("l1", "Due & Spend"));
        v.setTextViewText(R.id.w_l2, p.getString("l2", "Open the app once to fill this in"));
        v.setOnClickPendingIntent(R.id.w_root, open(c, 0, null));
        v.setOnClickPendingIntent(R.id.w_out, open(c, 1, "out"));
        v.setOnClickPendingIntent(R.id.w_in, open(c, 2, "in"));
        v.setOnClickPendingIntent(R.id.w_sms, open(c, 3, "sms"));
        return v;
    }

    private static PendingIntent open(Context c, int request, String add) {
        Intent i = new Intent(c, MainActivity.class);
        i.setAction("com.duespend.app.WIDGET_" + request);
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

# ---------------------------------------------------------------- resources
write(os.path.join(RES, "layout/due_widget.xml"), '''
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/w_root" android:layout_width="match_parent" android:layout_height="match_parent"
    android:orientation="vertical" android:padding="12dp" android:background="@drawable/due_widget_bg">
    <TextView android:id="@+id/w_l1" android:layout_width="match_parent" android:layout_height="wrap_content"
        android:text="Due &amp; Spend" android:textColor="#FFFFFF" android:textSize="15sp" android:textStyle="bold"
        android:maxLines="1" android:ellipsize="end" />
    <TextView android:id="@+id/w_l2" android:layout_width="match_parent" android:layout_height="wrap_content"
        android:text="" android:textColor="#D6F0E8" android:textSize="12sp" android:maxLines="1" android:ellipsize="end" />
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
    android:minWidth="250dp" android:minHeight="90dp" android:updatePeriodMillis="0"
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
        <intent android:action="android.intent.action.VIEW" android:targetPackage="com.duespend.app"
            android:targetClass="com.duespend.app.MainActivity">
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
            android:name="androidx.core.content.FileProvider"''', '''        <receiver android:name=".DueWidget" android:exported="true" android:label="Due &amp; Spend">
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
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />''')
edit(os.path.join(A, "app/build.gradle"),
     '''    implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"''',
     '''    implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"
    implementation "androidx.biometric:biometric:1.1.0"''')
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
