// Utility Functions
function caesarCipher(text, shift, decrypt = false) {
    if (decrypt) shift = -shift;
    return text
        .split('')
        .map((char) => {
            if (char.match(/[a-z]/i)) {
                const code = char.charCodeAt(0);
                const base = char >= 'a' ? 97 : 65;
                return String.fromCharCode(((code - base + shift) % 26 + 26) % 26 + base);
            }
            return char;
        })
        .join('');
}

function base64Encode(text) {
    return btoa(text);
}

function base64Decode(text) {
    return atob(text);
}

function atbashCipher(text) {
    return text
        .split('')
        .map((char) => {
            if (char.match(/[a-z]/i)) {
                const base = char >= 'a' ? 97 : 65;
                return String.fromCharCode(base + (25 - (char.charCodeAt(0) - base)));
            }
            return char;
        })
        .join('');
}

// Cipher Buttons
function setupCipherHandlers() {
    document.getElementById('encryptButton').addEventListener('click', () => {
        const text = document.getElementById('inputText').value;
        const cipherType = document.getElementById('cipherType').value;
        const shift = parseInt(document.getElementById('shift').value, 10) || 0;

        let result;
        if (cipherType === 'caesar') {
            result = caesarCipher(text, shift);
        } else if (cipherType === 'atbash') {
            result = atbashCipher(text);
        } else if (cipherType === 'base64') {
            result = base64Encode(text);
        }

        document.getElementById('outputText').value = result;
    });

    document.getElementById('decryptButton').addEventListener('click', () => {
        const text = document.getElementById('inputText').value;
        const cipherType = document.getElementById('cipherType').value;
        const shift = parseInt(document.getElementById('shift').value, 10) || 0;

        let result;
        if (cipherType === 'caesar') {
            result = caesarCipher(text, shift, true);
        } else if (cipherType === 'atbash') {
            result = atbashCipher(text);
        } else if (cipherType === 'base64') {
            result = base64Decode(text);
        }

        document.getElementById('outputText').value = result;
    });

    document.getElementById('copyButton').addEventListener('click', () => {
        const outputText = document.getElementById('outputText');
        outputText.select();
        document.execCommand('copy');
        alert('Output copied to clipboard!');
    });
}

// Weather Button
function setupWeatherHandler() {
    const button = document.getElementById('getWeatherButton');
    const cityInput = document.getElementById('cityInput');
    const weatherResult = document.getElementById('weatherResult');

    if (!button || !cityInput || !weatherResult) {
        console.error('Weather-related elements are missing in the DOM.');
        return;
    }

    button.addEventListener('click', async () => {
        const city = cityInput.value.trim();
        if (!city) {
            alert('Please enter a city');
            return;
        }

        try {
            console.log(`Fetching weather data for: ${city}`);
            const response = await fetch(`/api/weather?city=${city}`);
            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Weather data received:', data);

            const icon = data.weather[0].icon;
            const rain = data.rain?.['3h'] || 'No data';

            weatherResult.innerHTML = `
                <p><strong>Weather:</strong> ${data.weather[0].description} <img src="https://openweathermap.org/img/wn/${icon}.png" alt="weather-icon"></p>
                <p><strong>Temperature:</strong> ${data.main.temp}°C</p>
                <p><strong>Feels Like:</strong> ${data.main.feels_like}°C</p>
                <p><strong>Humidity:</strong> ${data.main.humidity}%</p>
                <p><strong>Pressure:</strong> ${data.main.pressure} hPa</p>
                <p><strong>Wind Speed:</strong> ${data.wind.speed} m/s</p>
                <p><strong>Coordinates:</strong> [${data.coord.lat}, ${data.coord.lon}]</p>
                <p><strong>Country Code:</strong> ${data.sys.country}</p>
                <p><strong>Rain (last 3h):</strong> ${rain}</p>
            `;

            displayMap(data.coord.lat, data.coord.lon);
        } catch (error) {
            console.error('Error fetching weather data:', error);
            alert('Failed to fetch weather data.');
        }
    });
}

// Map Display
function displayMap(lat, lon) {
    const map = L.map('map').setView([lat, lon], 13);

    // Добавление тайлов карты
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Добавление маркера
    L.marker([lat, lon]).addTo(map)
        .bindPopup('Location: ' + lat + ', ' + lon)
        .openPopup();
}

document.getElementById('getNewsButton').addEventListener('click', async () => {
    const country = document.getElementById('newsCountryInput').value.trim();
    if (!country) {
        alert('Please enter a country code (e.g., us, kz)');
        return;
    }

    try {
        const response = await fetch(`/api/news?country=${country}`);
        if (!response.ok) throw new Error('Failed to fetch news');

        const news = await response.json();
        const newsResult = document.getElementById('newsResult');
        newsResult.innerHTML = news
            .map(article => `
                <div>
                    <h3>${article.title}</h3>
                    <p>${article.description}</p>
                    <a href="${article.url}" target="_blank">Read more</a>
                </div>
            `).join('');
    } catch (error) {
        console.error('Error fetching news:', error);
        alert('Failed to fetch news.');
    }
});

document.getElementById('getCurrencyButton').addEventListener('click', async () => {
    const base = document.getElementById('currencyBaseInput').value.trim();
    if (!base) {
        alert('Please enter a base currency (e.g., USD)');
        return;
    }

    try {
        const response = await fetch(`/api/currency?base=${base}`);
        if (!response.ok) throw new Error('Failed to fetch currency rates');

        const rates = await response.json();
        const currencyResult = document.getElementById('currencyResult');
        currencyResult.innerHTML = Object.entries(rates)
            .map(([currency, rate]) => `<p>${currency}: ${rate}</p>`)
            .join('');
    } catch (error) {
        console.error('Error fetching currency rates:', error);
        alert('Failed to fetch currency rates.');
    }
});

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    setupCipherHandlers();
    setupWeatherHandler();
    console.log('App initialized');
});
