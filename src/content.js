// Content script for ilias-login
(function () {
    if (window.location.href.includes("login.php")) return;
    document.querySelector(".header-inner a[href*='login.php']")?.click();
})();
