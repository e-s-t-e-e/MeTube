package com.hhst.youtubelite.ui;

import android.app.Activity;
import android.content.Context;
import android.content.DialogInterface;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.TextView;

import com.google.android.material.dialog.MaterialAlertDialogBuilder;
import com.hhst.youtubelite.R;
import com.hhst.youtubelite.util.DeviceUtils;
import com.hhst.youtubelite.util.ToastUtils;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.IdentityHashMap;
import java.util.Locale;
import java.util.Set;

import androidx.appcompat.app.AlertDialog;

/**
 * Dialog that shows structured error details.
 */
public final class ErrorDialog {

	private static final String TAG = "ErrorDialog";
	private static final String DEBUG_INFO_LABEL = "Debug Info";

	private ErrorDialog() {
	}

	public static boolean isNetworkError(Throwable throwable) {
		if (throwable == null) return false;
		Throwable current = throwable;
		while (current != null) {
			if (current instanceof java.net.SocketTimeoutException
							|| current instanceof java.net.ConnectException
							|| current instanceof java.net.UnknownHostException
							|| current instanceof java.net.NoRouteToHostException) {
				return true;
			}
			String msg = current.getMessage();
			if (msg != null && (msg.contains("Source error") || msg.contains("network") || msg.contains("Network") || msg.contains("Unable to resolve host"))) {
				return true;
			}
			current = current.getCause();
		}
		return false;
	}

	public static void show(Context context, String title, String stack) {
		showInternal(context, title, context.getString(R.string.network_error_message), stack, null, null);
	}

	public static void show(Context context, String title, Throwable throwable) {
		show(context, title, throwable, null, null);
	}

	public static void show(Context context, String title, Throwable throwable, Runnable onRetry) {
		show(context, title, throwable, onRetry, null);
	}

	public static void show(Context context, String title, Throwable throwable, DialogInterface.OnDismissListener onDismissListener) {
		show(context, title, throwable, null, onDismissListener);
	}

	public static AlertDialog show(Context context, String title, Throwable throwable, Runnable onRetry, DialogInterface.OnDismissListener onDismissListener) {
		boolean network = isNetworkError(throwable);
		String displayTitle = (network || title == null || title.contains("PlaybackException") || title.contains("Source error"))
						? context.getString(R.string.network_error_title)
						: title;
		String userMessage = network
						? context.getString(R.string.network_error_message)
						: (throwable != null && throwable.getMessage() != null && !throwable.getMessage().isBlank()
										? throwable.getMessage()
										: context.getString(R.string.network_error_message));
		String stack = buildExpandedStackTrace(throwable);
		return showInternal(context, displayTitle, userMessage, stack, onRetry, onDismissListener);
	}

	public static void show(Context context, String title, String stack, DialogInterface.OnDismissListener onDismissListener) {
		showInternal(context, title, context.getString(R.string.network_error_message), stack, null, onDismissListener);
	}

	public static void show(Context context, String title, String stack, Runnable onRetry, DialogInterface.OnDismissListener onDismissListener) {
		showInternal(context, title, context.getString(R.string.network_error_message), stack, onRetry, onDismissListener);
	}

	private static AlertDialog showInternal(Context context, String title, String userMessage, String stack, Runnable onRetry, DialogInterface.OnDismissListener onDismissListener) {
		if (context instanceof Activity && DeviceUtils.isInPictureInPictureMode((Activity) context))
			return null;

		View view = LayoutInflater.from(context).inflate(R.layout.dialog_error, null);
		TextView titleView = view.findViewById(R.id.error_title);
		TextView messageView = view.findViewById(R.id.error_message);
		TextView stackView = view.findViewById(R.id.error_stack);
		TextView btnDetails = view.findViewById(R.id.btn_details);
		View stackScroll = view.findViewById(R.id.stack_scroll);

		titleView.setText(title != null ? title : context.getString(R.string.error_title));
		messageView.setText(userMessage != null ? userMessage : context.getString(R.string.network_error_message));

		if (stackView != null) {
			stackView.setText(stack);
		}

		if (btnDetails != null && stackScroll != null) {
			btnDetails.setOnClickListener(v -> {
				if (stackScroll.getVisibility() == View.GONE) {
					stackScroll.setVisibility(View.VISIBLE);
					btnDetails.setText(R.string.hide_details);
				} else {
					stackScroll.setVisibility(View.GONE);
					btnDetails.setText(R.string.show_details);
				}
			});
		}

		boolean[] hasRetried = new boolean[]{false};
		Runnable safeRetry = onRetry == null ? null : () -> {
			if (!hasRetried[0]) {
				hasRetried[0] = true;
				onRetry.run();
			}
		};

		MaterialAlertDialogBuilder builder = new MaterialAlertDialogBuilder(context)
						.setView(view)
						.setCancelable(true)
						.setOnDismissListener(dialog -> {
							if (onDismissListener != null) {
								onDismissListener.onDismiss(dialog);
							}
						});

		if (safeRetry != null) {
			builder.setPositiveButton(R.string.retry, (dialog, which) -> {
				dialog.dismiss();
				safeRetry.run();
			});
			builder.setNegativeButton(R.string.close, (dialog, which) -> dialog.dismiss());
			builder.setNeutralButton(R.string.copy, (dialog, which) -> copyDebugInfo(context, title, stack));
		} else {
			builder.setPositiveButton(R.string.copy, (dialog, which) -> copyDebugInfo(context, title, stack));
			builder.setNegativeButton(R.string.close, (dialog, which) -> dialog.dismiss());
		}

		return builder.show();
	}

	private static String buildExpandedStackTrace(Throwable throwable) {
		if (throwable == null) {
			return "";
		}

		StringBuilder sb = new StringBuilder();
		Set<Throwable> seen = java.util.Collections.newSetFromMap(new IdentityHashMap<>());
		appendThrowable(sb, throwable, null, "", seen);
		return sb.toString();
	}

	private static void appendThrowable(StringBuilder sb, Throwable throwable, String label, String indent, Set<Throwable> seen) {
		if (!seen.add(throwable)) {
			if (label != null) {
				sb.append(indent).append(label);
			}
			sb.append(indent).append("[CIRCULAR REFERENCE: ").append(throwable.getClass().getName()).append("]\n");
			return;
		}

		if (label != null) {
			sb.append(indent).append(label);
		}
		sb.append(throwable.getClass().getName());
		if (throwable.getMessage() != null && !throwable.getMessage().isBlank()) {
			sb.append(": ").append(throwable.getMessage());
		}
		sb.append('\n');

		for (StackTraceElement element : throwable.getStackTrace()) {
			sb.append(indent).append("    at ").append(element).append('\n');
		}

		for (Throwable suppressed : throwable.getSuppressed()) {
			appendThrowable(sb, suppressed, "Suppressed: ", indent + "    ", seen);
		}

		Throwable cause = throwable.getCause();
		if (cause != null) {
			appendThrowable(sb, cause, "Caused by: ", indent, seen);
		}
	}

	private static void copyDebugInfo(Context context, String title, String stack) {
		try {
			PackageManager pm = context.getPackageManager();
			PackageInfo pi = pm.getPackageInfo(context.getPackageName(), 0);
			String version = pi.versionName;
			String date = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(new Date());

			String sb = "App Version: " + version + "\n" + "Date: " + date + "\n" + "Error Message: " + title + "\n" + "Stack Trace:\n" + stack;

			DeviceUtils.copyToClipboard(context, DEBUG_INFO_LABEL, sb);
			ToastUtils.show(context, R.string.debug_info_copied);
		} catch (Exception e) {
			Log.e(TAG, "Failed to copy debug info", e);
		}
	}
}
