package com.hhst.youtubelite.player.controller.gesture;

import android.app.Activity;
import android.content.Context;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.os.Build;
import android.os.Handler;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.GestureDetector;
import android.view.MotionEvent;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.media3.common.util.UnstableApi;

import com.google.android.material.dialog.MaterialAlertDialogBuilder;
import com.hhst.youtubelite.R;
import com.hhst.youtubelite.extension.Constant;
import com.hhst.youtubelite.player.LitePlayerView;
import com.hhst.youtubelite.player.controller.Controller;
import com.hhst.youtubelite.player.engine.Engine;
import com.hhst.youtubelite.util.DeviceUtils;

import java.util.Locale;

/**
 * Gesture listener that maps swipes and taps to playback controls.
 */
@UnstableApi
public class PlayerGestureListener extends GestureDetector.SimpleOnGestureListener {
	/** Reset each time a new video starts, or when volume drops back to ≤50%. */
	private boolean btVolumeAboveThreshold = false;
	private boolean btVolumeWarningConfirmed = false;
	/** Reset each time a new video starts, or when volume drops back to ≤100%. */
	private boolean boostAboveThreshold = false;
	private boolean boostWarningConfirmed = false;
	private static final int AUTO_HIDE_DELAY_MS = 200;
	private static final int SEEK_WINDOW_MS = 600;

	private final Activity activity;
	private final LitePlayerView playerView;
	private final Engine engine;
	private final Controller controller;
	private final Handler handler;
	private final Runnable hideHint;

	private GestureMode gestureMode = GestureMode.NONE;
	private float brightness = -1, longPressSpeed = 1.0f;
	private boolean longPressing, gesturing, swipeTriggered;
	private long seekStartPos;

	private int seekAccum;
	private final Runnable resetSeek = () -> seekAccum = 0;
	private long lastTapTime;
	private float customVolume = -1;

	public PlayerGestureListener(Activity activity, LitePlayerView playerView, Engine engine, Controller controller) {
		this.activity = activity;
		this.playerView = playerView;
		this.engine = engine;
		this.controller = controller;
		this.handler = new Handler(activity.getMainLooper());
		this.hideHint = controller::hideHint;
	}

	private static DoubleTapAction getDoubleTapAction(float x, float width) {
		if (width <= 0f) return DoubleTapAction.TOGGLE_PLAYBACK;
		if (x < width / 3f) return DoubleTapAction.SEEK_BACKWARD;
		if (x > width * 2f / 3f) return DoubleTapAction.SEEK_FORWARD;
		return DoubleTapAction.TOGGLE_PLAYBACK;
	}

	private boolean enabled(@NonNull Gesture gesture) {
		boolean fullscreen = controller.isFullscreen();
		String key = switch (gesture) {
			case TAP -> fullscreen ? Constant.GESTURE_TAP_FULLSCREEN : Constant.GESTURE_TAP_WINDOWED;
			case DOUBLE_TAP -> fullscreen ? Constant.GESTURE_DOUBLE_TAP_FULLSCREEN : Constant.GESTURE_DOUBLE_TAP_WINDOWED;
			case LONG_PRESS -> fullscreen ? Constant.GESTURE_LONG_PRESS_FULLSCREEN : Constant.GESTURE_LONG_PRESS_WINDOWED;
			case BRIGHTNESS -> fullscreen ? Constant.GESTURE_BRIGHTNESS_FULLSCREEN : Constant.GESTURE_BRIGHTNESS_WINDOWED;
			case VOLUME -> fullscreen ? Constant.GESTURE_VOLUME_FULLSCREEN : Constant.GESTURE_VOLUME_WINDOWED;
			case SEEK -> fullscreen ? Constant.GESTURE_SEEK_FULLSCREEN : Constant.GESTURE_SEEK_WINDOWED;
			case FULLSCREEN -> fullscreen ? Constant.GESTURE_FULLSCREEN_FULLSCREEN : Constant.GESTURE_FULLSCREEN_WINDOWED;
		};
		return controller.getExtensionManager().isEnabled(key);
	}

	private boolean hasAnyEnabled() {
		for (Gesture gesture : Gesture.values()) {
			if (enabled(gesture)) return true;
		}
		return false;
	}

	@NonNull
	private GestureMode verticalMode(float x, float width) {
		if (width <= 0f) return GestureMode.NONE;
		if (x < width * 0.35f) {
			return enabled(Gesture.BRIGHTNESS) ? GestureMode.BRIGHTNESS : GestureMode.NONE;
		}
		if (x > width * 0.65f) {
			return enabled(Gesture.VOLUME) ? GestureMode.VOLUME : GestureMode.NONE;
		}
		return enabled(Gesture.FULLSCREEN) ? GestureMode.FULLSCREEN : GestureMode.NONE;
	}

	public void onTouchRelease() {
		if (longPressing) {
			engine.setPlaybackRate(longPressSpeed);
			updateSpeedButtonUI(longPressSpeed);
			controller.hideHint();
			longPressing = false;
		}
		if (gesturing) {
			handler.postDelayed(hideHint, AUTO_HIDE_DELAY_MS);
			gesturing = false;
		}
	}

	@Override
	public boolean onDown(@NonNull MotionEvent e) {
		if (!hasAnyEnabled()) return false;
		handler.removeCallbacks(hideHint);
		gestureMode = GestureMode.NONE;
		brightness = -1;
		customVolume = -1;
		gesturing = false;
		swipeTriggered = false;
		seekStartPos = engine.position();
		return true;
	}

	@Override
	public boolean onSingleTapUp(@NonNull MotionEvent e) {
		if (controller.isLocked()) return super.onSingleTapUp(e);
		if (!enabled(Gesture.DOUBLE_TAP)) return super.onSingleTapUp(e);
		long now = System.currentTimeMillis();
		float x = e.getX();
		float width = playerView.getWidth();
		DoubleTapAction action = getDoubleTapAction(x, width);

		if (seekAccum != 0 && (now - lastTapTime < SEEK_WINDOW_MS)) {
			if ((seekAccum < 0 && action == DoubleTapAction.SEEK_BACKWARD)
							|| (seekAccum > 0 && action == DoubleTapAction.SEEK_FORWARD)) {
				processSeek(action == DoubleTapAction.SEEK_BACKWARD);
				lastTapTime = now;
				return true;
			}
		}
		return super.onSingleTapUp(e);
	}

	@Override
	public boolean onSingleTapConfirmed(@NonNull MotionEvent e) {
		if (controller.isLocked()) {
			// When locked, a tap only reveals/hides the unlock button; nothing else responds.
			controller.setControlsVisible(!controller.isControlsVisible());
			return true;
		}
		if (!enabled(Gesture.TAP)) return false;
		controller.setControlsVisible(!controller.isControlsVisible());
		return true;
	}

	@Override
	public boolean onDoubleTap(@NonNull MotionEvent e) {
		if (controller.isLocked()) return false;
		if (!enabled(Gesture.DOUBLE_TAP)) return false;
		switch (getDoubleTapAction(e.getX(), playerView.getWidth())) {
			case SEEK_BACKWARD:
				processSeek(true);
				lastTapTime = System.currentTimeMillis();
				return true;
			case SEEK_FORWARD:
				processSeek(false);
				lastTapTime = System.currentTimeMillis();
				return true;
			case TOGGLE_PLAYBACK:
				if (engine.isPlaying()) {
					engine.pause();
				} else {
					engine.play();
				}
				controller.setControlsVisible(true);
				return true;
			default:
				return false;
		}
	}

	private void processSeek(boolean isLeft) {
		handler.removeCallbacks(resetSeek);
		if (isLeft) {
			seekAccum -= 10;
			engine.seekBy(-10000);
			controller.showHint(seekAccum + "s", 500);
		} else {
			seekAccum += 10;
			engine.seekBy(10000);
			controller.showHint("+" + seekAccum + "s", 500);
		}
		handler.postDelayed(resetSeek, SEEK_WINDOW_MS);
	}

	@Override
	public boolean onScroll(MotionEvent e1, @NonNull MotionEvent e2, float dx, float dy) {
		if (controller.isLocked()) return false;
		if (e1 == null || e2.getPointerCount() > 1 || longPressing) return false;
		if (gestureMode == GestureMode.NONE) {
			if (Math.abs(dy) > Math.abs(dx)) {
				gestureMode = verticalMode(e1.getX(), playerView.getWidth());
			} else if (Math.abs(dx) > Math.abs(dy) && enabled(Gesture.SEEK)) {
				gestureMode = GestureMode.SEEK;
			}
			if (gestureMode == GestureMode.NONE) return false;
		}
		gesturing = true;
		handler.removeCallbacks(hideHint);
		switch (gestureMode) {
			case BRIGHTNESS:
				adjustBrightness(dy);
				break;
			case VOLUME:
				adjustVolume(dy);
				break;
			case FULLSCREEN:
				handleCenterVerticalGesture(e1, e2);
				break;
			case SEEK:
				adjustSeek(e1, e2);
				break;
			case NONE:
				return false;
		}
		handler.postDelayed(hideHint, AUTO_HIDE_DELAY_MS);
		return true;
	}

	private void adjustSeek(MotionEvent e1, MotionEvent e2) {
		float width = playerView.getWidth();
		long offset = (long) (((e2.getX() - e1.getX()) / width) * 120000);
		long pos = seekStartPos + offset;
		engine.seekTo(pos);
		controller.showHint(formatTime(pos), -1);
	}

	private String formatTime(long ms) {
		if (ms < 0) ms = 0;
		int seconds = (int) (ms / 1000) % 60;
		int minutes = (int) ((ms / (1000 * 60)) % 60);
		int hours = (int) ((ms / (1000 * 60 * 60)) % 24);
		if (hours > 0)
			return String.format(Locale.getDefault(), "%d:%02d:%02d", hours, minutes, seconds);
		return String.format(Locale.getDefault(), "%02d:%02d", minutes, seconds);
	}

	private void adjustBrightness(float dy) {
		if (brightness == -1) {
			brightness = playerView.getPlayerBrightness();
		}
		float delta = (dy / playerView.getHeight()) * 0.5f * 1.5f;
		brightness = Math.max(0.01f, Math.min(1.0f, brightness + delta));
		playerView.setPlayerBrightness(brightness);
		controller.showHint(Math.round(brightness * 100) + "%", -1);
	}

	private void adjustVolume(float dy) {
		AudioManager am = (AudioManager) activity.getSystemService(Context.AUDIO_SERVICE);
		if (am == null) return;
		int maxVolume = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
		if (customVolume == -1) {
			int sysVol = am.getStreamVolume(AudioManager.STREAM_MUSIC);
			float boost = engine.getVolumeBoostProgress();
			if (sysVol < maxVolume) {
				boost = 0f;
				engine.setVolumeBoostProgress(0f);
			}
			if (boost > 0) {
				customVolume = 100f + boost * 100f;
			} else {
				customVolume = (sysVol / (float) maxVolume) * 100f;
			}
		}

		float delta = (dy / playerView.getHeight()) * 200f * 0.4f * 1.5f;
		float targetVolume = Math.max(0f, Math.min(200f, customVolume + delta));
		int pct = Math.round(targetVolume);

		if (isBluetoothHeadphoneConnected(am) && !btVolumeWarningConfirmed && pct > 50) {
			int halfVolume = Math.round(maxVolume * 0.5f);
			am.setStreamVolume(AudioManager.STREAM_MUSIC, halfVolume, 0);
			engine.setVolumeBoostProgress(0f);
			customVolume = 50f;
			controller.showHint("50%", -1);
			if (!btVolumeAboveThreshold) {
				btVolumeAboveThreshold = true;
				showBluetoothVolumeWarning(am, maxVolume);
			}
			return;
		}

		float prevVolume = customVolume;
		customVolume = targetVolume;

		if (customVolume <= 100f) {
			int sysVol = Math.round((customVolume / 100f) * maxVolume);
			am.setStreamVolume(AudioManager.STREAM_MUSIC, sysVol, 0);
			engine.setVolumeBoostProgress(0f);
			controller.showHint(pct + "%", -1);
		} else if (!boostWarningConfirmed) {
			// Clamp at 100% until the boost warning is accepted.
			customVolume = 100f;
			am.setStreamVolume(AudioManager.STREAM_MUSIC, maxVolume, 0);
			engine.setVolumeBoostProgress(0f);
			controller.showHint("100%", -1);
			if (!boostAboveThreshold) {
				boostAboveThreshold = true;
				showBoostVolumeWarning(am, maxVolume);
			}
			return;
		} else {
			am.setStreamVolume(AudioManager.STREAM_MUSIC, maxVolume, 0);
			float boost = (customVolume - 100f) / 100f;
			engine.setVolumeBoostProgress(boost);
			controller.showHint("Boost: " + pct + "%", -1);
		}

		// Auto-reset threshold flag when volume comes back down to ≤50%.
		if (pct <= 50) {
			btVolumeAboveThreshold = false;
			btVolumeWarningConfirmed = false;
			return;
		}

		// Auto-reset boost flag when volume comes back down to ≤100%.
		if (pct <= 100) {
			boostAboveThreshold = false;
			boostWarningConfirmed = false;
		}

		// Warn every time volume crosses upward past 50% while BT headphones are connected.
		int prevPct = Math.round(prevVolume);
		if (prevPct <= 50 && !btVolumeAboveThreshold && isBluetoothHeadphoneConnected(am)) {
			btVolumeAboveThreshold = true;
			showBluetoothVolumeWarning(am, maxVolume);
		}
	}

	/**
	 * Call this when a new video starts so the 50% warning fires again if volume is high.
	 */
	public void resetBtVolumeWarning() {
		btVolumeAboveThreshold = false;
		btVolumeWarningConfirmed = false;
		boostAboveThreshold = false;
		boostWarningConfirmed = false;
		// Check immediately if current volume already exceeds 50%; warn if so.
		AudioManager am = (AudioManager) activity.getSystemService(Context.AUDIO_SERVICE);
		if (am == null) return;
		if (!isBluetoothHeadphoneConnected(am)) return;
		int maxVolume = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
		int currentPct = Math.round(((float) am.getStreamVolume(AudioManager.STREAM_MUSIC) / maxVolume) * 100);
		if (currentPct > 50) {
			btVolumeAboveThreshold = true;
			showBluetoothVolumeWarning(am, maxVolume);
		}
	}

	/**
	 * Returns true if any connected audio output device is a Bluetooth type
	 * (A2DP sink, BLE headset, or SCO headset).
	 */
	private boolean isBluetoothHeadphoneConnected(@NonNull AudioManager am) {
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
			AudioDeviceInfo[] devices = am.getDevices(AudioManager.GET_DEVICES_OUTPUTS);
			for (AudioDeviceInfo device : devices) {
				int type = device.getType();
				if (type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP
						|| type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO
						|| (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
								&& type == AudioDeviceInfo.TYPE_BLE_HEADSET)
						|| (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
								&& type == AudioDeviceInfo.TYPE_BLE_SPEAKER)) {
					return true;
				}
			}
			return false;
		}
		// Fallback for older APIs
		return am.isBluetoothA2dpOn() || am.isBluetoothScoOn();
	}

	/**
	 * Shows a warning dialog; does NOT set btVolumeAboveThreshold — caller must do that.
	 */
	private void showBluetoothVolumeWarning(@NonNull AudioManager am, int maxVolume) {
		activity.runOnUiThread(() -> {
			if (activity.isFinishing() || activity.isDestroyed()) return;
			new MaterialAlertDialogBuilder(activity)
					.setTitle(R.string.bt_volume_warning_title)
					.setMessage(R.string.bt_volume_warning_message)
					.setPositiveButton(R.string.bt_volume_continue, (d, w) -> {
						btVolumeWarningConfirmed = true;
					})
					.setNegativeButton(R.string.bt_volume_lower, (d, w) -> {
						// Set volume to exactly 50%
						int halfVolume = Math.round(maxVolume * 0.5f);
						am.setStreamVolume(AudioManager.STREAM_MUSIC, halfVolume, 0);
						customVolume = 50f;
						int halfPct = Math.round((halfVolume / (float) maxVolume) * 100);
						controller.showHint(halfPct + "%", 1500);
						btVolumeWarningConfirmed = false;
					})
					.setCancelable(false)
					.show();
		});
	}

	/**
	 * Shows a warning dialog before allowing volume above 100%;
	 * does NOT set boostAboveThreshold — caller must do that.
	 */
	private void showBoostVolumeWarning(@NonNull AudioManager am, int maxVolume) {
		activity.runOnUiThread(() -> {
			if (activity.isFinishing() || activity.isDestroyed()) return;
			new MaterialAlertDialogBuilder(activity)
					.setTitle(R.string.boost_volume_warning_title)
					.setMessage(R.string.boost_volume_warning_message)
					.setPositiveButton(R.string.boost_volume_continue, (d, w) -> {
						boostWarningConfirmed = true;
					})
					.setNegativeButton(R.string.boost_volume_limit, (d, w) -> {
						// Keep volume at exactly 100%.
						am.setStreamVolume(AudioManager.STREAM_MUSIC, maxVolume, 0);
						engine.setVolumeBoostProgress(0f);
						customVolume = 100f;
						controller.showHint("100%", 1500);
						boostWarningConfirmed = false;
					})
					.setCancelable(false)
					.show();
		});
	}

	private void handleCenterVerticalGesture(@NonNull MotionEvent e1, @NonNull MotionEvent e2) {
		if (swipeTriggered) return;
		float dy = e2.getY() - e1.getY();
		float threshold = playerView.getHeight() * 0.08f;
		if (Math.abs(dy) < threshold) return;

		if (dy < 0 && !controller.isFullscreen()) {
			swipeTriggered = true;
			controller.enterFullscreen();
		} else if (dy > 0 && controller.isFullscreen()) {
			swipeTriggered = true;
			controller.exitFullscreen();
		} else if (dy > 0 && !controller.isFullscreen()) {
			// Swipe down on a windowed video -> minimize into the in-app mini-player.
			swipeTriggered = true;
			controller.requestMinimize();
		}
	}

	@Override
	public void onLongPress(@NonNull MotionEvent e) {
		if (controller.isLocked()) return;
		if (!enabled(Gesture.LONG_PRESS) || !engine.isPlaying()) return;
		vibrate();
		longPressSpeed = engine.getPlaybackRate();
		longPressing = true;
		engine.setPlaybackRate(2.0f);
		updateSpeedButtonUI(2.0f);
		controller.showHint("2x", -1);
	}

	private void updateSpeedButtonUI(float speed) {
		TextView v = playerView.findViewById(R.id.btn_speed);
		if (v != null) v.setText(String.format(Locale.getDefault(), "%.2fx", speed));
	}

	private void vibrate() {
		Vibrator vib = (Vibrator) activity.getSystemService(Context.VIBRATOR_SERVICE);
		if (vib != null && vib.hasVibrator())
			vib.vibrate(VibrationEffect.createOneShot(15, VibrationEffect.DEFAULT_AMPLITUDE));
	}

	private enum Gesture {
		TAP,
		DOUBLE_TAP,
		LONG_PRESS,
		BRIGHTNESS,
		VOLUME,
		SEEK,
		FULLSCREEN
	}

	private enum GestureMode {
		NONE,
		BRIGHTNESS,
		VOLUME,
		FULLSCREEN,
		SEEK
	}

	private enum DoubleTapAction {
		SEEK_BACKWARD,
		TOGGLE_PLAYBACK,
		SEEK_FORWARD
	}
}




