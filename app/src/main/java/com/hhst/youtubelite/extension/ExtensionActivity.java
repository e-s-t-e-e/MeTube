package com.hhst.youtubelite.extension;

import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.activity.EdgeToEdge;
import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.recyclerview.widget.SimpleItemAnimator;

import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.dialog.MaterialAlertDialogBuilder;
import com.google.android.material.switchmaterial.SwitchMaterial;
import com.hhst.youtubelite.R;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;

import javax.inject.Inject;

import dagger.hilt.android.AndroidEntryPoint;

/**
 * Screen that shows extension settings as categorized pages.
 */
@AndroidEntryPoint
public class ExtensionActivity extends AppCompatActivity {
	private static final int TYPE_NAV = 0;
	private static final int TYPE_TOGGLE = 1;
	private static final int TYPE_DROPDOWN = 2;
	@Inject
	ExtensionManager manager;
	private final Deque<Extension> stack = new ArrayDeque<>();
	private final Adapter adapter = new Adapter();
	private Extension page;
	private MaterialToolbar toolbar;

	public static Intent intent(@NonNull android.content.Context context) {
		return new Intent(context, ExtensionActivity.class);
	}

	@Override
	protected void onCreate(@Nullable Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		EdgeToEdge.enable(this);
		setContentView(R.layout.activity_extension);

		View root = findViewById(R.id.root);
		ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
			var bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
			v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
			return insets;
		});

		toolbar = findViewById(R.id.toolbar);
		toolbar.setNavigationOnClickListener(v -> navigateBack());
		toolbar.inflateMenu(R.menu.extension_actions);
		toolbar.setOnMenuItemClickListener(this::onMenuItemClick);

		RecyclerView list = findViewById(R.id.recyclerView);
		list.setLayoutManager(new LinearLayoutManager(this));
		list.setAdapter(adapter);
		list.setItemAnimator(null);

		getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
			@Override
			public void handleOnBackPressed() {
				navigateBack();
			}
		});

		showPage(Extension.root(), false);
	}

	private boolean onMenuItemClick(@NonNull MenuItem item) {
		if (item.getItemId() != R.id.action_reset) return false;
		new MaterialAlertDialogBuilder(this)
						.setTitle(R.string.reset_extension_title)
						.setMessage(R.string.reset_extension_message)
						.setPositiveButton(R.string.confirm, (d, w) -> {
							manager.resetToDefault();
							adapter.notifyDataSetChanged();
						})
						.setNegativeButton(R.string.cancel, null)
						.show();
		return true;
	}

	private void open(@NonNull Extension item) {
		if (!item.hasChildren()) return;
		showPage(item, true);
	}

	private void showPage(@NonNull Extension next, boolean push) {
		if (push && page != null) {
			stack.push(page);
		}
		page = next;
		toolbar.setTitle(next.title());
		adapter.submit(next.children());
	}

	private void navigateBack() {
		if (stack.isEmpty()) {
			finish();
			return;
		}
		page = stack.pop();
		toolbar.setTitle(page.title());
		adapter.submit(page.children());
	}

	private final class Adapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {
		@NonNull
		private List<Extension> items = List.of();

		void submit(@NonNull List<Extension> items) {
			this.items = items;
			notifyDataSetChanged();
		}

		@Override
		public int getItemViewType(int position) {
			Extension item = items.get(position);
			if (item.hasChildren()) return TYPE_NAV;
			return item.dropdownOptions().isEmpty() ? TYPE_TOGGLE : TYPE_DROPDOWN;
		}

		@Override
		public int getItemCount() {
			return items.size();
		}

		@NonNull
		@Override
		public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
			LayoutInflater inflater = LayoutInflater.from(parent.getContext());
			if (viewType == TYPE_NAV) {
				return new NavHolder(inflater.inflate(R.layout.item_extension_nav, parent, false));
			}
			if (viewType == TYPE_DROPDOWN) {
				return new DropdownHolder(inflater.inflate(R.layout.item_extension_dropdown, parent, false));
			}
			return new ToggleHolder(inflater.inflate(R.layout.item_extension_toggle, parent, false));
		}

		@Override
		public void onBindViewHolder(@NonNull RecyclerView.ViewHolder holder, int position) {
			Extension item = items.get(position);
			if (holder instanceof NavHolder nav) {
				nav.bind(item);
				return;
			}
			if (holder instanceof DropdownHolder dropdown) {
				dropdown.bind(item);
				return;
			}
			((ToggleHolder) holder).bind(item);
		}
	}

	private final class NavHolder extends RecyclerView.ViewHolder {
		private final TextView title;
		private final TextView summary;
		private final ImageView chevron;
		private final ImageView icon;

		private NavHolder(@NonNull View itemView) {
			super(itemView);
			title = itemView.findViewById(R.id.title);
			summary = itemView.findViewById(R.id.summary);
			chevron = itemView.findViewById(R.id.chevron);
			icon = itemView.findViewById(R.id.icon);
		}

		private void bind(@NonNull Extension item) {
			title.setText(item.title());
			if (item.summary() == 0) {
				summary.setVisibility(View.GONE);
			} else {
				summary.setVisibility(View.VISIBLE);
				summary.setText(item.summary());
			}
			if (item.icon() != 0) {
				icon.setVisibility(View.VISIBLE);
				icon.setImageResource(item.icon());
			} else {
				icon.setVisibility(View.GONE);
			}
			chevron.setVisibility(View.VISIBLE);
			itemView.setOnClickListener(v -> open(item));
		}
	}

	private final class ToggleHolder extends RecyclerView.ViewHolder {
		private final TextView title;
		private final TextView summary;
		private final SwitchMaterial toggle;

		private ToggleHolder(@NonNull View itemView) {
			super(itemView);
			title = itemView.findViewById(R.id.title);
			summary = itemView.findViewById(R.id.summary);
			toggle = itemView.findViewById(R.id.toggle);
		}

		private void bind(@NonNull Extension item) {
			title.setText(item.title());
			if (item.summary() == 0) {
				summary.setVisibility(View.GONE);
			} else {
				summary.setVisibility(View.VISIBLE);
				summary.setText(item.summary());
			}
			toggle.setOnCheckedChangeListener(null);
			toggle.setChecked(manager.isEnabled(item.key()));
			toggle.setOnCheckedChangeListener((buttonView, isChecked) -> manager.setEnabled(item.key(), isChecked));
			itemView.setOnClickListener(v -> toggle.toggle());
		}
	}

	private final class DropdownHolder extends RecyclerView.ViewHolder {
		private final TextView title;
		private final TextView summary;

		private DropdownHolder(@NonNull View itemView) {
			super(itemView);
			title = itemView.findViewById(R.id.title);
			summary = itemView.findViewById(R.id.summary);
		}

		private void bind(@NonNull Extension item) {
			List<Extension.DropdownOption> options = item.dropdownOptions();
			title.setText(item.title());
			String current = manager.getString(item.key());
			int selected = indexOf(options, current);
			summary.setVisibility(View.VISIBLE);
			summary.setText(selected >= 0 ? options.get(selected).labelRes() : R.string.unknown);
			itemView.setOnClickListener(v -> {
				String[] labels = new String[options.size()];
				for (int i = 0; i < options.size(); i++) {
					labels[i] = v.getContext().getString(options.get(i).labelRes());
				}
				new MaterialAlertDialogBuilder(v.getContext())
								.setTitle(item.title())
								.setSingleChoiceItems(labels, selected, (dialog, which) -> {
									manager.setString(item.key(), options.get(which).value());
									dialog.dismiss();
									bind(item);
								})
								.setNegativeButton(R.string.cancel, null)
								.show();
			});
		}

		private int indexOf(List<Extension.DropdownOption> options, String value) {
			for (int i = 0; i < options.size(); i++) {
				if (options.get(i).value().equals(value)) return i;
			}
			return -1;
		}
	}
}
