package com.cocos.game;

import android.content.Context;
import android.media.AudioAttributes;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;

import com.cocos.lib.GlobalObject;

import org.json.JSONArray;
import org.json.JSONObject;

import java.lang.reflect.Field;
import java.lang.reflect.Method;

/**
 * Android haptics 桥接层。
 * TS 层通过 native.reflection.callStaticMethod 调用静态方法。
 */
public final class HapticsBridge {

    private HapticsBridge() {
    }

    private interface VibrateAction {
        void run(Vibrator v) throws Exception;
    }

    private static AudioAttributes hapticsAttrs() {
        return new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
    }

    private static Vibrator getVibrator() {
        if (GlobalObject.getActivity() == null) {
            return null;
        }
        return (Vibrator) GlobalObject.getActivity().getSystemService(Context.VIBRATOR_SERVICE);
    }

    private static boolean hasAmplitudeControl(Vibrator v) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return false;
        }
        try {
            return v.hasAmplitudeControl();
        } catch (Exception e) {
            return false;
        }
    }

    private static void execute(VibrateAction action) {
        if (GlobalObject.getActivity() == null) return;
        Vibrator v = getVibrator();
        if (v == null || !v.hasVibrator()) return;
        try {
            action.run(v);
        } catch (Exception ignored) {
        }
    }

    /** payload: "duration,amplitude" 例如 "40,200" */
    public static void vibrateOneShot(String payload) {
        final long duration;
        final int amplitude;
        try {
            if (payload == null || payload.isEmpty()) return;
            String[] parts = payload.split(",");
            duration = Math.max(0L, Math.min(1000L, Long.parseLong(parts[0].trim())));
            amplitude = parts.length > 1
                    ? Math.max(1, Math.min(255, Integer.parseInt(parts[1].trim())))
                    : VibrationEffect.DEFAULT_AMPLITUDE;
        } catch (Exception e) {
            return;
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        execute(v -> {
            int amp = (amplitude == VibrationEffect.DEFAULT_AMPLITUDE || hasAmplitudeControl(v))
                    ? amplitude : VibrationEffect.DEFAULT_AMPLITUDE;
            v.vibrate(VibrationEffect.createOneShot(duration, amp), hapticsAttrs());
        });
    }

    /** name: TICK | CLICK | HEAVY_CLICK | DOUBLE_CLICK */
    public static void vibratePredefined(String name) {
        final int effectId = readIntConstant(VibrationEffect.class, "EFFECT_" + name, -1);
        if (effectId < 0 || Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return;
        execute(v -> {
            VibrationEffect effect = invokeStatic(VibrationEffect.class, "createPredefined",
                    new Class[]{int.class}, new Object[]{effectId});
            if (effect == null) {
                effect = VibrationEffect.createOneShot(20, VibrationEffect.DEFAULT_AMPLITUDE);
            }
            v.vibrate(effect, hapticsAttrs());
        });
    }

    /** json: {"t":[50,50],"a":[33,51],"r":-1} */
    public static void vibrateWaveform(String json) {
        final JSONObject o;
        try {
            o = new JSONObject(json == null ? "{}" : json);
        } catch (Exception e) {
            return;
        }
        final JSONArray tArr = o.optJSONArray("t");
        if (tArr == null || tArr.length() == 0) return;
        final long[] timings = new long[tArr.length()];
        for (int i = 0; i < tArr.length(); i++) {
            timings[i] = Math.max(0L, tArr.optLong(i));
        }
        final int repeat = o.optInt("r", -1);
        final JSONArray aArr = o.optJSONArray("a");
        final int[] amps;
        if (aArr != null && aArr.length() == timings.length) {
            amps = new int[aArr.length()];
            for (int i = 0; i < aArr.length(); i++) {
                amps[i] = Math.max(0, Math.min(255, aArr.optInt(i)));
            }
        } else {
            amps = null;
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        execute(v -> {
            VibrationEffect effect;
            if (amps != null && hasAmplitudeControl(v)) {
                effect = VibrationEffect.createWaveform(timings, amps, repeat);
            } else {
                effect = VibrationEffect.createWaveform(timings, repeat);
            }
            v.vibrate(effect, hapticsAttrs());
        });
    }

    // ===== 反射 helpers =====

    private static int readIntConstant(Class<?> cls, String fieldName, int fallback) {
        try {
            Field f = cls.getField(fieldName);
            return f.getInt(null);
        } catch (Exception e) {
            return fallback;
        }
    }

    private static VibrationEffect invokeStatic(Class<?> cls, String methodName,
                                                 Class<?>[] params, Object[] args) {
        try {
            Method m = (params == null) ? cls.getMethod(methodName) : cls.getMethod(methodName, params);
            return (VibrationEffect) m.invoke(null, args);
        } catch (Exception e) {
            return null;
        }
    }
}
