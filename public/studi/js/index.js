'use strict';

/* HEADER */

const user = {};

/* FUNCTIONS */
function updateName (_user) {
    let nameTag = document.getElementById('player-name');
    nameTag.innerText = _user.name;
}

async function updateBalance (_user) {
    let data = await getUserData();
    _user.balance = data.kontostand;

    let balanceTag = document.getElementById('balance');
    balanceTag.innerText = _user.balance + '€';

    let percent = document.getElementById('percent');
    if (_user.getPercent() >= 0) {
        percent.innerText = '+' + _user.getPercent() + '%'
    } else {
        percent.innerText = _user.getPercent() + '%'
    }
}

async function getUserData() {
    let response = await fetch('/api/benutzerdaten', {
        // TODO [!]: check if method and headers are correct
        method: 'GET',
        headers: {'accept': 'application/json'}
    });

    if (response.ok) {
        return await response.json();
    } else {
        // TODO [!]: log failure into log window (for user)
        console.log(response.status + ' :: ' + response.statusText)
    }
}

function getPercent() {
    return (this.initBalance / this.balance * 100) - 100;
}

/* INIT */
window.onload = async () => {
    let temp = await getUserData();

    user.name = temp.name;
    user.balance = temp.kontostand;
    user.initBalance = user.balance;
    user.getPercent = getPercent;
    await updateBalance(user);

    updateName(user);
    let balanceInterval = setInterval(async () => {
        await updateBalance(user);
    }, 500)
}