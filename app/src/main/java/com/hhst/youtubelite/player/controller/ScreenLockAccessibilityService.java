package com.hhst.youtubelite.player.controller;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;

import androidx.annotation.NonNull;

/**
 * Minimal accessibility service used by the sleep timer to turn the screen off
 * when the timer ends. Turning the screen off directly requires the privileged
 * DEVICE_POWER permission, so instead we perform the global lock-screen action.
 * The user must enable this service once in Settings > Accessibility.
 */
public class ScreenLockAccessibilityService extends AccessibilityService {

	@NonNull
	private static volatile ScreenLockAccessibilityService instance = new Unbound();

	/** Sentinel that reports the service is not (yet) connected. */
	private static final class Unbound extends ScreenLockAccessibilityService {
	}

	public static boolean isAvailable() {
		final ScreenLockAccessibilityService service = instance;
		return service != null && !(service instanceof Unbound);
	}

	public static boolean lockScreenIfAvailable() {
		final ScreenLockAccessibilityService service = instance;
		return service != null && !(service instanceof Unbound)
						&& service.performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN);
	}

	@Override
	protected void onServiceConnected() {
		instance = this;
	}

	@Override
	public void onAccessibilityEvent(@NonNull AccessibilityEvent event) {
	}

	@Override
	public void onInterrupt() {
	}

	@Override
	public void onDestroy() {
		instance = new Unbound();
		super.onDestroy();
	}
}