package com.hhst.youtubelite.ui;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.widget.EditText;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.hhst.youtubelite.Constant;
import com.hhst.youtubelite.R;
import com.hhst.youtubelite.browser.AccountProfile;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import dagger.hilt.android.AndroidEntryPoint;

@AndroidEntryPoint
public class AccountManagerActivity extends AppCompatActivity {
	private RecyclerView recyclerView;
	private FloatingActionButton fabAddAccount;
	private MaterialToolbar toolbar;

	@Override
	protected void onCreate(@Nullable Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		setContentView(R.layout.activity_account_manager);

		toolbar = findViewById(R.id.toolbar);
		toolbar.setNavigationOnClickListener(v -> finish());

		recyclerView = findViewById(R.id.recyclerView);
		recyclerView.setLayoutManager(new LinearLayoutManager(this));

		fabAddAccount = findViewById(R.id.fabAddAccount);
		fabAddAccount.setOnClickListener(v -> {
			// Auto-backup the current session under the account's own name (from prefs or a default)
			Map<String, String> activeCookies = getActiveCookies();
			List<AccountProfile> savedList = loadProfiles();
			if (getActiveSid() != null && !isSessionSaved(activeCookies, savedList)) {
				// Derive best label from existing list size
				String label = "Account " + (savedList.size() + 1);
				AccountProfile autoProfile = new AccountProfile(
						UUID.randomUUID().toString(),
						label,
						activeCookies,
						System.currentTimeMillis()
				);
				savedList.add(autoProfile);
				saveProfiles(savedList);
			}
			// Clear session and open sign-in
			CookieManager.getInstance().removeAllCookies(null);
			CookieManager.getInstance().flush();
			Intent intent = new Intent(this, MainActivity.class);
			intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
			intent.setData(android.net.Uri.parse("https://m.youtube.com/signin"));
			startActivity(intent);
			finish();
		});

		refreshList();
	}

	private void refreshList() {
		List<AccountProfile> savedList = loadProfiles();
		Map<String, String> activeCookies = getActiveCookies();
		boolean hasUnsavedActive = getActiveSid() != null && !isSessionSaved(activeCookies, savedList);

		ProfileAdapter adapter = new ProfileAdapter(savedList, hasUnsavedActive);
		recyclerView.setAdapter(adapter);
	}

	private List<AccountProfile> loadProfiles() {
		SharedPreferences prefs = getSharedPreferences("account_prefs", MODE_PRIVATE);
		String json = prefs.getString("profiles", "[]");
		Type type = new TypeToken<ArrayList<AccountProfile>>(){}.getType();
		List<AccountProfile> list = new Gson().fromJson(json, type);
		if (list == null) {
			list = new ArrayList<>();
		}
		return list;
	}

	private void saveProfiles(List<AccountProfile> list) {
		SharedPreferences prefs = getSharedPreferences("account_prefs", MODE_PRIVATE);
		String json = new Gson().toJson(list);
		prefs.edit().putString("profiles", json).apply();
	}

	private Map<String, String> getActiveCookies() {
		CookieManager cookieManager = CookieManager.getInstance();
		Map<String, String> cookies = new HashMap<>();
		for (String url : List.of("https://youtube.com", "https://.youtube.com", "https://google.com", "https://accounts.google.com")) {
			String cookieString = cookieManager.getCookie(url);
			if (cookieString != null && !cookieString.trim().isEmpty()) {
				cookies.put(url, cookieString);
			}
		}
		return cookies;
	}

	private String getCookieValue(String cookieString, String key) {
		if (cookieString == null) return null;
		for (String pair : cookieString.split(";")) {
			String[] parts = pair.split("=", 2);
			if (parts.length == 2 && parts[0].trim().equals(key)) {
				return parts[1].trim();
			}
		}
		return null;
	}

	private String getActiveSid() {
		String cookie = CookieManager.getInstance().getCookie("https://youtube.com");
		return getCookieValue(cookie, "SID");
	}

	private boolean isSessionSaved(Map<String, String> activeCookies, List<AccountProfile> savedProfiles) {
		String activeSid = getActiveSid();
		if (activeSid == null) return true;
		for (AccountProfile profile : savedProfiles) {
			String profileSid = getCookieValue(profile.getDomainCookies().get("https://youtube.com"), "SID");
			if (activeSid.equals(profileSid)) {
				return true;
			}
		}
		return false;
	}

	private void saveCurrentActiveSession() {
		final EditText input = new EditText(this);
		input.setHint("Profile Name (e.g., Personal, Alternate)");
		
		new MaterialAlertDialogBuilder(this)
				.setTitle("Save Current Account")
				.setMessage("Enter a label for this account profile:")
				.setView(input)
				.setPositiveButton("Save", (dialog, which) -> {
					String name = input.getText().toString().trim();
					if (name.isEmpty()) {
						Toast.makeText(this, "Profile name cannot be empty", Toast.LENGTH_SHORT).show();
						return;
					}
					List<AccountProfile> list = loadProfiles();
					AccountProfile profile = new AccountProfile(
							UUID.randomUUID().toString(),
							name,
							getActiveCookies(),
							System.currentTimeMillis()
					);
					list.add(profile);
					saveProfiles(list);
					refreshList();
					Toast.makeText(this, "Account profile saved", Toast.LENGTH_SHORT).show();
				})
				.setNegativeButton("Cancel", null)
				.show();
	}

	private void onAddAccountClicked() {
		new MaterialAlertDialogBuilder(this)
				.setTitle("Add New Account")
				.setMessage("To add a new account, you will be logged out of your current session. Please make sure you have saved your current account profile first.\n\nProceed to sign-in?")
				.setPositiveButton("Proceed", (dialog, which) -> {
					// Backup the current session automatically if they forgot to save it
					Map<String, String> activeCookies = getActiveCookies();
					List<AccountProfile> savedList = loadProfiles();
					if (getActiveSid() != null && !isSessionSaved(activeCookies, savedList)) {
						AccountProfile autoProfile = new AccountProfile(
								UUID.randomUUID().toString(),
								"Backup Session " + (savedList.size() + 1),
								activeCookies,
								System.currentTimeMillis()
						);
						savedList.add(autoProfile);
						saveProfiles(savedList);
					}

					// Clear current session to force sign-in page
					CookieManager.getInstance().removeAllCookies(null);
					CookieManager.getInstance().flush();

					// Direct user to YouTube sign in
					Intent intent = new Intent(this, MainActivity.class);
					intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
					intent.setData(android.net.Uri.parse("https://m.youtube.com/signin"));
					startActivity(intent);
					finish();
				})
				.setNegativeButton("Cancel", null)
				.show();
	}

	private void deleteProfile(AccountProfile profile) {
		new MaterialAlertDialogBuilder(this)
				.setTitle("Delete Account Profile")
				.setMessage("Are you sure you want to delete profile: " + profile.getName() + "?")
				.setPositiveButton("Delete", (dialog, which) -> {
					List<AccountProfile> list = loadProfiles();
					for (int i = 0; i < list.size(); i++) {
						if (list.get(i).getId().equals(profile.getId())) {
							list.remove(i);
							break;
						}
					}
					saveProfiles(list);
					refreshList();
					Toast.makeText(this, "Profile deleted", Toast.LENGTH_SHORT).show();
				})
				.setNegativeButton("Cancel", null)
				.show();
	}

	private void switchProfile(AccountProfile profile) {
		new MaterialAlertDialogBuilder(this)
				.setTitle("Switch Account")
				.setMessage("Switch session to: " + profile.getName() + "? The app will reload.")
				.setPositiveButton("Switch", (dialog, which) -> {
					// Automatically backup unsaved current session first
					Map<String, String> activeCookies = getActiveCookies();
					List<AccountProfile> savedList = loadProfiles();
					if (getActiveSid() != null && !isSessionSaved(activeCookies, savedList)) {
						AccountProfile autoProfile = new AccountProfile(
								UUID.randomUUID().toString(),
								"Backup Session " + (savedList.size() + 1),
								activeCookies,
								System.currentTimeMillis()
						);
						savedList.add(autoProfile);
						saveProfiles(savedList);
					}

					// Apply target cookies
					CookieManager cookieManager = CookieManager.getInstance();
					cookieManager.removeAllCookies(null);
					for (Map.Entry<String, String> entry : profile.getDomainCookies().entrySet()) {
						String url = entry.getKey();
						String val = entry.getValue();
						if (val != null) {
							for (String pair : val.split(";")) {
								cookieManager.setCookie(url, pair.trim());
							}
						}
					}
					cookieManager.flush();

					// Reload application
					Intent intent = new Intent(this, MainActivity.class);
					intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_NEW_TASK);
					startActivity(intent);
					finish();
				})
				.setNegativeButton("Cancel", null)
				.show();
	}

	private class ProfileAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {
		private static final int TYPE_UNSAVED = 0;
		private static final int TYPE_SAVED = 1;

		private final List<AccountProfile> savedList;
		private final boolean hasUnsavedActive;

		public ProfileAdapter(List<AccountProfile> savedList, boolean hasUnsavedActive) {
			this.savedList = savedList;
			this.hasUnsavedActive = hasUnsavedActive;
		}

		@Override
		public int getItemViewType(int position) {
			if (hasUnsavedActive && position == 0) {
				return TYPE_UNSAVED;
			}
			return TYPE_SAVED;
		}

		@Override
		public int getItemCount() {
			return savedList.size() + (hasUnsavedActive ? 1 : 0);
		}

		@NonNull
		@Override
		public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
			android.view.LayoutInflater inflater = android.view.LayoutInflater.from(parent.getContext());
			android.view.View view = inflater.inflate(R.layout.item_account_profile, parent, false);
			return new ProfileViewHolder(view);
		}

		@Override
		public void onBindViewHolder(@NonNull RecyclerView.ViewHolder holder, int position) {
			ProfileViewHolder vh = (ProfileViewHolder) holder;
			if (getItemViewType(position) == TYPE_UNSAVED) {
				vh.title.setText("Current Account (Unsaved)");
				vh.summary.setVisibility(android.view.View.VISIBLE);
				vh.summary.setText("Tap to save this profile");
				vh.btnDelete.setImageResource(R.drawable.ic_add);
				vh.btnDelete.setColorFilter(android.graphics.Color.GREEN);
				vh.btnDelete.setOnClickListener(v -> saveCurrentActiveSession());
				vh.itemView.setOnClickListener(v -> saveCurrentActiveSession());
			} else {
				int adjustedPos = hasUnsavedActive ? position - 1 : position;
				AccountProfile profile = savedList.get(adjustedPos);
				vh.title.setText(profile.getName());

				String activeSid = getActiveSid();
				String profileSid = getCookieValue(profile.getDomainCookies().get("https://youtube.com"), "SID");
				boolean isActive = activeSid != null && activeSid.equals(profileSid);

				if (isActive) {
					vh.summary.setVisibility(android.view.View.VISIBLE);
					vh.summary.setText("Active Profile");
					vh.summary.setTextColor(android.graphics.Color.GREEN);
				} else {
					vh.summary.setVisibility(android.view.View.GONE);
				}

				vh.btnDelete.setImageResource(R.drawable.ic_delete);
				vh.btnDelete.setColorFilter(android.graphics.Color.RED);
				vh.btnDelete.setOnClickListener(v -> deleteProfile(profile));

				vh.itemView.setOnClickListener(v -> {
					if (!isActive) {
						switchProfile(profile);
					}
				});
			}
		}
	}

	private static class ProfileViewHolder extends RecyclerView.ViewHolder {
		android.widget.TextView title;
		android.widget.TextView summary;
		android.widget.ImageView icon;
		android.widget.ImageButton btnDelete;

		public ProfileViewHolder(@NonNull android.view.View itemView) {
			super(itemView);
			title = itemView.findViewById(R.id.title);
			summary = itemView.findViewById(R.id.summary);
			icon = itemView.findViewById(R.id.icon);
			btnDelete = itemView.findViewById(R.id.btnDelete);
		}
	}
}
