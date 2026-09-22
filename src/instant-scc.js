(async function () {
    const { username, password } = await browser.storage.local.get(["username", "password"])
    if (!username || username.length < 5 || !password) {
        return;
    }

    document.getElementById("username").value = username;
    document.getElementById("password").value = password;
    document.getElementById("sbmt").click()
})();
