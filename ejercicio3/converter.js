class Currency {
    constructor(code, name) {
        this.code = code;
        this.name = name;
    }
}

class CurrencyConverter {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
        this.currencies = [];
    }

    async getCurrencies(apiUrl) {
        try {
            const response = await fetch(`${this.apiUrl}/currencies`);
            const data = await response.json();
            this.currencies = Object.keys(data).map(code => new Currency(code, data[code]));
        } catch (error) {
            console.error('Error fetching', error);
        }
    }

    async convertCurrency(amount, fromCurrency, toCurrency) {
        if (fromCurrency.code === toCurrency.code) {
            return amount;
        }
        try {
            const response = await fetch(`${this.apiUrl}/latest?amount=${amount}&from=${fromCurrency.code}&to=${toCurrency.code}`);
            const data = await response.json();
            return data.rates[toCurrency.code] * amount;
        } catch (error) {
            console.error('Error converting', error);
            return null;
        }
    }

    async getHistoricalRate(date, fromCurrency, toCurrency) {
        try {
            const response = await fetch(`${this.apiUrl}/${date}?from=${fromCurrency}&to=${toCurrency}`);
            const data = await response.json();
            return data.rates[toCurrency];
        } catch (error) {
            console.error('Error fetching historical rate', error);
            return null;
        }
    }

    async getRateDifference(date1, date2, fromCurrency, toCurrency) {
        const rate1 = await this.getHistoricalRate(date1, fromCurrency, toCurrency);
        const rate2 = await this.getHistoricalRate(date2, fromCurrency, toCurrency);

        if (rate1 !== null && rate2 !== null) {
            return rate1 - rate2;
        } else {
            return null;
        }
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("conversion-form");
    const resultDiv = document.getElementById("result");
    const differenceDiv = document.getElementById("difference");
    const fromCurrencySelect = document.getElementById("from-currency");
    const toCurrencySelect = document.getElementById("to-currency");
    const date1Input = document.getElementById("date1");
    const date2Input = document.getElementById("date2");

    const converter = new CurrencyConverter("https://api.frankfurter.app");

    await converter.getCurrencies();
    populateCurrencies(fromCurrencySelect, converter.currencies);
    populateCurrencies(toCurrencySelect, converter.currencies);

    // Set diferencia por default datos de ayer y hoy 
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    date1Input.value = yesterday;
    date2Input.value = today;

    const calculateDifference = async () => {
        const amount = document.getElementById("amount").value;
        const fromCurrency = converter.currencies.find(
            (currency) => currency.code === fromCurrencySelect.value
        );
        const toCurrency = converter.currencies.find(
            (currency) => currency.code === toCurrencySelect.value
        );

        const convertedAmount = await converter.convertCurrency(
            amount,
            fromCurrency,
            toCurrency
        );

        if (convertedAmount !== null && !isNaN(convertedAmount)) {
            resultDiv.textContent = `${amount} ${
                fromCurrency.code
            } son ${convertedAmount.toFixed(2)} ${toCurrency.code}`;
        } else {
            resultDiv.textContent = "Error al realizar la conversión.";
        }

        const date1 = date1Input.value;
        const date2 = date2Input.value;
        const rateDifference = await converter.getRateDifference(date1, date2, fromCurrency.code, toCurrency.code);

        if (rateDifference !== null) {
            differenceDiv.textContent = `La diferencia en la tasa de cambio entre ${date1} y ${date2} es de ${rateDifference.toFixed(4)} ${toCurrency.code}`;
        } else {
            differenceDiv.textContent = "Error al calcular la diferencia de la tasa de cambio.";
        }
    };

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        await calculateDifference();
    });

    date1Input.addEventListener("change", calculateDifference);
    date2Input.addEventListener("change", calculateDifference);

    function populateCurrencies(selectElement, currencies) {
        if (currencies) {
            currencies.forEach((currency) => {
                const option = document.createElement("option");
                option.value = currency.code;
                option.textContent = `${currency.code} - ${currency.name}`;
                selectElement.appendChild(option);
            });
        }
    }

    await calculateDifference();
});