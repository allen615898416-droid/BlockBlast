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

import android.app.Activity;
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
import com.cocos.lib.JsbBridgeWrapper;
import com.cocos.lib.CocosHelper;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.analytics.FirebaseAnalytics;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;

public class AppActivity extends CocosActivity {

    // ===== Firebase Analytics 配置 =====
    // 值来自 /Users/ivan/Downloads/com.blockwin.game.json（Firebase 项目 cbd-data-4b6f7，
    // client com.blockwin.game，与本项目 Android 包名一致）。
    private static final String FIREBASE_API_KEY = "AIzaSyDCmluNB71iRLxy_BuPJ4ph2QAZz_ZLEu4";
    private static final String FIREBASE_APP_ID = "1:373275799800:android:dbf1cfcb3aa743beefcb0d";
    private static final String FIREBASE_PROJECT_ID = "cbd-data-4b6f7";

    // ===== AdMob Rewarded Ad 配置 =====
    // 测试 ID（Google 官方公开测试单元，展示带 "Test Ad" 标识，不会触发封号）。
    // 上线前替换为 AdMob 后台创建的正式 ID（strings.xml: admob_rewarded_unit_id）。
    private static final String ADMOB_REWARDED_UNIT_ID_TEST = "ca-app-pub-3940256099942544/5224354917";

    /** 供 JS 侧 native.reflection 调用埋点用的 Context 引用。*/
    private static Context sAppContext;
    /** Firebase Analytics 实例；未成功初始化（占位符未替换）时保持 null，事件桥自动静默降级。*/
    private static FirebaseAnalytics sFirebaseAnalytics;

    /** AdMob Rewarded Ad instance; null when not loaded. */
    private static volatile RewardedAd sRewardedAd;
    /** Prevent duplicate rewarded-ad load requests while one is already in flight. */
    private static volatile boolean sRewardedAdLoading = false;
    /** Set true once MobileAds.initialize() has completed. */
    private static volatile boolean sAdMobInitialized = false;
    /** Tracks whether the user earned the reward during the current ad session. */
    private static boolean sRewardEarned = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // DO OTHER INITIALIZATION BELOW
        sAppContext = getApplicationContext();
        sActivityRef = new java.lang.ref.WeakReference<>(this);
        SDKWrapper.shared().init(this);

        // Init Firebase Analytics（手动初始化，AndroidManifest.xml 已移除自动初始化的
        // FirebaseInitProvider，避免它在此行之前抢跑导致的闪退）。
        initFirebaseAnalytics();

        // Init AdMob (async, non-blocking).
        // No-ad build: AdMob initialization disabled. The rewarded ad is never
        // shown (GameApp.onReviveContinue grants revive directly), so skip the
        // MobileAds.initialize() + preload network request at startup.
        // initAdMob();
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

    // ===== AdMob Rewarded Ad Bridge (JS calls these via native.reflection) =====

    private static void initAdMob() {
        try {
            MobileAds.initialize(sAppContext, status -> {
                sAdMobInitialized = true;
                android.util.Log.i("AdMob", "Mobile Ads initialized");
                // Preload right away so the ad is usually ready before the first game over.
                preloadRewardedAd();
            });
        } catch (Throwable t) {
            android.util.Log.w("AdMob", "MobileAds.initialize failed: " + t.getMessage());
        }
    }

    /** Resolve the rewarded ad unit id: prefer strings.xml override, fall back to the test id. */
    private static String getRewardedUnitId() {
        try {
            int id = sAppContext.getResources().getIdentifier(
                    "admob_rewarded_unit_id", "string", sAppContext.getPackageName());
            if (id != 0) {
                String v = sAppContext.getString(id);
                if (v != null && !v.isEmpty() && !v.startsWith("REPLACE_WITH_")) return v;
            }
        } catch (Exception ignored) {
        }
        return ADMOB_REWARDED_UNIT_ID_TEST;
    }

    /** Preload a rewarded ad. Safe to call repeatedly; no-op when loaded/loading. */
    public static void preloadRewardedAd() {
        if (sRewardedAd != null || sRewardedAdLoading || sAppContext == null) return;
        sRewardedAdLoading = true;
        try {
            final String unitId = getRewardedUnitId();
            android.util.Log.i("AdMob", "Loading rewarded ad");
            AdRequest request = new AdRequest.Builder().build();
            RewardedAd.load(sAppContext, unitId, request, new RewardedAdLoadCallback() {
                @Override
                public void onAdLoaded(RewardedAd ad) {
                    sRewardedAdLoading = false;
                    sRewardedAd = ad;
                    android.util.Log.i("AdMob", "Rewarded ad loaded");
                    dispatchToCocos("ad_loaded", "");
                    ad.setFullScreenContentCallback(new FullScreenContentCallback() {
                        @Override
                        public void onAdShowedFullScreenContent() {
                            android.util.Log.i("AdMob", "Rewarded ad opened");
                            dispatchToCocos("ad_opened", "");
                        }

                        @Override
                        public void onAdDismissedFullScreenContent() {
                            sRewardedAd = null;
                            android.util.Log.i("AdMob", "Rewarded ad closed; earned=" + sRewardEarned);
                            dispatchToCocos(sRewardEarned ? "ad_rewarded" : "ad_closed", "");
                            preloadRewardedAd();
                        }

                        @Override
                        public void onAdFailedToShowFullScreenContent(AdError error) {
                            sRewardedAd = null;
                            android.util.Log.e("AdMob", "Rewarded ad show failed: code="
                                    + error.getCode() + ", domain=" + error.getDomain()
                                    + ", message=" + error.getMessage());
                            dispatchToCocos("ad_failed", error.getMessage());
                            preloadRewardedAd();
                        }
                    });
                }

                @Override
                public void onAdFailedToLoad(LoadAdError error) {
                    sRewardedAdLoading = false;
                    sRewardedAd = null;
                    android.util.Log.e("AdMob", "Rewarded ad load failed: code="
                            + error.getCode() + ", domain=" + error.getDomain()
                            + ", message=" + error.getMessage());
                    dispatchToCocos("ad_failed", error.getMessage());
                }
            });
        } catch (Throwable t) {
            sRewardedAdLoading = false;
            android.util.Log.e("AdMob", "preloadRewardedAd failed", t);
            dispatchToCocos("ad_failed", String.valueOf(t.getMessage()));
        }
    }

    /**
     * Show the preloaded rewarded ad and report whether the native request was accepted.
     * This directly checks native state so an early ad_loaded callback cannot be lost.
     */
    public static boolean showRewardedAd() {
        final RewardedAd ad = sRewardedAd;
        final Activity activity = getActivityInstance();
        if (ad == null) {
            android.util.Log.w("AdMob", "Rewarded ad is not ready");
            preloadRewardedAd();
            return false;
        }
        if (activity == null) {
            android.util.Log.e("AdMob", "Cannot show rewarded ad: no Activity");
            return false;
        }

        sRewardedAd = null;
        sRewardEarned = false;
        activity.runOnUiThread(() -> {
            try {
                ad.setImmersiveMode(true);
                ad.show(activity, rewardItem -> sRewardEarned = true);
            } catch (Throwable t) {
                android.util.Log.e("AdMob", "showRewardedAd failed", t);
                dispatchToCocos("ad_failed", String.valueOf(t.getMessage()));
                preloadRewardedAd();
            }
        });
        return true;
    }

    private static Activity getActivityInstance() {
        return sActivityRef != null ? sActivityRef.get() : null;
    }

    private static java.lang.ref.WeakReference<Activity> sActivityRef;

    /** Java -> Cocos event dispatch, always on the game thread. */
    private static void dispatchToCocos(String event, String arg) {
        try {
            CocosHelper.runOnGameThread(() ->
                    JsbBridgeWrapper.getInstance().dispatchEventToScript(event, arg));
        } catch (Throwable t) {
            android.util.Log.w("AdMob", "dispatchToCocos failed: " + t.getMessage());
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
