'use strict';

//=================================================================//
//=== UTIL ))======================================================//
//=================================================================//

class Util {
	static correctTime(_time) {
		let temp = _time.split(':');
		let temp2;
		if (parseInt(temp[1]) === 0) {
			temp2 = temp[0] + ':00';
		} else {
			temp2 = _time;
		}
		return temp2;
	}
}

//=================================================================//
//=== HEADER ======================================================//
//=================================================================//

class BalanceManager {
	#username;
	#currentBalance;
	#initBalance;
	#errorManager;

	constructor(_errorManager) {
		this.#errorManager = _errorManager;
	}

	/**
	 * short initial function for displaying the users name and current balance (and percent).
	 * */
	async init() {
		try {
			let data = await this.#fetchUserData();
			this.#username = data.name;
			this.#initBalance = data.kontostand;
			this.#currentBalance = data.kontostand;
		} catch (error) {
			this.#errorManager.push(error.message);
			this.#username = '';
			this.#initBalance = 0;
			this.#currentBalance = 0;
		}

		document.getElementById('player-name').innerText = this.#username;
		await this.updateBalance();
	}

	/**
	 * Function for getting the current balance of the user and updating the available data..
	 * Should be called inside a setIntervall to assure continuous updates. TODO: add this line to all repeatable
	 * functions
	 * */
	async updateBalance() {
		try {
			let data = await this.#fetchUserData();
			this.#currentBalance = data.kontostand;
		} catch (error) {
			this.#errorManager.push(error.message);
		}

		let balanceTag = document.getElementById('balance');
		balanceTag.innerText = Math.floor(this.#currentBalance) + '€';

		let percent = document.getElementById('percent');
		if (this.#getPercent() >= 0) {
			percent.innerText = '+' + this.#getPercent() + '%';
		} else {
			percent.innerText = this.#getPercent() + '%';
		}
	}

	/**
	 * Simple function to get the percent (+/-) since Session start for the user.
	 * */
	#getPercent() {
		return Number((((this.#currentBalance - this.#initBalance) * 100) / this.#initBalance).toFixed(2));
	}

	/**
	 * Function fetching the current user-data.
	 * @returns Object - Object containing stock-data
	 * @throws Error - error with code
	 * */
	async #fetchUserData() {
		let response = await fetch('/api/benutzerdaten', {
			method: 'GET',
			headers: {'accept': 'application/json'},
		});

		if (response.ok) {
			return await response.json();
		} else {
			throw new Error(`ERROR: Status: ${response.status}`);
		}
	}
}

//=================================================================//
//=== STOCKS ======================================================//
//=================================================================//

class StocksManager {
	#stocks;
	#maxHistory;
	#svgns;
	#svgViewBoxHeight;
	#errorManager;

	constructor(_errorManager, _maxHistory, _svgHeight) {
		this.#errorManager = _errorManager;
		this.#stocks = [];
		this.#maxHistory = _maxHistory;
		this.#svgViewBoxHeight = _svgHeight;
		this.#svgns = 'http://www.w3.org/2000/svg';
	}

	async init() {
		try {
			this.#stocks = await this.#fetchStocks();
			this.#addAttributes();
		} catch (error) {
			this.#errorManager.push(error.message);
		}
	}

	/**
	 * Simple getter for the private #stocks-attribute
	 * */
	getStocks() {
		return this.#stocks;
	}

	/**
	 * Function adding a history-array to all the stocks available in the private #stocks-Array.
	 * */
	#addAttributes() {
		if (this.#stocks.length > 0) {
			for (let i = 0; i < this.#stocks.length; i++) {
				this.#stocks[i].history = [];
				this.#stocks[i].green = false;
				this.#stocks[i].red = false;
			}
		}
	}

	/**
	 * Function fetching the current stocks-data.
	 * @returns Object - Object containing stock-data
	 * @throws Error - error with code
	 * */
	async #fetchStocks() {
		let response = await fetch('/api/aktien', {
			method: 'GET',
			headers: {'accept': 'application/json'},
		});

		if (response.ok) {
			return await response.json();
		} else {
			throw new Error(`ERROR: Status: ${response.status}`);
		}
	}

	/**
	 * Function which gets the current stock-data and updates the stocks-obj.
	 * */
	async updateStocks() {
		let temp = await this.#fetchStocks();
		// es wird angenommen, dass während dem Spiel keine weiteren Aktien hinzugefügt werden [!!!]
		for (let i = 0; i < this.#stocks.length; i++) {
			this.#stocks[i].preis = temp[i].preis;
			this.#stocks[i].history.push(temp[i].preis);
			if (this.#stocks[i].history.length > this.#maxHistory) {
				this.#stocks[i].history.shift();
			}
			this.#stocks[i].anzahlVerfuegbar = temp[i].anzahlVerfuegbar;
		}
	}

	/**
	 * Function to create the UI for all stocks.
	 * */
	createStocksUI(_portfolioManager, _transactionManager, _stocks) {
		let stocksUI = document.getElementById('stocks');

		for (let i = 0; i < this.#stocks.length; i++) {
			let stock = document.createElement('div');
			let svg = document.createElementNS(this.#svgns, 'svg');
			let polyline = document.createElementNS(this.#svgns, 'polyline');
			let buySell = document.createElement('div');

			let createTransactionButton = (_classArr, _text, _stockCount) => {
				let button = document.createElement('p');
				for (let className of _classArr) {
					button.classList.add(className);
				}
				button.innerText = _text;
				button.addEventListener('click', async () => {
					let response = await _transactionManager.push(this.#stocks[i].name, _stockCount);

					if (response) {
						_portfolioManager.setPosition(i, _stockCount, _stocks);
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
			svg.setAttribute('viewBox', `0 0 ${this.#svgViewBoxHeight * 2} ${this.#svgViewBoxHeight}`);
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
			stock.appendChild(createStockInfoElements(['stock-name'], this.#stocks[i].name));
			stock.appendChild(createStockInfoElements(['stock-price'], this.#stocks[i].preis, 'Current stock-price'));
			stock.appendChild(createStockInfoElements(['stock-count'], this.#stocks[i].anzahlVerfuegbar, 'Stocks available currently'));
			stock.appendChild(buySell);

			stocksUI.appendChild(stock);
		}
	}

	/**
	 * Function for updating the stock UIs. It updates the graph, the current price and the available stock-count.
	 * */
	updateStocksUI() {
		let stockCharts = document.getElementsByClassName('stock-chart');
		let stockPrices = document.getElementsByClassName('stock-price');
		let stockCounts = document.getElementsByClassName('stock-count');

		for (let i = 0; i < this.#stocks.length; i++) {
			let polyline = stockCharts[i].firstChild;
			let points = '';
			let svgViewBoxWidth = 2 * this.#svgViewBoxHeight;

			for (let j = 0; j < this.#maxHistory; j++) {
				if (!isNaN(this.#stocks[i].history[j])) {
					points +=
						(j * (svgViewBoxWidth / this.#maxHistory)) +
						',' +
						(this.#svgViewBoxHeight - (this.#svgViewBoxHeight / 100) - Math.round(this.#stocks[i].history[j])) +
						' ';
				}
			}

			polyline.setAttribute('points', points);

			stockPrices[i].innerText = this.#stocks[i].preis;
			stockCounts[i].innerText = this.#stocks[i].anzahlVerfuegbar;
		}
	}

	/**
	 * FOR BETTER UX (USER-EXPERIENCE)
	 * Changes the stock-box' background color depending on the mean of the last 9 (plus current) price-values.
	 * If the current price is less than the mean, background is set red. If it's more than the mean background is
	 * green. Last but not least, background is grey again if the current price is equal to the mean.
	 * */
	highlightStocks() {
		let stockUIs = document.getElementsByClassName('stock');

		for (let i = 0; i < this.#stocks.length; i++) {
			let tempHistory = [...this.#stocks[i].history];
			tempHistory.pop();

			if (this.#stocks[i].history[this.#stocks[i].history.length - 1] > this.#average(tempHistory) && this.#stocks[i].history[this.#stocks[i].history.length - 1] !== 1) {
				stockUIs[i].classList.add('stock-hl-green');
				this.#stocks[i].green = true;
				if (this.#stocks[i].red) {
					stockUIs[i].classList.remove('stock-hl-red');
					this.#stocks[i].red = false;
				}
			} else if (this.#stocks[i].history[this.#stocks[i].history.length - 1] < this.#average(tempHistory) && this.#stocks[i].history[this.#stocks[i].history.length - 1] !== 1) {
				stockUIs[i].classList.add('stock-hl-red');
				this.#stocks[i].red = true;
				if (this.#stocks[i].green) {
					stockUIs[i].classList.remove('stock-hl-green');
					this.#stocks[i].green = false;
				}
			} else {
				if (this.#stocks[i].green) {
					stockUIs[i].classList.remove('stock-hl-green');
					this.#stocks[i].green = false;
				} else if (this.#stocks[i].red) {
					stockUIs[i].classList.remove('stock-hl-red');
					this.#stocks[i].red = false;
				}
			}
		}
	}

	/**
	 * Simple function calculating the mean of a given array of integer type.
	 * @param _arr - int array
	 * @return int - the mean of the int-array
	 * */
	#average(_arr) {
		let num = 0;

		_arr.forEach(n => {
			num += n;
		});

		return num / _arr.length;
	}
}

//=================================================================//
//=== PORTFOLIO ===================================================//
//=================================================================//

class PortfolioManager {
	#positionen;
	#wert;
	#transactionManager;
	#errorManager;

	constructor(_errorManager, _transactionManager) {
		this.#positionen = [];
		this.#wert = 0;
		this.#errorManager = _errorManager;
		this.#transactionManager = _transactionManager;
	}

	async init() {
		try {
			let data = await this.#fetchPortfolio();
			this.#positionen = data.positionen;
			this.#wert = data.wert;
		} catch (error) {
			this.#errorManager.push(error.message);
		}
	}

	/**
	 * Method fetching the players current portfolio-data.
	 * @return Object - player-portfolio
	 * @throws Error - error with code
	 * */
	async #fetchPortfolio() {
		let response = await fetch('/api/depot', {
			method: 'GET',
			headers: {'accept': 'application/json'},
		});

		if (response.ok) {
			return await response.json();
		} else {
			throw new Error(`ERROR: Status: ${response.status}`);
		}
	}

	/**
	 * Method for initializing the Portfolio UI.
	 * @param _stocks - array of stocks with current stock-data
	 * @return void
	 * */
	initPortfolioUI(_stocks) {
		let positions = document.getElementById('positions');
		for (let i = 0; i < this.#positionen.length; i++) {
			if (this.#positionen[i].anzahl > 0) {
				positions.appendChild(this.#createPositionUI(i, _stocks));
				this.#positionen[i].hasUI = true;
			} else {
				this.#positionen[i].hasUI = false;
			}
		}
		document.getElementById('portfolio-value').innerText = this.#wert;
	}

	/**
	 * Creates the UI for one position Element in the list of the currently open positions of the player
	 * @param _i - Index, damit eindeutig ist um welche Aktie es sich handelt
	 * @param _stocks - array of stocks with current stock-data
	 * @return Element - returns the ready to use HTML-Element
	 * */
	#createPositionUI(_i, _stocks) {
		let position = document.createElement('div');
		let name = document.createElement('p');
		let sellAll = document.createElement('p');
		let count = document.createElement('p');
		let value = document.createElement('p');

		let closePosition = () => {
			position.remove();
			clearInterval(updatePositionCount);
			clearInterval(updatePositionValue);
			this.#positionen[_i].hasUI = false;
		};

		// name
		name.classList.add('position-name');
		name.innerText = this.#positionen[_i].aktie.name;

		// emergency-sell button
		sellAll.classList.add('emergency-sell');
		sellAll.innerText = 'SELL';
		sellAll.title = 'Click if you want to CLOSE WHOLE POSITION.';
		sellAll.addEventListener('click', async () => {
			let count = 0 - this.#positionen[_i].anzahl;
			let response = await this.#transactionManager.push(this.#positionen[_i].aktie.name, count);

			if (response) {
				closePosition();
				this.#positionen[_i].anzahl += count;
			}
		});

		// stock-count in given position
		count.classList.add('position-count');
		let updatePositionCount = setInterval(() => {
			if (this.#positionen[_i].anzahl === 0) {
				closePosition();
			} else {
				count.innerText = this.#positionen[_i].anzahl;
			}
		}, 500);

		// stock-value in given position
		value.classList.add('position-value');
		let updatePositionValue = setInterval(() => {
			value.innerText = Math.floor(this.#positionen[_i].anzahl * _stocks[_i].preis);
		}, 500);

		position.classList.add('position');
		position.title = 'An open position. Can be modified by buying or selling stocks.';
		position.appendChild(name);
		position.appendChild(sellAll);
		position.appendChild(count);
		position.appendChild(value);

		return position;
	}

	updatePortfolio(_stocks) {
		this.#wert = 0;

		for (let i = 0; i < this.#positionen.length; i++) {
			if (this.#positionen[i].anzahl > 0) {
				this.#wert += this.#positionen[i].anzahl * _stocks[i].preis;
			}
		}

		document.getElementById('portfolio-value').innerText = Math.floor(this.#wert);
	}

	/**
	 * updates the position on the given index with the given stock amount.
	 * */
	setPosition(_i, _stockAmount, _stocks) {
		this.#positionen[_i].anzahl += _stockAmount;

		if (!this.#positionen[_i].hasUI) {
			let positions = document.getElementById('positions');
			positions.appendChild(this.#createPositionUI(_i, _stocks));
			this.#positionen[_i].hasUI = true;
		}
	}
}

//=================================================================//
//=== TRANSACTIONS ================================================//
//=================================================================//

/**
 * Class for managing transactions.
 * */
class TransactionManager {
	#errorManager;
	#list;
	#maxTransactions;

	constructor(_errorManager, _maxTransactions) {
		this.#errorManager = _errorManager;
		this.#list = [];
		this.#maxTransactions = _maxTransactions + 1; // for correct calculations
	}

	/**
	 * Public method triggering all needed private and external methods depending on input.
	 * @param _stockName - name of the stock
	 * @param _count - number of stocks [positive number - buy amount | negative number - sell amount]
	 * @returns boolean - true: success / false: fail
	 * */
	// Bewusst nicht in die #transaction method integriert, um einen besseren Überblick darüber zu haben,
	// was passiert, wie es passiert und wann es passiert.
	async push(_stockName, _count) {
		try {
			let data = await this.#transaction(_stockName, _count);
			this.#list.push(data);
			this.#updateTransactionList();
			return true;
		} catch (error) {
			this.#errorManager.push(error.message);
			return false;
		}
	}

	/**
	 * Function for buying/selling stocks.
	 * @param _stockName - name of the stock
	 * @param _count - number of stocks [positive number - buy amount | negative number - sell amount]
	 * @returns Object - Object containing stocks
	 * @throws Error - either 'invalid transaction'-error or an error with its code.
	 * */
	async #transaction(_stockName, _count) {
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
			return await response.json();
		} else if (response.status === 422) {
			throw new Error('TRANSACTION-ERROR: Invalid amount (' + _count + ') of stocks (' + _stockName + '). Transaction failed.');
		} else {
			throw new Error(`ERROR: Status: ${response.status}`);
		}
	}

	/**
	 * Method for building the DOM-Element needed to display a Transaction.
	 * @param _i - index variable needed to address the right transaction
	 * @returns void
	 * */
	#buildTransactionDOM(_i) {
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
			this.#list[_i].success,
		));
		element.appendChild(createSubElement(
			['transaction-value'],
			'Umsatz: ' + Math.floor((-1 * this.#list[_i].umsatz.anzahl) * this.#list[_i].umsatz.aktie.preis),
		));

		document.getElementById('transaction-list').prepend(element);
	}

	/**
	 * Method for updating the list with transactions.
	 * @returns void
	 * */
	#updateTransactionList() {
		while (this.#list.length > this.#maxTransactions) {
			this.#list.shift();
		}

		if (this.#list.length < this.#maxTransactions) {
			this.#buildTransactionDOM(this.#list.length - 1);
		} else {
			this.#buildTransactionDOM(this.#list.length - 1);
			document.getElementById('transaction-list').lastChild.remove();
		}
	}
}

//=================================================================//
//=== RANKING =====================================================//
//=================================================================//
/**
 * Class for managing the ranking-system
 * */
class RankingManager {
	#ranking;
	#errorManager;

	/**
	 * Constructor for the ranking-manager.
	 * @param _errorManager - instance of the ErrorManager-class
	 * @see ErrorManager
	 * */
	constructor(_errorManager) {
		this.#errorManager = _errorManager;
		this.#ranking = [];
	}

	/**
	 * Short init function for initializing the Array of people/wealth and the UI.
	 * @public
	 * */
	async init() {
		try {
			this.#ranking = await this.#fetchPortfolioAll();
		} catch (error) {
			this.#errorManager.push(error.message);
		}
		this.#ranking.sort(this.#sortRanking);
		this.#createRankingUI();
	}

	/**
	 * Function for getting the Portfolio values and according player names of everyone.
	 * @return Object - portfolios with name/value of everyone
	 * @throws Error - error with code
	 * @private
	 * */
	async #fetchPortfolioAll() {
		let response = await fetch('/api/depotAlle', {
			method: 'GET',
			headers: {'accept': 'application/json'},
		});

		if (response.ok) {
			return await response.json();
		} else {
			throw new Error(`ERROR: Status: ${response.status}`);
		}
	}

	/**
	 * Function creating the ranking UI. Caution: The prerequisite for guaranteeing functionality
	 * is that the number of players does not change without a server restart.
	 * @private
	 * */
	#createRankingUI() {
		let ranking = document.getElementById('ranking-list');

		for (let i = 0; i < this.#ranking.length; i++) {
			let player = document.createElement('div');
			let name = document.createElement('h4');
			let money = document.createElement('p');

			name.innerText = this.#ranking[i].name;
			money.innerText = this.#ranking[i].summe;

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
	 * @public
	 * */
	async updateRankingUI() {
		try {
			this.#ranking = await this.#fetchPortfolioAll();
		} catch (error) {
			this.#errorManager.push(error.message);
		}
		this.#ranking.sort(this.#sortRanking);

		let list = document.getElementsByClassName('rank');

		for (let i = 0; i < list.length; i++) {
			list[i].firstChild.innerText = this.#ranking[i].name;
			list[i].lastChild.innerText = this.#ranking[i].summe;
		}
	}

	/**
	 * Simple sort-method for sorting the players according their wealth.
	 * @private
	 * */
	#sortRanking(_player1, _player2) {
		return (_player1.summe < _player2.summe) ? 1 : (_player1.summe > _player2.summe) ? -1 : 0;
	}
}

//=================================================================//
//=== NEWS ========================================================//
//=================================================================//
/**
 * Class for managing the news-system
 * */
class NewsManager {
	#errorManager;
	#news; // note: most current news are at index (0), oldest on index (#maxNews - 1)
	#latestTimestamp;
	#maxNews;
	#updated;

	constructor(_errorManager, _maxNews) {
		this.#errorManager = _errorManager;
		this.#news = [];
		this.#latestTimestamp = 1;
		this.#maxNews = _maxNews;
		this.#updated = false;
	}

	async init() {
		await this.updateNewsUI();
	}

	async #updateNews() {
		try {
			let temp = await this.#fetchNews();
			if (temp.length === 0) {
				this.#updated = false;
			} else {
				this.#updated = true;
				this.#latestTimestamp = temp[temp.length - 1].zeit;

				// N → temp.length
				// M → this.#news.length
				// =============================================
				// Anfangs mit push() und shift() umgesetzt:
				// Laufzeit: N * O(1) + N * O(N) => 0(N²+N)
				// ==============================================
				// Aktuelle umsetzung mit reverse(), unshift() und pop():
				// Laufzeit: 1 * O(N) + 1 * O(N+M) + N * O(1) => O(3N+M)
				temp.reverse();
				this.#news.unshift(...temp);
				while (this.#news.length > this.#maxNews) {
					this.#news.pop();
				}

				this.#latestTimestamp = this.#news[0].zeit;
			}
		} catch (error) {
			this.#errorManager.push(error.message);
		}
	}

	/**
	 * Method for getting News from the server. News are about players buying/selling stocks and
	 * the amounts of stocks in those trades.
	 * @returns Object - Object containing new data since last fetch
	 * @throws Error - error with code
	 * */
	async #fetchNews() {
		let response = await fetch('/api/nachrichten?letzteZeit=' + this.#latestTimestamp, {
			method: 'GET',
			headers: {'accept': 'application/json'},
		});

		if (response.ok) {
			return await response.json();
		} else {
			throw new Error(`ERROR: Status: ${response.status}`);
		}
	}

	#createNewsUI(_listElement, _i) {
		let element = document.createElement('div');
		let time = document.createElement('p');
		let message = document.createElement('p');

		time.classList.add('news-time');
		time.innerText = this.#correctUhrzeit(this.#news[_i].uhrzeit);

		message.classList.add('news-message');
		message.innerText = this.#news[_i].text;

		element.classList.add('news');
		element.appendChild(time);
		element.appendChild(message);

		_listElement.append(element);
	}

	async updateNewsUI() {
		await this.#updateNews();
		if (this.#updated) {
			// element containing the news
			let newsList = document.getElementById('news-list');
			// list of the single news-elements
			let listOfNews = document.getElementsByClassName('news');

			for (let i = 0; i < this.#news.length; i++) {
				// editing the news message
				try {
					this.#news[i].text = this.#adaptNewsMessage(this.#news[i].text);
				} catch (error) {
					this.#errorManager.push(error.message);
				}

				// if we don't have more news than news-DOM-Elements already exist, we create a new DOM-Element with
				// the needed information. Otherwise, we just change the content of what we already have.
				if (i >= listOfNews.length) {
					this.#createNewsUI(newsList, i);
				} else {
					listOfNews[i].firstChild.innerText = this.#correctUhrzeit(this.#news[i].uhrzeit);
					listOfNews[i].lastChild.innerText = this.#news[i].text;
				}
			}
		}
	}

	/**
	 * Method for correcting the displayed time. Changes e.g.: 15:0 => 15:00
	 * @returns String - corrected time
	 * @private
	 * */
	#correctUhrzeit(_uhrzeit) {
		let temp = _uhrzeit.split(':');
		let temp2;
		if (parseInt(temp[1]) === 0) {
			temp2 = temp[0] + ':00';
		} else {
			temp2 = _uhrzeit;
		}
		return temp2;
	}

	/**
	 * Small method for adding a small linebreak after the name of the user.
	 * This way all news-messages have the linebreaks at the same place and look better.
	 * @returns String - adapted message
	 * @throws Error - if news string is invalid
	 * @private
	 * */
	#adaptNewsMessage(_text) {
		let temp = _text.split(': ');
		if (temp.length === 3) {
			return temp[0] + ': ' + temp[1] + '\n' + temp[2];
		} else if (temp.length === 2) {
			return temp[0] + ': ' + temp[1];
		} else {
			throw new Error('SERVER ERROR: Got invalid news: ' + temp);
		}
	}
}

//=================================================================//
//=== ERROR =======================================================//
//=================================================================//
class ErrorManager {
	constructor(_maxErrors) {
		this.errors = [];
		this.maxErrors = _maxErrors + 1; // for correct calculations
	}

	push(_errorMessage) {
		this.errors.push(_errorMessage);

		while (this.errors.length > this.maxErrors) {
			this.errors.shift();
		}

		this.#updateErrorsList();
	}

	#buildErrorDOM(_message) {
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

	#updateErrorsList() {
		if (this.errors.length < this.maxErrors) {
			this.#buildErrorDOM(this.errors[this.errors.length - 1]);
		} else {
			this.#buildErrorDOM(this.errors[this.errors.length - 1]);
			document.getElementById('error-list').lastChild.remove();
		}
	}
}

//=================================================================//
//=== INIT ========================================================//
//=================================================================//

window.onload = async () => {
	let errorManager = new ErrorManager(5);
	let transactionManager = new TransactionManager(errorManager, 10);
	let portfolioManager = new PortfolioManager(errorManager, transactionManager);
	let stocksManager = new StocksManager(errorManager, 10, 1000);
	let balanceManager = new BalanceManager(errorManager);
	let rankingManager = new RankingManager(errorManager);
	let newsManager = new NewsManager(errorManager, 10);

	await stocksManager.init();
	stocksManager.createStocksUI(portfolioManager, transactionManager, stocksManager.getStocks());

	await portfolioManager.init();
	await portfolioManager.initPortfolioUI(stocksManager.getStocks());

	await balanceManager.init();

	await rankingManager.init();

	await newsManager.init();

	setInterval(async () => {
		await balanceManager.updateBalance();

		await stocksManager.updateStocks();
		stocksManager.updateStocksUI();
		stocksManager.highlightStocks();

		portfolioManager.updatePortfolio(stocksManager.getStocks());

		await rankingManager.updateRankingUI();

		await newsManager.updateNewsUI();
	}, 500);
};