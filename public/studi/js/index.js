'use strict';

//=================================================================//
//=== UTIL ========================================================//
//=================================================================//

function isEmpty(_obj) {
	return 0 === Object.keys(_obj).length;
}

function correctUhrzeit(_uhrzeit) {
	let temp = _uhrzeit.split(':');
	let temp2;
	if (parseInt(temp[1]) === 0) {
		temp2 = temp[0] + ':00';
	} else {
		temp2 = _uhrzeit;
	}
	return temp2;
}

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
function updateName(_user) {
	let nameTag = document.getElementById('player-name');
	nameTag.innerText = _user.name;
}

/**
 * Function for getting the current balance of the user and updating the user-object.
 * Should be called inside a setIntervall to assure continuous updates.
 * @param _user - user-object
 * @see user
 * */
async function updateBalance(_user) {
	let data = await getUserData();

	_user.balance = data.kontostand;

	let balanceTag = document.getElementById('balance');
	balanceTag.innerText = _user.balance + '€';

	let percent = document.getElementById('percent');
	if (_user.getPercent() >= 0) {
		percent.innerText = '+' + _user.getPercent() + '%';
	} else {
		percent.innerText = _user.getPercent() + '%';
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
		headers: {'accept': 'application/json'},
	});

	if (response.ok) {
		return await response.json();
	}
}

//=================================================================//
//=== STOCKS ======================================================//
//=================================================================//

/**
 * Constant storing the link to the svg-namespace.
 * */
const svgns = 'http://www.w3.org/2000/svg';

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
		headers: {'accept': 'application/json'},
	});

	if (response.ok) {
		return await response.json();
	}
}

/**
 * Function adding a history-array to all the stocks available in stocks-obj.
 * @see stocks
 * */
function addAttributes() {
	if (stocks.length > 0) {
		for (let i = 0; i < stocks.length; i++) {
			stocks[i].history = [];
			stocks[i].red = false;
			stocks[i].green = false;
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
	for (let i = 0; i < stocks.length; i++) {
		stocks[i].preis = temp[i].preis;
		stocks[i].history.push(stocks[i].preis);
		if (stocks[i].history.length > 10) {
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
		let buySell = document.createElement('div');

		let createTransactionButton = (_classArr, _text, _stockCount) => {
			let button = document.createElement('p');
			for (let className of _classArr) {
				button.classList.add(className);
			}
			button.innerText = _text;
			button.addEventListener('click', async () => {
				let response = await tradeStock(stocks[i].name, _stockCount);

				if (!isEmpty(response)) {
					portfolio.positionen[i].anzahl += _stockCount;
				}
			});
			return button;
		};

		buySell.classList.add('buy-sell');
		buySell.appendChild(createTransactionButton(['button', 'sell10k'], '-10k', -10000));
		buySell.appendChild(createTransactionButton(['button', 'sell1k'], '-1k', -1000));
		buySell.appendChild(createTransactionButton(['button', 'buy1k'], '+1k', 1000));
		buySell.appendChild(createTransactionButton(['button', 'buy10k'], '+10k', 10000));

		polyline.classList.add('polyline-graph');

		svg.classList.add('stock-chart');
		svg.setAttribute('viewBox', '0 0 3000 1500');
		svg.role = 'img';
		svg.appendChild(polyline);

		let createStockInfoElements = (_classArr, _text, _title) => {
			let element = document.createElement('p');
			for (let className of _classArr) {
				element.classList.add(className);
			}
			element.innerText = _text;
			if (_title) {
				element.title = _title;
			}
			return element;
		};

		stock.classList.add('stock');
		stock.appendChild(svg);
		stock.appendChild(createStockInfoElements(['stock-name'], stocks[i].name));
		stock.appendChild(createStockInfoElements(['stock-price'], stocks[i].preis, 'Current stock-price'));
		stock.appendChild(createStockInfoElements(['stock-count'], stocks[i].anzahlVerfuegbar, 'Stocks available currently'));
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

		for (let j = 0; j < 10; j++) {
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

	for (let i = 0; i < stocks.length; i++) {
		let tempHistory = [...stocks[i].history];
		tempHistory.pop();

		switch (true) {
			case (stocks[i].history[stocks[i].history.length - 1] > average(tempHistory) && stocks[i].history[9] !== 1):
				stockUIs[i].classList.add('stock-hl-green');
				stocks[i].green = true;
				if (stocks[i].red) {
					stockUIs[i].classList.remove('stock-hl-red');
					stocks[i].red = false;
				}
				break;
			case (stocks[i].history[stocks[i].history.length - 1] < average(tempHistory) && stocks[i].history[9] !== 1):
				stockUIs[i].classList.add('stock-hl-red');
				stocks[i].red = true;
				if (stocks[i].green) {
					stockUIs[i].classList.remove('stock-hl-green');
					stocks[i].green = false;
				}
				break;
			default:
				if (stocks[i].green) {
					stockUIs[i].classList.remove('stock-hl-green');
					stocks[i].green = false;
				} else if (stocks[i].red) {
					stockUIs[i].classList.remove('stock-hl-red');
					stocks[i].red = false;
				}
				break;
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

	return num / _arr.length;
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
			'accept': 'application/json',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			'aktie': {
				'name': _stockName,
			},
			'anzahl': _count,
		}),
	});

	if (response.ok) {
		let data = await response.json();
		transactionManager.push(data);
		return data;
	} else {
		errorManager.push('TRANSACTION: Invalid amount (' + _count + ') of stocks (' + _stockName + '). Transaction failed.');
		return {};
	}
}

//===== PORTFOLIO STOCKS
let portfolio = {};

/**
 * Function fetching the players current portfolio-data.
 * @return Object - player-portfolio
 * */
async function getPortfolio() {
	let response = await fetch('/api/depot', {
		method: 'GET',
		headers: {'accept': 'application/json'},
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
function createPositionUI(_i) {
	let position = document.createElement('div');
	let name = document.createElement('p');
	let sellAll = document.createElement('p');
	let count = document.createElement('p');
	let value = document.createElement('p');

	name.classList.add('position-name');
	name.innerText = portfolio.positionen[_i].aktie.name;

	sellAll.classList.add('emergency-sell');
	sellAll.innerText = 'SELL';
	sellAll.title = 'Click if you want to CLOSE WHOLE POSITION';
	sellAll.addEventListener('click', async () => {
		let count = 0 - portfolio.positionen[_i].anzahl;
		let response = await tradeStock(stocks[_i].name, count);

		if (!isEmpty(response)) {
			portfolio.positionen[_i].anzahl += count;
		}

		position.remove();
		clearInterval(updatePositionCount);
		clearInterval(updatePositionValue);
		portfolio.positionen[_i].hasUI = false;
	});

	count.classList.add('position-count');
	let updatePositionCount = setInterval(() => {
		if (portfolio.positionen[_i].anzahl === 0) {
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

	for (let i = 0; i < portfolio.positionen.length; i++) {
		if (portfolio.positionen[i].anzahl > 0) {
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

	for (let i = 0; i < portfolio.positionen.length; i++) {
		if (portfolio.positionen[i].anzahl > 0 && portfolio.positionen[i].hasUI !== true) {
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

	for (let i = 0; i < portfolio.positionen.length; i++) {
		if (portfolio.positionen[i].anzahl > 0) {
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
		headers: {'accept': 'application/json'},
	});

	if (response.ok) {
		return await response.json();
	}
}

/**
 * Function creating the ranking UI. Caution: The prerequisite for guaranteeing functionality
 * is that the number of players does not change without a server restart.
 * */
function createRankingUI(_sortedRanking) {
	let ranking = document.getElementById('ranking-list');

	for (let i = 0; i < _sortedRanking.length; i++) {
		let player = document.createElement('div');
		let name = document.createElement('h4');
		let money = document.createElement('p');

		name.innerText = _sortedRanking[i].name;
		money.innerText = _sortedRanking[i].summe;

		player.appendChild(name);
		player.appendChild(money);
		player.classList.add('rank');

		switch (i) {
			case 0:
				player.classList.add('firstRank');
				break;
			case 1:
				player.classList.add('secondRank');
				break;
			case 2:
				player.classList.add('thirdRank');
				break;
			default:
				player.classList.add('otherRank');
				break;
		}

		ranking.appendChild(player);
	}
}

/**
 * An updater for the ranking UI. It updates the positions of the players according their wealth.
 * */
function updateRankingUI(_sortedRanking) {
	let ranking = document.getElementsByClassName('rank');

	for (let i = 0; i < ranking.length; i++) {
		ranking[i].firstChild.innerText = _sortedRanking[i].name;
		ranking[i].lastChild.innerText = _sortedRanking[i].summe;
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
		headers: {'accept': 'application/json'},
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
	// get the newest news
	let temp = await getNews(news.latestTimeStamp);

	// if no new news could be fetched, set updated to false
	// background: If the array got updated, the UI will get updated too, if not none will be updated.
	//             this way, we get fewer DOM-manipulations which usually cost quite much processing power.
	if (temp.length === 0) {
		news.updated = false;
	} else {
		news.updated = true;

		// add all new Items to the news array
		for (let item of temp) {
			news.arr.push(item);
		}

		// remove all elements exceeding the max amount
		while (news.arr.length > news.maxNews) {
			news.arr.shift();
		}

		// if the news array has any items update the latest timestamp to the one of the last item in the list
		if (news.arr.length - 1 >= 0) {
			news.latestTimeStamp = news.arr[news.arr.length - 1].zeit;
		}
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
	if (temp.length === 3) {
		return temp[0] + ': ' + temp[1] + '\n' + temp[2];
	} else if (temp.length === 2) {
		return temp[0] + ': ' + temp[1];
	}
}

/**
 * Manager for handling news. If the list of news is shorter than the max, it adds new UI-Elements. If max news
 * UI-Elements count is reached, the existing Elements get updated instead of deleted and recreated
 * */
// Sounded nice on paper, but now I'm not sure if it is really that much more efficient than creating new UI-Elements
// and then deleting the oldest ones, which are above the limit...
function newsManager() {
	if (news.updated) {
		// get the list of news we currently have displayed
		// IMPORTANT
		let list = document.getElementsByClassName('news');

		for (let i = 0; i < news.arr.length; i++) {
			// editing the news message
			news.arr[i].text = adaptNewsMessage(news.arr[i].text);

			// if we don't have more news than news-DOM-Elements already exist, we create a new DOM-Element with
			// the needed information. Otherwise, we just change the content of what we already have.
			if (i >= list.length) {
				createNewsUI(news.arr[i]);
			} else {
				updateNewsUI(list[list.length - (i + 1)], news.arr[i]);
			}
		}
	}
}

//=================================================================//
//=== ERROR =======================================================//
//=================================================================//
class ErrorManager {
	errors;
	maxErrors;

	constructor(_maxErrors) {
		this.errors = [];
		this.maxErrors = _maxErrors + 1; // for correct calculations
	}

	push(_errorMessage) {
		this.errors.push(_errorMessage);

		while (this.errors.length > this.maxErrors) {
			this.errors.shift();
		}

		this.updateErrorsList();
	}

	buildErrorDOM(_message) {
		let element = document.createElement('div');
		let message = document.createElement('p');

		message.classList.add('error-message');
		message.innerText = _message;

		element.classList.add('errors');
		element.classList.add('red-error');
		element.appendChild(message);

		document.getElementById('error-list').prepend(element);

		setTimeout(() => {
			element.classList.remove('red-error');
		}, 500);
	}

	updateErrorsList() {
		if (this.errors.length < this.maxErrors) {
			this.buildErrorDOM(this.errors[this.errors.length - 1]);
		} else {
			this.buildErrorDOM(this.errors[this.errors.length - 1]);
			document.getElementById('error-list').lastChild.remove();
		}
	}
}

let errorManager = new ErrorManager(5);

//=================================================================//
//=== TRANSACTIONS ================================================//
//=================================================================//

class TransactionManager {
	transactions;
	maxTransactions;

	constructor(_maxTransactions) {
		this.transactions = [];
		this.maxTransactions = _maxTransactions + 1; // for correct calculations
	}

	push(_transaction) {
		this.transactions.push(_transaction);

		while (this.transactions.length > this.maxTransactions) {
			this.transactions.shift();
		}

		this.updateTransactionList();
	}

	buildTransactionDOM(_i) {
		let element = document.createElement('div');

		let createSubElement = (_classArr, _text) => {
			// create HTML-Element
			let subElement = document.createElement('p');
			// apply classes
			for (let className of _classArr) {
				subElement.classList.add(className);
			}
			// apply text
			subElement.innerText = _text;
			return subElement;
		};

		element.classList.add('transactions');
		element.appendChild(createSubElement(
			['transaction-message'],
			this.transactions[_i].success,
		));
		element.appendChild(createSubElement(
			['transaction-value'],
			'Umsatz: ' + Math.floor((-1 * this.transactions[_i].umsatz.anzahl) * this.transactions[_i].umsatz.aktie.preis),
		));

		document.getElementById('transaction-list').prepend(element);
	}

	updateTransactionList() {
		if (this.transactions.length < this.maxTransactions) {
			this.buildTransactionDOM(this.transactions.length - 1);
		} else {
			this.buildTransactionDOM(this.transactions.length - 1);
			document.getElementById('transaction-list').lastChild.remove();
		}
	}
}

let transactionManager = new TransactionManager(10);

//=================================================================//
//=== INIT ========================================================//
//=================================================================//

window.onload = async () => {
	// HEADER
	let temp = await getUserData();
	user.name = temp.name;
	user.balance = temp.kontostand;
	user.initBalance = user.balance;
	user.getPercent = () => {
		return Number(((this.balance / this.initBalance * 100) - 100).toFixed(2));
	};

	await updateBalance(user);
	updateName(user);

	// STOCKS
	stocks = await getStocks();

	addAttributes();
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

	setInterval(async () => {
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
		} catch (ignored) {
			if (errorManager.errors[errorManager.errors.length - 1] !== 'SERVER ERROR: Connection could not be established') {
				errorManager.push('SERVER ERROR: Connection could not be established');
			}
		}
	}, 500);
};