package com.hhst.youtubelite.util;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.android.material.dialog.MaterialAlertDialogBuilder;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.hhst.youtubelite.R;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.IOException;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicBoolean;
import androidx.core.content.FileProvider;

import javax.inject.Inject;
import javax.inject.Singleton;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

/**
 * Handles automatic background update checking when the application starts.
 */
@Singleton
public class UpdateChecker {
	private static final String TAG = "UpdateChecker";
	private static final String RELEASES_URL = "https://api.github.com/repos/e-s-t-e-e/MeTube/releases";

	private final OkHttpClient client;
	private final Gson gson;
	private final AtomicBoolean checkPerformedInSession = new AtomicBoolean(false);

	@Inject
	public UpdateChecker(@NonNull OkHttpClient client, @NonNull Gson gson) {
		this.client = client;
		this.gson = gson;
	}

	/**
	 * Performs a background update check once per app launch session.
	 * If a newer release is found, prompts the user with an update dialog on the UI thread.
	 */
	public void checkForUpdatesOnAppStart(@NonNull Activity activity) {
		try {
			File oldUpdate = new File(activity.getCacheDir(), "metube_update.apk");
			if (oldUpdate.exists()) {
				oldUpdate.delete();
			}
		} catch (Exception e) {
			Log.e(TAG, "Failed to delete old update APK", e);
		}

		if (checkPerformedInSession.getAndSet(true)) {
			return;
		}

		Request request = new Request.Builder()
						.url(RELEASES_URL)
						.build();

		client.newCall(request).enqueue(new Callback() {
			@Override
			public void onFailure(@NonNull Call call, @NonNull IOException e) {
				Log.d(TAG, "Background update check failed: " + e.getMessage());
			}

			@Override
			public void onResponse(@NonNull Call call, @NonNull Response response) {
				try (response) {
					if (!response.isSuccessful()) return;

					String body = Objects.requireNonNull(response.body()).string();
					JsonArray releases = gson.fromJson(body, JsonArray.class);
					if (releases == null || releases.isEmpty()) return;

					JsonObject latestRelease = releases.get(0).getAsJsonObject();
					if (!latestRelease.has("tag_name")) return;

					String latestTag = latestRelease.get("tag_name").getAsString();
					String targetUrl = latestRelease.has("html_url")
									? latestRelease.get("html_url").getAsString()
									: "https://github.com/e-s-t-e-e/MeTube/releases";

					if (latestRelease.has("assets") && latestRelease.get("assets").isJsonArray()) {
						JsonArray assets = latestRelease.getAsJsonArray("assets");
						for (JsonElement assetEl : assets) {
							if (assetEl.isJsonObject()) {
								JsonObject assetObj = assetEl.getAsJsonObject();
								if (assetObj.has("name")
												&& assetObj.get("name").getAsString().endsWith(".apk")
												&& assetObj.has("browser_download_url")) {
									targetUrl = assetObj.get("browser_download_url").getAsString();
									break;
								}
							}
						}
					}

					String currentVersion = getAppVersionName(activity);
					if (isNewerVersion(currentVersion, latestTag)) {
						final String downloadUrl = targetUrl;
						activity.runOnUiThread(() -> showUpdateDialog(activity, latestTag, downloadUrl));
					}
				} catch (Exception e) {
					Log.e(TAG, "Error checking for updates", e);
				}
			}
		});
	}

	private void showUpdateDialog(@NonNull Activity activity, @NonNull String latestTag, @NonNull String downloadUrl) {
		if (activity.isFinishing() || activity.isDestroyed()) return;

		String message = activity.getString(R.string.update_dialog_message, latestTag);
		new MaterialAlertDialogBuilder(activity)
						.setTitle(R.string.update_dialog_title)
						.setMessage(message)
						.setCancelable(true)
						.setPositiveButton(R.string.update_now, (dialog, which) -> {
							downloadAndInstallApk(activity, downloadUrl);
						})
						.setNegativeButton(R.string.update_later, (dialog, which) -> dialog.dismiss())
						.show();
	}

	private void downloadAndInstallApk(@NonNull Activity activity, @NonNull String downloadUrl) {
		activity.runOnUiThread(() -> {
			final com.google.android.material.dialog.MaterialAlertDialogBuilder progressBuilder = new com.google.android.material.dialog.MaterialAlertDialogBuilder(activity);
			progressBuilder.setTitle("Downloading Update");
			progressBuilder.setMessage("Connecting...");
			progressBuilder.setCancelable(false);

			final android.widget.LinearLayout layout = new android.widget.LinearLayout(activity);
			layout.setOrientation(android.widget.LinearLayout.VERTICAL);
			int padding = (int) (16 * activity.getResources().getDisplayMetrics().density);
			layout.setPadding(padding, padding, padding, padding);

			final com.google.android.material.progressindicator.LinearProgressIndicator progressIndicator = new com.google.android.material.progressindicator.LinearProgressIndicator(activity);
			progressIndicator.setIndeterminate(true);
			layout.addView(progressIndicator);

			progressBuilder.setView(layout);
			final androidx.appcompat.app.AlertDialog progressDialog = progressBuilder.show();

			// Run download in background
			OkHttpClient client = this.client;
			Request request = new Request.Builder().url(downloadUrl).build();
			client.newCall(request).enqueue(new Callback() {
				@Override
				public void onFailure(@NonNull Call call, @NonNull IOException e) {
					activity.runOnUiThread(() -> {
						progressDialog.dismiss();
						new MaterialAlertDialogBuilder(activity)
								.setTitle("Update Failed")
								.setMessage("Could not download the update package: " + e.getMessage())
								.setPositiveButton(android.R.string.ok, null)
								.show();
					});
				}

				@Override
				public void onResponse(@NonNull Call call, @NonNull Response response) throws IOException {
					if (!response.isSuccessful()) {
						activity.runOnUiThread(() -> {
							progressDialog.dismiss();
							ToastUtils.show(activity, "Download failed: " + response.message());
						});
						return;
					}

					try (response) {
						InputStream is = response.body().byteStream();
						long contentLength = response.body().contentLength();
						File apkFile = new File(activity.getCacheDir(), "metube_update.apk");
						try (FileOutputStream fos = new FileOutputStream(apkFile)) {
							byte[] buffer = new byte[8192];
							long bytesReadTotal = 0;
							int len;
							while ((len = is.read(buffer)) != -1) {
								fos.write(buffer, 0, len);
								bytesReadTotal += len;
								final long currentProgress = bytesReadTotal;
								activity.runOnUiThread(() -> {
									if (progressIndicator.isIndeterminate()) {
										progressIndicator.setIndeterminate(false);
									}
									if (contentLength > 0) {
										int percent = (int) ((currentProgress * 100) / contentLength);
										progressIndicator.setProgress(percent);
										progressDialog.setMessage("Downloaded " + percent + "%");
									} else {
										progressDialog.setMessage("Downloaded " + (currentProgress / 1024) + " KB");
									}
								});
							}
							fos.flush();
						}

						activity.runOnUiThread(() -> {
							progressDialog.dismiss();
							installApk(activity, apkFile);
						});
					} catch (Exception e) {
						activity.runOnUiThread(() -> {
							progressDialog.dismiss();
							ToastUtils.show(activity, "Error saving update: " + e.getMessage());
						});
					}
				}
			});
		});
	}

	private void installApk(@NonNull Activity activity, @NonNull File file) {
		try {
			Uri apkUri = FileProvider.getUriForFile(activity, activity.getPackageName() + ".provider", file);
			Intent intent = new Intent(Intent.ACTION_VIEW);
			intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
			intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
			intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
			activity.startActivity(intent);
		} catch (Exception e) {
			Log.e(TAG, "Failed to start install intent", e);
			activity.runOnUiThread(() -> ToastUtils.show(activity, "Failed to launch package installer: " + e.getMessage()));
		}
	}

	@Nullable
	private String getAppVersionName(@NonNull Activity activity) {
		try {
			PackageInfo info = activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0);
			return info.versionName;
		} catch (Exception e) {
			return null;
		}
	}

	public static boolean isNewerVersion(@Nullable String currentVersion, @Nullable String latestVersion) {
		if (currentVersion == null || latestVersion == null) return false;

		String c = currentVersion.trim().replaceAll("^v", "");
		String l = latestVersion.trim().replaceAll("^v", "");

		if (c.equalsIgnoreCase(l)) return false;

		// Initial release 1.3 APKs reported versionName 1.0.0. Treat 1.0.0 and 1.3 as equal for update prompt.
		if (("1.0.0".equals(c) || "1.0".equals(c)) && ("1.3".equals(l) || "1.3.0".equals(l))) {
			return false;
		}

		String[] curParts = c.split("\\.");
		String[] latestParts = l.split("\\.");
		int length = Math.max(curParts.length, latestParts.length);

		for (int i = 0; i < length; i++) {
			String cStr = i < curParts.length ? curParts[i].replaceAll("\\D", "") : "";
			String lStr = i < latestParts.length ? latestParts[i].replaceAll("\\D", "") : "";

			int cPart = !cStr.isEmpty() ? Integer.parseInt(cStr) : 0;
			int lPart = !lStr.isEmpty() ? Integer.parseInt(lStr) : 0;

			if (lPart > cPart) return true;
			if (lPart < cPart) return false;
		}

		return false;
	}
}
