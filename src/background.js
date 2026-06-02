// Map of redirect target URL -> { newUrl, expiresAt, tabId }
const pendingRedirects = new Map();

browser.tabs.onRemoved.addListener((tabId) => {
    pendingRedirects.delete(tabId);
});

browser.webRequest.onBeforeRedirect.addListener(
    (details) => {
        if (details.type !== "main_frame") return;
        if (!details.url.startsWith("https://ilias.studium.kit.edu/")) return;
        if (details.statusCode !== 302) return;
        if (!details.url.includes("cmdClass=")) return;

        const params = new URLSearchParams(details.url.split("?")[1] || "");
        const cmdClass = (params.get("cmdClass") || "").toLowerCase();
        let type;
        switch (cmdClass) {
            case "ilobjfoldergui":
                type = "fold";
                break;
            case "ilobjfilegui":
                type = "file";
                break;
            case "ilinfoscreengui":
            case "ilobjcoursegui":
                type = "crs";
                break;
            case "ilforumgui":
                type = "frm";
                break;
            case "ilobjexcercisegui":
                type = "exc";
                break;
            default:
                return;
        }

        const id = params.get("ref_id");
        if (!id) return;

        // Compute the new desired target URL
        const computedUrl = `https://ilias.studium.kit.edu/goto.php/${type}/${id}`;

        // Record mapping so we can intercept the next onBeforeRequest to serverTarget
        pendingRedirects.set(details.tabId, {
            oldUrl: details.redirectUrl,
            newUrl: computedUrl
        });

    },
    { urls: ["https://ilias.studium.kit.edu/*"] }
);

// Intercept requests and redirect when they match a pending server redirect target
browser.webRequest.onBeforeRequest.addListener(
    (details) => {
      if (details.type !== "main_frame") return;
      if (!details.url.startsWith("https://ilias.studium.kit.edu/")) return;

      if (details.url.startsWith("https://ilias.studium.kit.edu/login.php")) {
            const params = new URLSearchParams(details.url.split("?")[1] || "");
            const target = params.get("target");
            return { redirectUrl: "https://ilias.studium.kit.edu/shib_login.php" + (target ? '?target=' + target : '') };
      }

      const entry = pendingRedirects.get(details.tabId);
      if (!entry) return;

      if (details.url !== entry.oldUrl) {
          // The browser is going somewhere else than the server's redirect target; do not apply
          pendingRedirects.delete(details.tabId);
          return;
      }

      if (details.url === entry.newUrl) {
          pendingRedirects.delete(details.tabId);
          return;
      }

      // Remove the mapping so we don't repeatedly redirect
      pendingRedirects.delete(details.tabId);

      console.log("ilias-login redirecting request", details.url, "->", entry.newUrl);
      return { redirectUrl: entry.newUrl };
    },
    { urls: ["https://ilias.studium.kit.edu/*"] },
    ["blocking"]
);