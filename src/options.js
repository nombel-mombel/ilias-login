const usernameField = document.getElementById("username");
const passwordField = document.getElementById("password");
const submit = document.getElementById("submit");
let id = 0;

async function start() {
    const { username, password } = await browser.storage.local.get(["username", "password"]);
    if (username) {
        usernameField.value = username;
    }
    if (password) {
        passwordField.value = password;
    }
}
start()


async function updateData() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    await browser.storage.local.set({ username, password });
    success();
}

function success() {
    submit.classList.add("success");
    if (id) {
        clearTimeout(id);
    }
    id = setTimeout(() => {
        submit.classList.remove("success");
    }, 2000);
}
submit.addEventListener("click", updateData);