package com.hhst.youtubelite.extractor.potoken;

import androidx.annotation.Nullable;

import org.schabi.newpipe.extractor.services.youtube.PoTokenProvider;
import org.schabi.newpipe.extractor.services.youtube.PoTokenResult;

import javax.inject.Inject;
import javax.inject.Singleton;

/**
 * Provider that feeds PoToken data into extraction.
 */
@Singleton
public final class LitePoTokenProvider implements PoTokenProvider {
	private final PoTokenCoordinator coordinator;

	@Inject
	public LitePoTokenProvider(PoTokenCoordinator coordinator) {
		this.coordinator = coordinator;
	}

	@Override
	@Nullable
	public PoTokenResult getWebClientPoToken(String videoId) {
		return coordinator.getWebClientPoToken(videoId);
	}

	@Override
	@Nullable
	public PoTokenResult getWebEmbedClientPoToken(String videoId) {
		return coordinator.getWebClientPoToken(videoId);
	}

	@Override
	@Nullable
	public PoTokenResult getAndroidClientPoToken(String videoId) {
		PoTokenResult result = coordinator.getAndroidClientPoToken(videoId);
		return result != null ? result : getWebClientPoToken(videoId);
	}

	@Override
	@Nullable
	public PoTokenResult getIosClientPoToken(String videoId) {
		PoTokenResult result = coordinator.getIosClientPoToken(videoId);
		return result != null ? result : getWebClientPoToken(videoId);
	}
}
