package com.hhst.youtubelite.browser;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.hhst.youtubelite.util.PermissionUtils;

import java.util.ArrayList;

/**
 * Native speech recognition bridge for the WebView voice-search polyfill.
 */
public final class VoiceRecognition {

	private static final String TAG = "VoiceRecognition";

	public interface PermissionHost {
		void request(@NonNull Runnable onGranted);
	}

	public interface Dispatch {
		void dispatch(@NonNull String type, @Nullable String text, @Nullable String error);
	}

	@NonNull
	private final Context context;
	@NonNull
	private final PermissionHost permissionHost;
	@NonNull
	private final Dispatch dispatch;
	@NonNull
	private final Handler handler = new Handler(Looper.getMainLooper());
	@Nullable
	private SpeechRecognizer recognizer;

	public VoiceRecognition(@NonNull Context context, @NonNull PermissionHost permissionHost, @NonNull Dispatch dispatch) {
		this.context = context;
		this.permissionHost = permissionHost;
		this.dispatch = dispatch;
	}

	public void start(@Nullable String language) {
		Log.i(TAG, "start requested, lang=" + (language == null ? "null" : language)
						+ ", available=" + SpeechRecognizer.isRecognitionAvailable(context)
						+ ", granted=" + PermissionUtils.hasRecordAudioPermission(context));
		stopWatchdog();
		if (recognizer != null) {
			destroyRecognizer();
		}
		if (!SpeechRecognizer.isRecognitionAvailable(context)) {
			dispatch.dispatch("error", null, "service-not-allowed");
			dispatch.dispatch("end", null, null);
			return;
		}
		if (!PermissionUtils.hasRecordAudioPermission(context)) {
			permissionHost.request(() -> {
				if (!PermissionUtils.hasRecordAudioPermission(context)) {
					dispatch.dispatch("error", null, "not-allowed");
					dispatch.dispatch("end", null, null);
					return;
				}
				startRecognizer(language);
			});
			return;
		}
		startRecognizer(language);
	}

	public void stop() {
		SpeechRecognizer current = recognizer;
		if (current == null) {
			dispatch.dispatch("end", null, null);
			return;
		}
		try {
			current.stopListening();
		} catch (Exception e) {
			Log.e(TAG, "stopListening failed", e);
		}
		handler.removeCallbacksAndMessages(null);
		handler.postDelayed(() -> {
			if (recognizer == null) return;
			dispatch.dispatch("end", null, null);
			destroyRecognizer();
		}, 2500L);
	}

	public void cancel() {
		stopWatchdog();
		destroyRecognizer();
	}

	private void startRecognizer(@Nullable String language) {
		if (recognizer != null) return;
		final SpeechRecognizer created;
		try {
			created = SpeechRecognizer.createSpeechRecognizer(context);
		} catch (Exception e) {
			Log.e(TAG, "createSpeechRecognizer failed", e);
			dispatch.dispatch("error", null, "service-not-allowed");
			dispatch.dispatch("end", null, null);
			return;
		}
		if (created == null) {
			dispatch.dispatch("error", null, "service-not-allowed");
			dispatch.dispatch("end", null, null);
			return;
		}
		recognizer = created;
		created.setRecognitionListener(listener);
		Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
		intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
		intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
		if (language != null && !language.isBlank()) {
			intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
		}
		try {
			created.startListening(intent);
		} catch (Exception e) {
			Log.e(TAG, "startListening failed", e);
			destroyRecognizer();
			dispatch.dispatch("error", null, "audio-capture");
			dispatch.dispatch("end", null, null);
		}
	}

	private void stopWatchdog() {
		handler.removeCallbacksAndMessages(null);
	}

	private void destroyRecognizer() {
		stopWatchdog();
		SpeechRecognizer current = recognizer;
		recognizer = null;
		if (current != null) {
			try {
				current.cancel();
			} catch (Exception ignored) {
			}
			try {
				current.destroy();
			} catch (Exception ignored) {
			}
		}
	}

	private final RecognitionListener listener = new RecognitionListener() {
		@Override
		public void onReadyForSpeech(Bundle params) {
			dispatch.dispatch("start", null, null);
		}

		@Override
		public void onBeginningOfSpeech() {
			dispatch.dispatch("speechstart", null, null);
		}

		@Override
		public void onRmsChanged(float rmsdB) {
		}

		@Override
		public void onBufferReceived(byte[] buffer) {
		}

		@Override
		public void onEndOfSpeech() {
			dispatch.dispatch("speechend", null, null);
		}

		@Override
		public void onError(int error) {
			Log.w(TAG, "recognition error: " + error + " -> " + mapError(error));
			dispatch.dispatch("error", mapError(error), null);
			dispatch.dispatch("end", null, null);
			destroyRecognizer();
		}

		@Override
		public void onResults(Bundle results) {
			String text = bestResult(results);
			Log.i(TAG, "recognition result: " + (text == null ? "null" : text));
			dispatch.dispatch("result", text, null);
			dispatch.dispatch("end", null, null);
			destroyRecognizer();
		}

		@Override
		public void onPartialResults(Bundle partialResults) {
			String text = bestResult(partialResults);
			if (text != null) {
				dispatch.dispatch("interim", text, null);
			}
		}

		@Override
		public void onEvent(int eventType, Bundle params) {
		}
	};

	@Nullable
	private static String bestResult(@Nullable Bundle results) {
		if (results == null) return null;
		ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
		if (matches == null) return null;
		for (String match : matches) {
			if (match != null && !match.isBlank()) return match.trim();
		}
		return null;
	}

	@NonNull
	private static String mapError(int error) {
		return switch (error) {
			case SpeechRecognizer.ERROR_AUDIO -> "audio-capture";
			case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "not-allowed";
			case SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "network";
			case SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "no-speech";
			case SpeechRecognizer.ERROR_RECOGNIZER_BUSY, SpeechRecognizer.ERROR_TOO_MANY_REQUESTS -> "busy";
			case SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED -> "language-not-supported";
			default -> "service-not-allowed";
		};
	}

}
