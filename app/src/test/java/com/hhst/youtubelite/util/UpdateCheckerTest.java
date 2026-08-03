package com.hhst.youtubelite.util;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class UpdateCheckerTest {

	@Test
	public void isNewerVersionDetectsHigherReleaseTags() {
		assertTrue(UpdateChecker.isNewerVersion("1.0.0", "1.0.1"));
		assertTrue(UpdateChecker.isNewerVersion("v1.0.0", "v1.1.0"));
		assertTrue(UpdateChecker.isNewerVersion("1.0.0", "v2.0.0"));
		assertTrue(UpdateChecker.isNewerVersion("2.1.4", "v2.2.0"));
	}

	@Test
	public void isNewerVersionReturnsFalseForEqualOrLowerVersions() {
		assertFalse(UpdateChecker.isNewerVersion("1.0.0", "1.0.0"));
		assertFalse(UpdateChecker.isNewerVersion("1.3.0", "1.3"));
		assertFalse(UpdateChecker.isNewerVersion("1.3", "v1.3"));
		assertFalse(UpdateChecker.isNewerVersion("1.3.0", "v1.3"));
		assertFalse(UpdateChecker.isNewerVersion("v1.1.0", "1.1.0"));
		assertFalse(UpdateChecker.isNewerVersion("2.0.0", "1.9.9"));
		assertFalse(UpdateChecker.isNewerVersion(null, "v1.0.0"));
		assertFalse(UpdateChecker.isNewerVersion("1.0.0", null));
	}
}
