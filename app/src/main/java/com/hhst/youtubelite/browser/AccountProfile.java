package com.hhst.youtubelite.browser;

import java.util.Map;

/**
 * Data model representing a saved account session profile.
 */
public class AccountProfile {
	private String id;
	private String name;
	private Map<String, String> domainCookies;
	private long lastUsedTime;

	public AccountProfile(String id, String name, Map<String, String> domainCookies, long lastUsedTime) {
		this.id = id;
		this.name = name;
		this.domainCookies = domainCookies;
		this.lastUsedTime = lastUsedTime;
	}

	public String getId() {
		return id;
	}

	public void setId(String id) {
		this.id = id;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public Map<String, String> getDomainCookies() {
		return domainCookies;
	}

	public void setDomainCookies(Map<String, String> domainCookies) {
		this.domainCookies = domainCookies;
	}

	public long getLastUsedTime() {
		return lastUsedTime;
	}

	public void setLastUsedTime(long lastUsedTime) {
		this.lastUsedTime = lastUsedTime;
	}

	public static String getCookieValue(String cookieString, String key) {
		if (cookieString == null) return null;
		for (String pair : cookieString.split(";")) {
			String[] parts = pair.split("=", 2);
			if (parts.length == 2 && parts[0].trim().equals(key)) {
				return parts[1].trim();
			}
		}
		return null;
	}
}
