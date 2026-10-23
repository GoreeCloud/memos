package com.goreecloud.memos;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Toast;

public final class MainActivity extends Activity {
  private static final int FILE_PICKER_REQUEST = 491;
  private static final String PREF_SERVER = "server_origin";
  private WebView web;
  private String serverOrigin = "";
  private ValueCallback<Uri[]> uploadCallback;

  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    serverOrigin = getPreferences(MODE_PRIVATE).getString(PREF_SERVER, "");
    LinearLayout root = new LinearLayout(this);
    root.setOrientation(LinearLayout.VERTICAL);
    LinearLayout bar = new LinearLayout(this);
    bar.setGravity(Gravity.CENTER_VERTICAL);
    bar.setPadding(dp(8), dp(3), dp(8), dp(3));
    Button title = new Button(this);
    title.setText("GoreeCloud Memos");
    title.setContentDescription("Configure Memos server");
    title.setOnClickListener(v -> showServerSettings());
    bar.addView(title, new LinearLayout.LayoutParams(0, dp(48), 1));
    Button refresh = new Button(this);
    refresh.setText("Reload");
    refresh.setContentDescription("Reload memos");
    refresh.setOnClickListener(v -> { if (web != null && !serverOrigin.isEmpty()) web.reload(); });
    bar.addView(refresh, new LinearLayout.LayoutParams(dp(100), dp(48)));
    root.addView(bar);
    web = new WebView(this);
    root.addView(web, new LinearLayout.LayoutParams(-1, 0, 1));
    setContentView(root);
    setupWebView();
    if (serverOrigin.isEmpty()) showServerSettings();
    else web.loadUrl(serverOrigin + "/");
  }

  private int dp(int n) {
    return Math.round(n * getResources().getDisplayMetrics().density);
  }

  private void setupWebView() {
    WebView.setWebContentsDebuggingEnabled(false);
    WebSettings settings = web.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setAllowFileAccess(false);
    settings.setAllowContentAccess(false);
    settings.setJavaScriptCanOpenWindowsAutomatically(false);
    settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    settings.setSafeBrowsingEnabled(true);
    CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
    web.setWebViewClient(new WebViewClient() {
      @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        if (!request.isForMainFrame()) return false;
        return handleNavigation(request.getUrl());
      }
      @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
        return handleNavigation(Uri.parse(url));
      }
      @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
        if (request.isForMainFrame()) {
          Toast.makeText(MainActivity.this, "Unable to reach Memos. Check the HTTPS server address.", Toast.LENGTH_LONG).show();
        }
      }
    });
    web.setWebChromeClient(new WebChromeClient() {
      @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
        if (uploadCallback != null) uploadCallback.onReceiveValue(null);
        uploadCallback = callback;
        try {
          Intent picker = params.createIntent();
          picker.addCategory(Intent.CATEGORY_OPENABLE);
          startActivityForResult(picker, FILE_PICKER_REQUEST);
          return true;
        } catch (ActivityNotFoundException error) {
          uploadCallback = null;
          callback.onReceiveValue(null);
          Toast.makeText(MainActivity.this, "No document picker available", Toast.LENGTH_SHORT).show();
          return false;
        }
      }
    });
  }

  private boolean handleNavigation(Uri uri) {
    if (!"https".equalsIgnoreCase(uri.getScheme())) return true;
    Uri trusted = Uri.parse(serverOrigin);
    if (trusted.getHost() != null && trusted.getHost().equalsIgnoreCase(uri.getHost())
        && trusted.getPort() == uri.getPort()) return false;
    try {
      startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE));
    } catch (ActivityNotFoundException error) {
      Toast.makeText(this, "No browser available", Toast.LENGTH_SHORT).show();
    }
    return true;
  }

  private void showServerSettings() {
    EditText input = new EditText(this);
    input.setSingleLine(true);
    input.setHint("https://memos.example.com");
    input.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_URI);
    input.setText(serverOrigin);
    LinearLayout holder = new LinearLayout(this);
    holder.setPadding(dp(20), dp(12), dp(20), 0);
    holder.addView(input, new LinearLayout.LayoutParams(-1, -2));
    AlertDialog dialog = new AlertDialog.Builder(this)
        .setTitle("Memos server")
        .setMessage("Connect to your self-hosted Memos server using HTTPS. The app does not host notes offline.")
        .setView(holder)
        .setNegativeButton("Cancel", (d, which) -> { })
        .setPositiveButton("Connect", null).create();
    dialog.setOnShowListener(ignore -> dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
      String candidate = input.getText().toString().trim();
      Uri url = Uri.parse(candidate);
      String path = url.getEncodedPath();
      if (!"https".equalsIgnoreCase(url.getScheme()) || url.getHost() == null
          || url.getHost().isEmpty() || url.getUserInfo() != null || url.getQuery() != null
          || url.getFragment() != null || (path != null && !path.isEmpty() && !"/".equals(path))) {
        input.setError("Enter an HTTPS server origin without a path or query");
        return;
      }
      String origin = "https://" + url.getEncodedAuthority();
      if (!origin.equals(serverOrigin)) web.clearHistory();
      serverOrigin = origin;
      getPreferences(MODE_PRIVATE).edit().putString(PREF_SERVER, origin).apply();
      dialog.dismiss();
      web.loadUrl(serverOrigin + "/");
    }));
    dialog.show();
  }

  @Override protected void onActivityResult(int request, int result, Intent data) {
    super.onActivityResult(request, result, data);
    if (request == FILE_PICKER_REQUEST && uploadCallback != null) {
      uploadCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
      uploadCallback = null;
    }
  }

  @Override public void onBackPressed() {
    if (web != null && web.canGoBack()) web.goBack();
    else super.onBackPressed();
  }

  @Override protected void onDestroy() {
    if (uploadCallback != null) uploadCallback.onReceiveValue(null);
    if (web != null) web.destroy();
    super.onDestroy();
  }
}
