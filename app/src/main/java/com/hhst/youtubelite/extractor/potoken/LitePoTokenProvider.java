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

	private void cacheVisitorData(@Nullable PoTokenResult result) {
		if (result != null && result.visitorData != null) {
			com.tencent.mmkv.MMKV.defaultMMKV().encode("potoken.last_visitor", result.visitorData);
		}
	}

	@Override
	@Nullable
	public PoTokenResult getWebClientPoToken(String videoId) {
		PoTokenResult result = coordinator.getWebClientPoToken(videoId);
		cacheVisitorData(result);
		return result;
	}

	@Override
	@Nullable
	public PoTokenResult getWebEmbedClientPoToken(String videoId) {
		PoTokenResult result = coordinator.getWebClientPoToken(videoId);
		cacheVisitorData(result);
		return result;
	}

	@Override
	@Nullable
	public PoTokenResult getAndroidClientPoToken(String videoId) {
		PoTokenResult result = coordinator.getAndroidClientPoToken(videoId);
		if (result == null) result = getWebClientPoToken(videoId);
		cacheVisitorData(result);
		return result;
	}

	@Override
	@Nullable
	public PoTokenResult getIosClientPoToken(String videoId) {
		PoTokenResult result = coordinator.getIosClientPoToken(videoId);
		if (result == null) result = getWebClientPoToken(videoId);
		cacheVisitorData(result);
		return result;
	}
}
