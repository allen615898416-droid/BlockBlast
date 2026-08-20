/****************************************************************************
Copyright (c) 2015-2016 Chukong Technologies Inc.
Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

http://www.cocos2d-x.org

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
****************************************************************************/
package com.cocos.game;

import android.os.Bundle;
import android.content.Intent;
import android.content.Context;
import android.content.res.Configuration;

import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

import org.json.JSONObject;

import com.cocos.service.SDKWrapper;
import com.cocos.lib.CocosActivity;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.analytics.FirebaseAnalytics;

public class AppActivity extends CocosActivity {

    // ===== Firebase Analytics 配置 =====
    // 值来自 /Users/ivan/Downloads/com.blockwin.game.json（Firebase 项目 cbd-data-4b6f7，
    // client com.blockwin.game，与本项目 Android 包名一致）。
    private static final String FIREBASE_API_KEY = "AIzaSyDCmluNB71iRLxy_BuPJ4ph2QAZz_ZLEu4";
    private static final String FIREBASE_APP_ID = "1:373275799800:android:dbf1cfcb3aa743beefcb0d";
    private static final String FIREBASE_PROJECT_ID = "cbd-data-4b6f7";

    /** 供 JS 侧 native.reflection 调用埋点用的 Context 引用。*/
    private static Context sAppContext;
    /** Firebase Analytics 实例；未成功初始化（占位符未替换）时保持 null，事件桥自动静默降级。*/
    private static FirebaseAnalytics sFirebaseAnalytics;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // DO OTHER INITIALIZATION BELOW
        sAppContext = getApplicationContext();
        SDKWrapper.shared().init(this);

        // Init Firebase Analytics（手动初始化，AndroidManifest.xml 已移除自动初始化的
        // FirebaseInitProvider，避免它在此行之前抢跑导致的闪退）。
        initFirebaseAnalytics();
    }

    private void initFirebaseAnalytics() {
        if (FIREBASE_API_KEY.startsWith("REPLACE_WITH_")) {
            // 占位符未替换，说明 Firebase 项目还未创建/配置，直接跳过，不影响其余功能。
            android.util.Log.w("Firebase", "Firebase Analytics skipped: placeholder keys not replaced yet");
            return;
        }
        try {
            FirebaseOptions options = new FirebaseOptions.Builder()
                    .setApiKey(FIREBASE_API_KEY)
                    .setApplicationId(FIREBASE_APP_ID)
                    .setProjectId(FIREBASE_PROJECT_ID)
                    .build();
            FirebaseApp app = FirebaseApp.initializeApp(this, options);
            if (app != null) {
                sFirebaseAnalytics = FirebaseAnalytics.getInstance(this);
            }
        } catch (Throwable t) {
            android.util.Log.w("Firebase", "initFirebaseAnalytics failed: " + t.getMessage());
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        SDKWrapper.shared().onResume();
    }

    @Override
    protected void onPause() {
        super.onPause();
        SDKWrapper.shared().onPause();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        // Workaround in https://stackoverflow.com/questions/16283079/re-launch-of-activity-on-home-button-but-only-the-first-time/16447508
        if (!isTaskRoot()) {
            return;
        }
        SDKWrapper.shared().onDestroy();
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        SDKWrapper.shared().onActivityResult(requestCode, resultCode, data);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        SDKWrapper.shared().onNewIntent(intent);
    }

    @Override
    protected void onRestart() {
        super.onRestart();
        SDKWrapper.shared().onRestart();
    }

    @Override
    protected void onStop() {
        super.onStop();
        SDKWrapper.shared().onStop();
    }

    @Override
    public void onBackPressed() {
        SDKWrapper.shared().onBackPressed();
        super.onBackPressed();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        SDKWrapper.shared().onConfigurationChanged(newConfig);
        super.onConfigurationChanged(newConfig);
    }

    @Override
    protected void onRestoreInstanceState(Bundle savedInstanceState) {
        SDKWrapper.shared().onRestoreInstanceState(savedInstanceState);
        super.onRestoreInstanceState(savedInstanceState);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        SDKWrapper.shared().onSaveInstanceState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onStart() {
        SDKWrapper.shared().onStart();
        super.onStart();
    }

    @Override
    public void onLowMemory() {
        SDKWrapper.shared().onLowMemory();
        super.onLowMemory();
    }

    // ===================================================================
    // Firebase Analytics 事件桥：供 Cocos JS 侧 native.reflection.callStaticMethod 调用。
    // JS 调用签名: ('com/cocos/game/AppActivity', 'firebaseOnEvent',
    //              '(Ljava/lang/String;Ljava/lang/String;)V', eventId, paramsJson)
    // paramsJson 是 JS 侧 JSON.stringify 过的任意扁平字段对象（字符串/数字/布尔值）。
    // Firebase 事件命名规则：只能字母/数字/下划线，长度<=40，不能以数字开头（app_launch/game_start/game_over 已合法）。
    // ===================================================================
    public static void firebaseOnEvent(String eventId, String paramsJson) {
        // TrackAudit：统一审计日志，供本地校验工具(adb logcat)核对埋点是否真正触发。
        android.util.Log.i("TrackAudit", "sdk=firebase event=" + eventId + " params=" + paramsJson);
        if (sFirebaseAnalytics == null || eventId == null) return;
        try {
            Map<String, Object> params = parseParamsJson(paramsJson);
            Bundle bundle = new Bundle();
            for (Map.Entry<String, Object> entry : params.entrySet()) {
                Object v = entry.getValue();
                if (v instanceof Integer) {
                    bundle.putInt(entry.getKey(), (Integer) v);
                } else if (v instanceof Long) {
                    bundle.putLong(entry.getKey(), (Long) v);
                } else if (v instanceof Double) {
                    bundle.putDouble(entry.getKey(), (Double) v);
                } else if (v instanceof Boolean) {
                    bundle.putString(entry.getKey(), String.valueOf(v));
                } else {
                    bundle.putString(entry.getKey(), String.valueOf(v));
                }
            }
            sFirebaseAnalytics.logEvent(eventId, bundle);
        } catch (Throwable t) {
            // 埋点失败绝不影响游戏主流程
            android.util.Log.w("Firebase", "firebaseOnEvent failed: " + t.getMessage());
        }
    }

    // ===================================================================
    // Firebase 用户属性桥：单设备聚合值（up_best_score/up_games_played/up_total_score/
    // up_avg_score/up_avg_duration），供 Cocos JS 侧 native.reflection.callStaticMethod 调用。
    // JS 调用签名: ('com/cocos/game/AppActivity', 'firebaseSetUserProperty',
    //              '(Ljava/lang/String;Ljava/lang/String;)V', key, value)
    // ===================================================================
    public static void firebaseSetUserProperty(String key, String value) {
        // TrackAudit：统一审计日志，供本地校验工具(adb logcat)核对埋点是否真正触发。
        android.util.Log.i("TrackAudit", "sdk=firebase event=setUserProperty params={\"" + key + "\":\"" + value + "\"}");
        if (sFirebaseAnalytics == null || key == null) return;
        try {
            sFirebaseAnalytics.setUserProperty(key, value);
        } catch (Throwable t) {
            android.util.Log.w("Firebase", "firebaseSetUserProperty failed: " + t.getMessage());
        }
    }

    /** 解析 JS 侧 JSON.stringify 传来的扁平参数对象（值只会是 string/number/boolean）。 */
    private static Map<String, Object> parseParamsJson(String paramsJson) {
        Map<String, Object> params = new HashMap<>();
        if (paramsJson == null || paramsJson.length() == 0) return params;
        try {
            JSONObject obj = new JSONObject(paramsJson);
            Iterator<String> keys = obj.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                Object value = obj.get(key);
                if (value instanceof Integer || value instanceof Long
                        || value instanceof Double || value instanceof Boolean) {
                    params.put(key, value);
                } else {
                    params.put(key, String.valueOf(value));
                }
            }
        } catch (Throwable t) {
            android.util.Log.w("AppActivity", "parseParamsJson failed: " + t.getMessage());
        }
        return params;
    }
}
