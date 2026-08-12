package com.hhst.youtubelite.player.controller;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.util.AttributeSet;
import android.view.View;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

/**
 * A pill-shaped vertical level bar with a rounded fill growing from the bottom,
 * used for the volume and brightness gesture indicators. Updates are applied
 * instantly so it tracks the finger without lag.
 */
public class LevelIndicatorView extends View {

	private final Paint trackPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
	private final Paint fillPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
	private final RectF trackRect = new RectF();
	private final RectF fillRect = new RectF();
	private float level = 0f;

	public LevelIndicatorView(@NonNull Context context) {
		this(context, null);
	}

	public LevelIndicatorView(@NonNull Context context, @Nullable AttributeSet attrs) {
		super(context, attrs);
		trackPaint.setColor(0x40FFFFFF);
		fillPaint.setColor(0xFFFFFFFF);
	}

	/**
	 * Sets the fill level immediately, clamped to [0, 1].
	 */
	public void setLevel(float newLevel) {
		level = Math.max(0f, Math.min(1f, newLevel));
		invalidate();
	}

	/**
	 * Sets the fill color (e.g. red when the volume boost is active).
	 */
	public void setFillColor(int color) {
		fillPaint.setColor(color);
		invalidate();
	}

	@Override
	protected void onDraw(@NonNull Canvas canvas) {
		super.onDraw(canvas);
		final float w = getWidth();
		final float h = getHeight();
		if (w <= 0f || h <= 0f) return;
		final float radius = Math.min(w, h) / 2f;
		trackRect.set(0f, 0f, w, h);
		canvas.drawRoundRect(trackRect, radius, radius, trackPaint);
		final float fillW = level * w;
		if (fillW > 0f) {
			fillRect.set(0f, 0f, fillW, h);
			canvas.drawRoundRect(fillRect, radius, radius, fillPaint);
		}
	}
}