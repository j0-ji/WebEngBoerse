'use strict';

//=================================================================//
//=== UTIL ========================================================//
//=================================================================//

function isEmpty(_obj) {
     return Object.keys(_obj).length === 0 /* && _obj.constructor === Object */ ;
}

function correctUhrzeit(_uhrzeit) {
    let temp = _uhrzeit.split(':');
    let temp2;
    if (parseInt(temp[1]) === 0) {
        temp2 = temp[0] + ':00'
    } else {
        temp2 = _uhrzeit;
    }
    return temp2
}

/* VERY DUMB TRY TO MAKE AN ARRAYLIST IN JS :|

class ArrayList {
    #array;
    length;

    constructor(_arr) {
        if(isEmpty(_arr)) {
            this.#array = [];
            console.log('this.#array = ' + JSON.stringify(this.#array));
            console.log(this.#array)
        } else {
            this.#array = _arr;
        }
        this.length = this.#array.length;
    }

    getItem(i) {
        return this.#array[i];
    }

    removeFirstItem() {
        let temp = this.#array;
        for(let i = 1; i < temp.length; i++) {
            this.#array[i-1] = temp[i];
        }
        this.length = this.#array.length
    }

    removeLastItem() {
        let temp = this.#array;

        for(let i = 0; i < temp.length - 1; i++) {
            this.#array[i] = temp[i];
        }
        this.length = this.#array.length;
    }

    removeFirstItems(count) {
        let temp = this.#array;
        for( let i = count; i < temp.length; i++) {
            this.#array[i-count] = temp[i];
        }
        this.length = this.#array.length;
    }

    removeLastItems(count) {
        let temp = this.#array;
        for(let i = 0; i < temp.length - count; i++) {
            this.#array[i] = temp[i];
        }
        this.length = this.#array.length;
    }

    appendItem(_item) {
        this.#array[this.#array.length] = _item;
        this.length = this.#array.length;
    }

    appendItems(_items) {
        for(let item in _items) {
            this.appendItem(item);
        }
    }

    prependItem(_item) {
        let temp = this.#array;
        this.#array[0] = _item;
        for (let i = 1; i <= temp.length; i++) {
            this.#array[i] = temp[i-1];
        }
        this.length = this.#array.length;
    }

    prependItems(_items) {
        let temp = this.#array;
        this.#array = [];
        for(let i = 0; i < _items.length; i++) {
            this.#array[i] = _items[i];
        }
        for(let i = _items.length; i < _items.length + temp.length; i++) {
            this.#array[i] = temp[i-_items.length];
        }
        this.length = this.#array.length;
    }
}

*/

//=================================================================//
//=== HEADER ======================================================//
//=================================================================//
/**
 * Class for managing user information like name and current balance
 * */
const user = {};

/**
 * Function for updating the users name the moment the page is loaded.
 * @param _user - user-object
 * @see user
 * */
function updateName (_user) {
    let nameTag = document.getElementById('player-name');
    nameTag.innerText = _user.name;
}

/**
 * Function for getting the current balance of the user and updating the user-object.
 * Should be called inside a setIntervall to assure continuous updates.
 * @param _user - user-object
 * @see user
 * */
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

/**
 * Function fetching the current user-data.
 * DO NOT OVERWRITE USER-OBJ. WITH THE OUTPUT OF THIS FUNCTION!
 * THE USER-OBJ. HAS MORE DATA STORED THAN HERE IS RETURNED.
 * ONLY COPY NEEDED DATA.
 * */
async function getUserData() {
    let response = await fetch('/api/benutzerdaten', {
        method: 'GET',
        headers: {'accept': 'application/json'}
    });

    if (response.ok) {
        return await response.json();
    }
}

/**
 * Function to be attached to the user class. Calculates the trade-earning for the current session.
 * Reloading the page or restarting the browser will reset the session and the percentage to 0.
 * */
function getPercent() {
    return Number(((this.balance / this.initBalance * 100) - 100).toFixed(2));
}

//=================================================================//
//=== STOCKS ======================================================//
//=================================================================//

/**
 * Constant storing the link to the svg-namespace.
 * */
const svgns = "http://www.w3.org/2000/svg";

/**
 * Stocks object used for managing the display-functionality of all the stock-graphs and information.
 * */
let stocks = {};

/**
 * Function fetching the current stocks-data.
 * DO NOT OVERWRITE STOCKS-OBJ. WITH THE OUTPUT OF THIS FUNCTION!
 * THE STOCKS-OBJ. HAS MORE DATA STORED THAN HERE IS RETURNED.
 * ONLY COPY NEEDED DATA.
 * */
async function getStocks() {
    let response = await fetch('/api/aktien', {
        method: 'GET',
        headers: {'accept': 'application/json'}
    });

    if (response.ok) {
        return await response.json();
    }
}

/**
 * Function adding a history-array to all the stocks available in stocks-obj.
 * @see stocks
 * */
function addHistoryArray() {
    if(stocks.length > 0) {
        for( let i = 0; i < stocks.length; i++) {
            stocks[i].history = []
        }
    }
}

/**
 * Function which gets the current stock-data and updates the stocks-obj.
 * @see stocks
 * @see getStocks
 * */
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


/**
 * Function to create the UI for one stock. Uses the global class stocks to get needed information.
 * @see stocks
 * @see svgns
 * @see tradeStock
 *
 * */
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
        let buy1k = document.createElement('p');
        let buy10k = document.createElement('p');
        let sell1k = document.createElement('p');
        let sell10k = document.createElement('p');

        sell1k.classList.add('button');
        sell1k.classList.add('sell1k');
        sell1k.innerText = '-1k';
        sell1k.addEventListener('click', async () => {
            let count = -1000;
            let response = await tradeStock(stocks[i].name, count);

            if(!isEmpty(response)) {
                portfolio.positionen[i].anzahl += count;
            }
        });

        sell10k.classList.add('button');
        sell10k.classList.add('sell10k');
        sell10k.innerText = '-10k';
        sell10k.addEventListener('click', async () => {
            let count = -10000;
            let response = await tradeStock(stocks[i].name, count);

            if(!isEmpty(response)) {
                portfolio.positionen[i].anzahl += count;
            }
        });

        buy1k.classList.add('button');
        buy1k.classList.add('buy1k');
        buy1k.innerText = '+1k';
        buy1k.addEventListener('click', async () => {
            let count = 1000;
            let response = await tradeStock(stocks[i].name, count);

            if(!isEmpty(response)) {
                portfolio.positionen[i].anzahl += count;
            }
        });

        buy10k.classList.add('button');
        buy10k.classList.add('buy10k');
        buy10k.innerText = '+10k';
        buy10k.addEventListener('click', async () => {
            let count = 10000;
            let response = await tradeStock(stocks[i].name, count);

            if(!isEmpty(response)) {
                portfolio.positionen[i].anzahl += count;
            }
        });

        buySell.classList.add('buy-sell');
        buySell.appendChild(sell10k);
        buySell.appendChild(sell1k);
        buySell.appendChild(buy1k);
        buySell.appendChild(buy10k);

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

/**
 * Function for updating the stock UIs. It updates the graph, the current price and the available stock-count.
 * @see stocks
 * */
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

        stockPrices[i].innerText = stocks[i].preis;
        stockCounts[i].innerText = stocks[i].anzahlVerfuegbar;
    }
}

/**
 * FOR BETTER UX (USER-EXPERIENCE)
 * Changes the stock-box' background color depending on the mean of the last 9 (plus current) price-values.
 * If the current price is less than the mean, background is set red. If it's more than the mean background is green.
 * Last but not least, background is grey again if the current price is equal to the mean.
 * @see stocks
 * */
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

/**
 * Simple function calculating the mean of a given array of integer type.
 * @param _arr - int array
 * @return int - the mean of the int-array
 * */
function average(_arr) {
    let num = 0;

    _arr.forEach(n => {
        num += n;
    });

    return num/_arr.length;
}

//=================================================================//
//=== PORTFOLIO ===================================================//
//=================================================================//

//===== BUY/SELL
/**
 * Function for buying/selling stocks.
 * @param _stockName - name of the stock
 * @param _count - number of stocks [positive number - buy amount | negative number - sell amount]
 * @returns response
 * */
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
        errors.arr.push('TRANSACTION: Invalid amount (' + _count + ') of stocks (' + _stockName + '). Transaction failed.');
        return {}
    }
}

//===== PORTFOLIO STOCKS
let portfolio = {}

/**
 * Function fetching the players current portfolio-data.
 * @return Object - player-portfolio
 * */
async function getPortfolio() {
    let response = await fetch('/api/depot', {
        method: 'GET',
        headers: {'accept': 'application/json'}
    });

    if (response.ok) {
        return await response.json();
    }
}

/**
 * Creates the UI for one position Element in the list of the currently open positions of the player
 * @param _i - Zählvariable, damit eindeutig ist um welche Aktie es sich handelt
 * @return HTMLElement - returns the ready to use HTML-Element
 * */
function createPositionUI (_i) {
    let position = document.createElement('div');
    let name = document.createElement('p');
    let sellAll = document.createElement('p');
    let count = document.createElement('p');
    let value = document.createElement('p');

    name.classList.add('position-name');
    name.innerText = portfolio.positionen[_i].aktie.name;

    sellAll.classList.add('emergency-sell');
    sellAll.innerText = 'SELL'
    sellAll.title = 'Click if you want to CLOSE WHOLE POSITION';
    sellAll.addEventListener('click', async () => {
        let count = 0 - portfolio.positionen[_i].anzahl;
        let response = await tradeStock(stocks[_i].name, count);

        if(!isEmpty(response)) {
            portfolio.positionen[_i].anzahl += count;
        }

        position.remove();
        clearInterval(updatePositionCount);
        clearInterval(updatePositionValue);
        portfolio.positionen[_i].hasUI = false;
    });

    count.classList.add('position-count');
    let updatePositionCount = setInterval(() => {
        if( portfolio.positionen[_i].anzahl === 0 ) {
            position.remove();
            clearInterval(updatePositionValue);
            clearInterval(updatePositionCount);
            portfolio.positionen[_i].hasUI = false;
        } else {
            count.innerText = portfolio.positionen[_i].anzahl;
        }
    }, 500);

    value.classList.add('position-value');
    let updatePositionValue = setInterval(() => {
        value.innerText = Math.floor(portfolio.positionen[_i].anzahl * stocks[_i].preis);
    }, 500);


    position.classList.add('position');
    position.title = 'An open position. Can be modified by buying or selling stocks.';
    position.appendChild(name);
    position.appendChild(sellAll);
    position.appendChild(count);
    position.appendChild(value);

    return position;
}

/**
 * Initializes the portfolio UI. Gets current Portfolio data from Server and creates Position-UIs if needed.
 * */
async function initPortfolioUI() {
    portfolio = await getPortfolio();
    let positions = document.getElementById('positions');

    for(let i = 0; i < portfolio.positionen.length; i++) {
        if(portfolio.positionen[i].anzahl > 0) {
            positions.appendChild(createPositionUI(i));
            portfolio.positionen[i].hasUI = true;
        } else {
            portfolio.positionen[i].hasUI = false;
        }
    }

    document.getElementById('portfolio-value').innerText = portfolio.wert;
}

/**
 * Updates the portfolio UI. If a position currently does not have any UI, this function creates it.
 * Furthermore, it updates the Portfolio value UI-Element.
 * */
function updatePortfolioUI() {
    document.getElementById('portfolio-value').innerText = Math.floor(portfolio.value);

    let positions = document.getElementById('positions');

    for(let i = 0; i < portfolio.positionen.length; i++) {
        if(portfolio.positionen[i].anzahl > 0 && portfolio.positionen[i].hasUI !== true) {
            positions.appendChild(createPositionUI(i));
            portfolio.positionen[i].hasUI = true;
        }
    }
}

/**
 * Should be executed after updating the stocks-obj. because the update of the portfolio
 * is done with client-side calculation to reduce get/post-requests to the server.
 * Currently, updates only portfolio value, the count of stocks in each position is manipulated by
 * buying or selling stocks.
 * */
function updatePortfolio() {
    portfolio.value = 0;

    for(let i = 0; i < portfolio.positionen.length; i++) {
        if(portfolio.positionen[i].anzahl > 0) {
            portfolio.value += portfolio.positionen[i].anzahl * stocks[i].preis;
        }
    }
}

//=================================================================//
//=== RANKING =====================================================//
//=================================================================//

/**
 * Function for getting the Portfolio values and according player names of everyone.
 * */
async function getPortfolioAll() {
    let response = await fetch('/api/depotAlle', {
        method: 'GET',
        headers: {'accept': 'application/json'}
    });

    if (response.ok) {
        return await response.json();
    }
}

/**
 * Function creating the ranking UI. Caution: The prerequisite for guaranteeing functionality
 * is that the number of players does not change without a server restart.
 * */
function createRankingUI(sortedRanking) {
    let ranking = document.getElementById('ranking-list');

    for (let i = 0; i < sortedRanking.length; i++) {
        let player = document.createElement('div');
        let name = document.createElement('h4');
        let money = document.createElement('p');

        name.innerText = sortedRanking[i].name;
        money.innerText = sortedRanking[i].summe;

        player.appendChild(name);
        player.appendChild(money);
        player.classList.add('rank');

        (i === 0) ? player.classList.add('firstRank') :
            (i === 1) ? player.classList.add('secondRank') :
                (i === 2) ? player.classList.add('thirdRank') :
                    player.classList.add('otherRank');

        ranking.appendChild(player);
    }
}

/**
 * An updater for the ranking UI. It updates the positions of the players according their wealth.
 * */
function updateRankingUI(sortedRanking) {
    let ranking = document.getElementsByClassName('rank');

    for( let i = 0; i < ranking.length; i++) {
        ranking[i].firstChild.innerText = sortedRanking[i].name;
        ranking[i].lastChild.innerText = sortedRanking[i].summe;
    }
}

//=================================================================//
//=== NEWS ========================================================//
//=================================================================//

let news = {};

/**
 * Function for getting News from the server. News are about players buying/selling stocks and
 * the amounts of stocks in those trades.
 * @param _timeStamp - time in milliseconds (1 gets all news from the server)
 * */
async function getNews(_timeStamp) {
    let response = await fetch('/api/nachrichten?letzteZeit=' + _timeStamp, {
        method: 'GET',
        headers: {'accept': 'application/json'}
    });

    if (response.ok) {
        return await response.json();
    }
}

/**
 * function for updating the news-Object used to manage the last X (news.maxNews) news.
 * Older news get removed to not fill the DOM too much.
 * */
async function updateNews() {
    // get newest news
    let temp = await getNews(news.latestTimeStamp);

    // if no new news could be fetched, set updated to false
    // background: If the array got updated, the UI will get updated too, if not none will be updated.
    //             this way, we get fewer DOM-manipulations which usually cost quite much processing power.
    if (temp.length !== 0) {
        news.updated = true

        // add all new Items to the news array
        for (let item of temp) {
            news.arr.push(item);
        }

        // remove all elements exceeding the max amount
        while(news.arr.length > news.maxNews) {
            news.arr.shift();
        }

        // if the news array has any items update the latest timestamp to the one of the last item in the list
        if (news.arr.length - 1 >= 0) {
            news.latestTimeStamp = news.arr[news.arr.length - 1].zeit;
        }
    } else {
        news.updated = false
    }
}

/**
 * Function creating the UI for each news.
 * @param _newsData - data used to fill the created UI
 * */
function createNewsUI(_newsData) {
    let newsList = document.getElementById('news-list');
    let newsBlock = document.createElement('div');
    let time = document.createElement('p');
    let message = document.createElement('p');

    time.classList.add('news-time');
    time.innerText = correctUhrzeit(_newsData.uhrzeit);

    message.classList.add('news-message');
    message.innerText = _newsData.text;

    newsBlock.classList.add('news');
    newsBlock.appendChild(time);
    newsBlock.appendChild(message);

    newsList.prepend(newsBlock);
}

/**
 * Updates a given UI-Element with new Data
 * */
function updateNewsUI(_newsElement, _newsData) {
    _newsElement.firstChild.innerText = correctUhrzeit(_newsData.uhrzeit);
    _newsElement.lastChild.innerText = _newsData.text;
}

/**
 * Mini function. Adds a linebreak between the type of transaction + player-name and amount of stocks + stocks name.
 * @param _text - message of the news
 * @return String - adapted message
 * */
function adaptNewsMessage(_text) {
    let temp = _text.split(': ');
    return temp[0] + ': ' + temp[1] + '\n' + temp[2];
}

/**
 * Manager for handling news. If the list of news is shorter than the max, it adds new UI-Elements. If max news UI-Elements count
 * is reached, the existing Elements get updated instead of deleted and recreated
 * */
// Sounded nice on paper, but now I'm not sure if it is really that much more efficient than creating new UI-Elements
// and then deleting the oldest ones, which are above the limit...
function newsManager() {
    if(news.updated) {
        // get the list of news we currently have displayed
        // IMPORTANT
        let list = document.getElementsByClassName('news');

        for( let i = 0; i < news.arr.length; i++) {
            // editing the news message
            news.arr[i].text = adaptNewsMessage(news.arr[i].text);

            // if we don't have more news than news-DOM-Elements already exist, we create a new DOM-Element with
            // the needed information. Otherwise, we just change the content of what we already have.
            if( i >= list.length) {
                createNewsUI(news.arr[i]);
            } else {
                updateNewsUI(list[list.length - (i+1)], news.arr[i]);
            }
        }
    }
}

//=================================================================//
//=== ERROR =======================================================//
//=================================================================//

let errors = {}

/**
 * Function for creating an error UI-Element and filling it with the given message.
 * @param _errorData - String containing the error-data
 * */
function createErrorUI(_errorData) {
    let errorLog = document.getElementById('error-log');
    let errorBlock = document.createElement('div');
    let errorMessage = document.createElement('p');

    errorMessage.classList.add('error-message');
    errorMessage.innerText = _errorData;

    errorBlock.classList.add('errors');
    errorBlock.classList.add('red-error')
    errorBlock.appendChild(errorMessage);

    errorLog.prepend(errorBlock);


    setTimeout(() => {
        errorBlock.classList.remove('red-error');
    }, 500);
}

/**
 * Updates the given UI-Element with the given error-data
 * @param _errorElement - DOMElement to get new text
 * @param _errorData - String containing the error-data
 * */
function updateErrorUI(_errorElement, _errorData) {
    _errorElement.firstChild.innerText = _errorData;
}

/**
 * Manager for handling errors. If the list of errors is shorter than the max, it adds new UI-Elements. If max error UI-Elements count
 * is reached, the existing Elements get updated instead of deleted and recreated
 * */
// Same issue as above... sounded nice on paper, but now I'm not sure if it is really that much more efficient than creating new UI-Elements
// and then deleting the oldest ones, which are above the limit...
function errorManager() {
    if(errors.arr.length > errors.maxErrors || errors.arr.length > errors.lastLength) {
        // if more than max allowed errors, remove the oldest errors
        while (errors.arr.length > errors.maxErrors) {
            errors.arr.shift();
        }

        // get the list of errors we currently have displayed
        let list = document.getElementsByClassName('errors');

        for( let i = 0; i < errors.arr.length; i++) {
            // if we don't have more errors than error-DOM-Elements already exist, we create a new DOM-Element with
            // the needed information. Otherwise, we just change the content of what we already have.
            if( i >= list.length) {
                createErrorUI(errors.arr[i]);
            } else {
                if(i === errors.arr.length - 1) {
                    // the effect is unfortunately not the same, compared to creating a new Element
                    // beacause now it not only fades out but fades in and then out...
                    list[list.length - (i+1)].classList.add('red-error');
                    setTimeout(() => {
                        list[list.length - (i+1)].classList.remove('red-error');
                    }, 600);
                }
                updateErrorUI(list[list.length - (i+1)], errors.arr[i]);
            }
        }
        errors.lastLength = errors.arr.length;
    }
}

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

    // PORTFOLIO
    await initPortfolioUI();

    // RANKING
    let ranking = await getPortfolioAll();
    ranking.sort((player1, player2) => {
        return (player1.summe < player2.summe) ? 1 : (player1.summe > player2.summe) ? -1 : 0;
    });
    createRankingUI(ranking);

    // NEWS
    news.arr = [];
    news.latestTimeStamp = 1;
    news.maxNews = 20;
    news.updated = false;

    // ERROR-LOG
    errors.arr = [];
    errors.lastLength = errors.arr.length;
    errors.maxErrors = 10;

    let updater = setInterval(async () => {
        try {
            await updateBalance(user);

            await updateStocks();
            updateStocksUI();
            highlightStocks();

            updatePortfolio();
            updatePortfolioUI();

            let ranking = await getPortfolioAll();
            ranking.sort((player1, player2) => {
                return (player1.summe < player2.summe) ? 1 : (player1.summe > player2.summe) ? -1 : 0;
            });
            updateRankingUI(ranking);

            await updateNews();
            newsManager();
        } catch (error) {
            if(errors.arr[errors.arr.length-1] !== 'SERVER ERROR: Connection could not be established') {
                errors.arr.push('SERVER ERROR: Connection could not be established');
            }
        }
        errorManager();
    }, 500);
}