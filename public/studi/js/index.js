'use strict';

//=================================================================//
//=== HEADER ======================================================//
//=================================================================//

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
    return (this.balance / this.initBalance * 100) - 100;
}

//=================================================================//
//=== STOCKS ======================================================//
//=================================================================//

const svgns = "http://www.w3.org/2000/svg";
let stocks = {};

async function getStocks() {
    let response = await fetch('/api/aktien', {
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

function addHistoryArray() {
    if(stocks.length > 0) {
        for( let i = 0; i < stocks.length; i++) {
            stocks[i].history = []
        }
    }
}

async function updateStocks() {
    let temp = await getStocks();

    // es wird angenommen, dass während dem Spiel keine weiteren Aktien hinzugefügt werden [!!!]
    for(let i = 0; i < stocks.length; i++) {
        stocks[i].preis = temp[i].preis;
        stocks[i].history.push(stocks[i].preis);
        if(stocks[i].history.length > 10) {
            stocks[i].history.shift();
        }
        stocks[i].anzahlVerfuegbar = temp[i].anzahlVerfuegbar;
    }

}

function createStocksUI() {
    let stocksUI = document.getElementById('stocks');

    for (let i = 0; i < stocks.length; i++) {
        let stock = document.createElement('div');
        let svg = document.createElementNS(svgns, 'svg');
        let polyline = document.createElementNS(svgns, 'polyline');
        let stockName = document.createElement('p');
        let stockPrice = document.createElement('p');
        let stockCount = document.createElement('p');

        let buySell = document.createElement('div');
        let buy100 = document.createElement('p');
        let sell100 = document.createElement('p');

        sell100.classList.add('button');
        sell100.classList.add('sell100');
        sell100.innerText = '-100';
        sell100.addEventListener('click', async () => {
            await tradeStock(stocks[i].name, -100)
        });

        buy100.classList.add('button');
        buy100.classList.add('buy100');
        buy100.innerText = '+100';
        buy100.addEventListener('click', async () => {
            await tradeStock(stocks[i].name, 100)
        });

        buySell.classList.add('buy-sell');
        buySell.appendChild(sell100);
        buySell.appendChild(buy100);

        polyline.classList.add('polyline-graph');

        svg.classList.add('stock-chart')
        svg.setAttribute("viewBox", "0 0 3000 1500");
        svg.role = 'img';
        svg.appendChild(polyline);

        stockName.classList.add('stock-name');
        stockName.innerText = stocks[i].name;

        stockPrice.classList.add('stock-price');
        stockPrice.title = 'Current stock-price';
        stockPrice.innerText = stocks[i].preis;

        stockCount.classList.add('stock-count');
        stockCount.title = 'Stocks available currently';
        stockCount.innerText = stocks[i].anzahlVerfuegbar;

        stock.classList.add('stock');
        stock.appendChild(svg);
        stock.appendChild(stockName);
        stock.appendChild(stockPrice);
        stock.appendChild(stockCount);
        stock.appendChild(buySell);

        stocksUI.appendChild(stock);
    }
}

function updateStocksUI() {
    let stockCharts = document.getElementsByClassName('stock-chart');
    let stockPrices = document.getElementsByClassName('stock-price');
    let stockCounts = document.getElementsByClassName('stock-count');

    for (let i = 0; i < stocks.length; i++) {

        let polyline = stockCharts[i].firstChild;

        let points = '';

        for(let j = 0; j < 10; j++) {
            if (!isNaN(stocks[i].history[j])) {
                points += (j * 300) + ',' + (1490 - Math.round(stocks[i].history[j])) + ' ';
            }
        }

        polyline.setAttribute('points', points);

        //updateChart(stockCharts[i], i);
        stockPrices[i].innerText = stocks[i].preis;
        stockCounts[i].innerText = stocks[i].anzahlVerfuegbar;
    }
}

function highlightStocks() {
    let stockUIs = document.getElementsByClassName('stock');

    for( let i = 0; i < stocks.length; i++) {
        if(stocks[i].history[9] > average(stocks[i].history)) {
            stockUIs[i].classList.add('stock-hl-green');
            try {
                stockUIs[i].classList.remove('stock-hl-red');
            } catch (ignored) {}
        } else if (stocks[i].history[9] === average(stocks[i].history)) {
            try {
                stockUIs[i].classList.remove('stock-hl-green');
                stockUIs[i].classList.remove('stock-hl-red');
            } catch (ignored) {}
        } else if (stocks[i].history[9] < average(stocks[i].history)) {
            stockUIs[i].classList.add('stock-hl-red');
            try {
                stockUIs[i].classList.remove('stock-hl-green');
            } catch (ignored) {}
        }
    }
}

function average(arr) {
    let num = 0;

    arr.forEach(n => {
        num += n;
    });

    return num/arr.length;
}

//=================================================================//
//=== PORTFOLIO ===================================================//
//=================================================================//

//===== BUY/SELL
async function tradeStock(_stockName, _count) {
    let response = await fetch('/api/umsaetze', {
        method: 'POST',
        headers: {
            'accept':'application/json',
            'Content-Type':'application/json',
        },
        body: JSON.stringify({
            "aktie": {
                "name": _stockName
            },
            "anzahl": _count
        })
    });

    if (response.ok) {
        return await response.json();
    } else {
        // TODO [!]: log failure into log window (for user)
        console.log(response.status + ' :: ' + response.statusText)
    }
}

//===== PORTFOLIO STOCKS

//=================================================================//
//=== INIT ========================================================//
//=================================================================//

window.onload = async () => {
    // HEADER
    let temp = await getUserData();
    user.name = temp.name;
    user.balance = temp.kontostand;
    user.initBalance = user.balance;
    user.getPercent = getPercent;

    await updateBalance(user);

    updateName(user);
    // STOCKS
    stocks = await getStocks();

    addHistoryArray();
    createStocksUI();

    let updater = setInterval(async () => {
        await updateBalance(user);
        await updateStocks();
        updateStocksUI();
        highlightStocks();
    }, 500)
}