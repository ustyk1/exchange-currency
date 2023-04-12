const urlBaseCurrency = 'https://api.privatbank.ua/p24api/pubinfo?exchange&coursid=5'
const urlAdditionalCurrency = 'https://api.privatbank.ua/p24api/exchange_rates?date=01.12.2014'

const $ = selector => document.querySelector(`${selector}`);

function getCurrency(currency) {
  return (currency['ccy'] ?? currency['currency'])
}

function getCurrencyRateOfAgreement(currency, agreement) {
  if (agreement === 'sale') {
    return (currency['sale'] ?? currency['saleRate'])
  } else if (agreement === 'buy') {
    return (currency['buy'] ?? currency['purchaseRate'])
  }
}

function generateTable(data, interface) {
  return data.map(currency => {
    let str = '';

    interface.forEach(field => {
      if (currency[field]) {
        str += `<td>${currency[field]}</td>`; 
      } else {
        str += `<td>${''}</td>`; 
      }
    })
        
    return `<tr>${str}</tr>`    
  })
}

function renderData(wrapper, data) {
  wrapper.innerHTML = '';

  wrapper.innerHTML += data.join(' ');
}

async function privatbank(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.exchangeRate) {
      urldata = data.exchangeRate;
      return data.exchangeRate
    } else {
      urldata = data;
      return data
    }
  } catch (error) {
    console.log('Error: ', error);
  }
}

const $tBodyBaseCurrency = document.querySelector('.exchange-rates > .table__body');
const $tBodyAdditionalCurrency = document.querySelector('.exchange-rates_additionally > .table__body');
const $tableAdditionalCurrency = document.querySelector('.exchange-rates_additionally');

const $getMoreBtn = document.querySelector('.button.button_get-more');
const $closeBtn = document.querySelector('.button.button_close');
const $getMoneyBtn = document.querySelector('.get-money');
const $form = document.querySelector('.convector');
const $baseCurrencyInp = document.querySelector('#baseCurrency');

let urldata;

const additionalCurrencyInputKeys = [
  'currency', 
  'baseCurrency', 
  'saleRateNB', 
  'purchaseRateNB',
  'saleRate', 
  'purchaseRate'
];

const baseCurrencyInputKeys = [
  'ccy', 
  'base_ccy', 
  'buy',
  'sale'
];

$form.querySelectorAll('option[data-optinal]').forEach(option => option.style.display = 'none');

privatbank(urlBaseCurrency)
.then(data => renderData($tBodyBaseCurrency, generateTable(data, baseCurrencyInputKeys)));

$baseCurrencyInp.addEventListener('input', event => {
  const inputValue = event.target.value;

  if (
    !Number(inputValue) || 
    isNaN(inputValue) ||
    inputValue < 0
  ) {
    $getMoneyBtn.disabled = true;
    return
  } 

  $getMoneyBtn.disabled = false;
});

$getMoreBtn.addEventListener('click', () => {
  $getMoreBtn.disabled = true;
  $closeBtn.style.display = 'block';

  privatbank(urlAdditionalCurrency)
    .then(data => renderData($tBodyAdditionalCurrency, generateTable(data, additionalCurrencyInputKeys)));

  $tableAdditionalCurrency.style.display = 'block';

  $form.querySelectorAll('option[data-optinal]')
    .forEach(option => option.style.display = 'block');
})

$closeBtn.addEventListener('click', () => {
  $getMoreBtn.disabled = false;
  $tableAdditionalCurrency.style.display = 'none';
  $closeBtn.style.display = 'none';
  $form.querySelectorAll('option[data-optinal]').forEach(option => option.style.display = 'none');
})

$getMoneyBtn.addEventListener('click', event => {
  event.preventDefault();

  const formData = new FormData($form);
  const targetCurrencySelect = formData.get('targetCurrencySelect');
  const baseCurrencyAmount = +formData.get('baseCurrencyInp');
  const baseCurrencySelect = formData.get('baseCurrencySelect');

  let targetSum;

  if (baseCurrencySelect === 'UA' && targetCurrencySelect === 'UA') {
    targetSum = 0;
  } else if (baseCurrencySelect !== 'UA' && targetCurrencySelect === 'UA') {
    // обмінник -- купляє baseCurrency, продає tаrgetCurrency (baseCurrency обмінює на tаrgetCurrency) 
    // якщо обмінюємо валюту на гривню (купівля валюти відносно обмінника)
    // знаходимо дані валюти яку обмінник купляє, 
    // угода -> купівля валюти, отримуємо її курс (курс купівлі) і множимо на кількість
    const currencyOfBuy = urldata.find(currency => getCurrency(currency) == baseCurrencySelect);
    targetSum = getCurrencyRateOfAgreement(currencyOfBuy, 'buy') * baseCurrencyAmount;
  } else if (baseCurrencySelect === 'UA' && targetCurrencySelect !== 'UA') {   
    // якщо обмінюємо гривню на валюту (продаж валюти відносно обмінника)
    // знаходимо дані валюти яку обмінник продає,
    // угода -> продаж валюти, отримуємо її курс (курс продажу) і множимо на кількість
    const currencyOfSale = urldata.find(currency => getCurrency(currency) == targetCurrencySelect)
    targetSum = baseCurrencyAmount / getCurrencyRateOfAgreement(currencyOfSale, 'sale');
  } else { 
    // якщо обмінюємо одну валюту на іншу валюту
    // обмінник купляє базову валюту і віддає гривні
    const currencyOfBuy = urldata.find(currency => getCurrency(currency) == baseCurrencySelect)
    const baseCurrencySumInUAH = getCurrencyRateOfAgreement(currencyOfBuy, 'buy') * baseCurrencyAmount;
    // обмінник отримує гривні і продаємо цільову валюту
    const currencyOfSale = urldata.find(currency => getCurrency(currency) == targetCurrencySelect);
    targetSum = baseCurrencySumInUAH / getCurrencyRateOfAgreement(currencyOfSale, 'sale'); 
  }

  document.querySelector('.result').textContent = `Sum: ${targetSum.toFixed(2)} ${targetCurrencySelect}`;
})
