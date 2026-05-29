// Map of redirect target URL -> { newUrl, expiresAt, tabId }
const pendingRedirects = new Map();

function cleanupExpired() {
  const now = Date.now();
  for (const [key, info] of pendingRedirects) {
    if (info.expiresAt <= now) pendingRedirects.delete(key);
  }
}

setInterval(cleanupExpired, 60000);

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

    // The server's Location header target (where the browser will go next)
    const serverTarget = details.redirectUrl || "";

    // Record mapping so we can intercept the next onBeforeRequest to serverTarget
    pendingRedirects.set(serverTarget, {
      newUrl: computedUrl,
      expiresAt: Date.now() + 10000,
      tabId: details.tabId,
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

    const entry = pendingRedirects.get(details.url);
    if (!entry) return;

    if (details.url === entry.newUrl) {
      pendingRedirects.delete(details.url);
      return;
    }

    if (typeof entry.tabId === 'number' && entry.tabId !== details.tabId) {
      // different tab; do not apply
      return;
    }

    // Remove the mapping so we don't repeatedly redirect
    pendingRedirects.delete(details.url);

    console.log("ilias-login redirecting request", details.url, "->", entry.newUrl);
    return { redirectUrl: entry.newUrl };
  },
  { urls: ["https://ilias.studium.kit.edu/*"] },
  ["blocking"]
);