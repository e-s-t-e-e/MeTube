package com.hhst.youtubelite.browser;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import android.text.TextUtils;
import android.webkit.CookieManager;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

/**
 * Temporary "incognito" session for the YouTube WebView.
 *
 * <p>Enabling snapshots the current YouTube/Google cookies and then fully clears the WebView cookie
 * jar, so both the web pages and the extracted-stream requests are unauthenticated (signed out, and
 * nothing is written to watch history). Disabling drops the guest session and restores the snapshot,
 * returning to the signed-in account.
 *
 * <p>Note on limitations: {@link CookieManager#getCookie} only exposes {@code name=value} pairs, not
 * the original {@code Domain}/{@code Secure}/{@code SameSite} attributes. Restore therefore re-applies
 * each cookie with the correct registrable-domain scope and the {@code Secure} flag for
 * {@code __Secure-}/{@code __Host-} cookies, which is what Google requires to accept them. This is a
 * best-effort reconstruction — reliable for the login session, but not byte-for-byte identical.
 *
 * <p>All cookie mutations are asynchronous; callers are notified via the supplied completion callback
 * once the jar has been updated and flushed.
 */
public final class IncognitoManager {

	private static final String PREFS = "incognito";
	private static final String KEY_ENABLED = "enabled";
	private static final String KEY_SNAPSHOT = "snapshot";

	// Base hosts whose cookies carry the YouTube/Google login session. Regional/consent hosts (e.g.
	// google.co.uk) are added dynamically from the page currently loaded when incognito is enabled.
	private static final String[] BASE_HOSTS = {
			"www.youtube.com",
			"m.youtube.com",
			"youtube.com",
			"accounts.google.com",
			"www.google.com",
			"google.com",
	};

	private final CookieManager cookieManager;
	private final SharedPreferences prefs;

	public IncognitoManager(@NonNull Context context) {
		this.cookieManager = CookieManager.getInstance();
		this.prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
	}

	public boolean isEnabled() {
		return prefs.getBoolean(KEY_ENABLED, false);
	}

	/**
	 * Toggles incognito.
	 *
	 * @param currentUrl the URL currently loaded (so regional/consent cookies are captured too); may be null
	 * @param onComplete run on the main thread after cookies are updated and flushed
	 */
	public void toggle(@Nullable String currentUrl, @NonNull Runnable onComplete) {
		if (isEnabled()) {
			disable(onComplete);
		} else {
			enable(currentUrl, onComplete);
		}
	}

	public void enable(@Nullable String currentUrl, @NonNull Runnable onComplete) {
		if (isEnabled()) {
			onComplete.run();
			return;
		}
		Map<String, String> snapshot = new LinkedHashMap<>();
		for (String host : hosts(currentUrl)) {
			String cookie = cookieManager.getCookie("https://" + host);
			if (!TextUtils.isEmpty(cookie)) {
				snapshot.put(host, cookie);
			}
		}
		persistSnapshot(snapshot);
		// Full clear guarantees a signed-out session for both the WebView and stream requests.
		cookieManager.removeAllCookies(ignored -> {
			cookieManager.flush();
			prefs.edit().putBoolean(KEY_ENABLED, true).apply();
			onComplete.run();
		});
	}

	public void disable(@NonNull Runnable onComplete) {
		if (!isEnabled()) {
			onComplete.run();
			return;
		}
		Map<String, String> snapshot = readSnapshot();
		// Drop whatever the guest session accrued, then restore the saved account cookies.
		cookieManager.removeAllCookies(ignored -> {
			for (Map.Entry<String, String> entry : snapshot.entrySet()) {
				restoreHostCookies(entry.getKey(), entry.getValue());
			}
			cookieManager.flush();
			prefs.edit().putBoolean(KEY_ENABLED, false).remove(KEY_SNAPSHOT).apply();
			onComplete.run();
		});
	}

	@NonNull
	private Set<String> hosts(@Nullable String currentUrl) {
		Set<String> hosts = new LinkedHashSet<>();
		for (String h : BASE_HOSTS) {
			hosts.add(h);
		}
		String host = hostOf(currentUrl);
		if (host != null) {
			hosts.add(host);
		}
		return hosts;
	}

	private void restoreHostCookies(@NonNull String host, @NonNull String cookieBlob) {
		String url = "https://" + host;
		String domain = cookieDomain(host);
		for (String pair : cookieBlob.split(";")) {
			String cookie = pair.trim();
			if (cookie.isEmpty()) {
				continue;
			}
			int eq = cookie.indexOf('=');
			String name = eq > 0 ? cookie.substring(0, eq) : cookie;
			StringBuilder sb = new StringBuilder(cookie);
			if (name.startsWith("__Host-")) {
				// Host cookies: no Domain, Path=/, Secure.
				sb.append("; Path=/; Secure");
			} else {
				sb.append("; Domain=").append(domain).append("; Path=/");
				if (name.startsWith("__Secure-")) {
					sb.append("; Secure");
				}
			}
			cookieManager.setCookie(url, sb.toString());
		}
	}

	@NonNull
	private static String cookieDomain(@NonNull String host) {
		if (host.equals("youtube.com") || host.endsWith(".youtube.com")) {
			return ".youtube.com";
		}
		if (host.equals("google.com") || host.endsWith(".google.com")) {
			return ".google.com";
		}
		String bare = host.startsWith("www.") ? host.substring(4) : host;
		return "." + bare;
	}

	@Nullable
	private static String hostOf(@Nullable String url) {
		if (TextUtils.isEmpty(url)) {
			return null;
		}
		try {
			String host = Uri.parse(url).getHost();
			return TextUtils.isEmpty(host) ? null : host;
		} catch (Exception e) {
			return null;
		}
	}

	// Persist as host\u0001cookie entries joined by \u0002 (neither char appears in cookie strings).
	private void persistSnapshot(@NonNull Map<String, String> snapshot) {
		StringBuilder sb = new StringBuilder();
		for (Map.Entry<String, String> entry : snapshot.entrySet()) {
			if (sb.length() > 0) {
				sb.append('\u0002');
			}
			sb.append(entry.getKey()).append('\u0001').append(entry.getValue());
		}
		prefs.edit().putString(KEY_SNAPSHOT, sb.toString()).apply();
	}

	@NonNull
	private Map<String, String> readSnapshot() {
		Map<String, String> map = new LinkedHashMap<>();
		String raw = prefs.getString(KEY_SNAPSHOT, "");
		if (TextUtils.isEmpty(raw)) {
			return map;
		}
		for (String entry : raw.split("\u0002")) {
			int sep = entry.indexOf('\u0001');
			if (sep > 0) {
				map.put(entry.substring(0, sep), entry.substring(sep + 1));
			}
		}
		return map;
	}
}
