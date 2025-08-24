// Weather Hero Dynamic Widget
// This script defines a new Staffbase custom widget that displays
// a modern, dark blue weather card similar in style to the iOS
// weather application. The widget fetches current conditions and a
// three‑day forecast from weatherapi.com in Fahrenheit units. It
// respects the user's profile location (via {{user.profile.location}})
// as the default city but allows the user to override it by clicking
// on the city name in the card. Date and time and hourly details
// are intentionally omitted to keep the design focused on the
// essentials. A unique block name is used so this widget can be
// installed alongside other weather widgets without conflict.

(function(){
  // Define the CSS for the card. The styles make the card fill its
  // container horizontally, set up a dark gradient background, and
  // establish typography consistent with the mockup provided by the
  // user. Forecast rows are laid out in a four‑column grid to align
  // the day, icon + condition, high, and low values.
  const css = "/* Weather hero card styles */\n"
    + ".wh-card {\n"
    + "  font-family: \"Noto Sans\", system-ui, -apple-system, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif;\n"
    + "  background: linear-gradient(to bottom, #023f76 0%, #00244f 100%);\n"
    + "  border-radius: 24px;\n"
    + "  color: #ffffff;\n"
    + "  padding: 24px;\n"
    + "  box-sizing: border-box;\n"
    + "  width: 100%;\n"
    + "  display: flex;\n"
    + "  flex-direction: column;\n"
    + "  gap: 8px;\n"
    + "}\n"
    + ".wh-city {\n"
    + "  font-size: 2rem;\n"
    + "  font-weight: 600;\n"
    + "  cursor: pointer;\n"
    + "}\n"
    + ".wh-temp {\n"
    + "  font-size: 4rem;\n"
    + "  font-weight: 700;\n"
    + "  line-height: 1;\n"
    + "  margin-top: 4px;\n"
    + "}\n"
    + ".wh-condition {\n"
    + "  font-size: 1.25rem;\n"
    + "  margin-top: 8px;\n"
    + "}\n"
    + ".wh-hilo {\n"
    + "  font-size: 1rem;\n"
    + "  color: rgba(255,255,255,0.8);\n"
    + "  margin-top: 8px;\n"
    + "}\n"
    + ".wh-forecast {\n"
    + "  margin-top: 16px;\n"
    + "  border-top: 1px solid rgba(255,255,255,0.3);\n"
    + "  padding-top: 16px;\n"
    + "  display: flex;\n"
    + "  flex-direction: column;\n"
    + "  gap: 8px;\n"
    + "}\n"
    + ".wh-row {\n"
    + "  display: grid;\n"
    + "  grid-template-columns: 1fr 2fr 1fr 1fr;\n"
    + "  align-items: center;\n"
    + "  gap: 8px;\n"
    + "}\n"
    + ".wh-day {\n"
    + "  font-weight: 600;\n"
    + "  font-size: 1rem;\n"
    + "}\n"
    + ".wh-cond {\n"
    + "  display: flex;\n"
    + "  align-items: center;\n"
    + "  gap: 4px;\n"
    + "  font-size: 1rem;\n"
    + "}\n"
    + ".wh-high {\n"
    + "  text-align: right;\n"
    + "  font-weight: 600;\n"
    + "  font-size: 1rem;\n"
    + "}\n"
    + ".wh-low {\n"
    + "  text-align: right;\n"
    + "  color: rgba(255,255,255,0.7);\n"
    + "  font-size: 1rem;\n"
    + "}\n"
    + ".wh-icon {\n"
    + "  width: 24px;\n"
    + "  height: 24px;\n"
    + "}\n";

  // Inject the CSS into the document once. Using a unique id
  // prevents duplicate style tags if multiple widget instances are
  // created on the same page.
  function ensureCss(){
    if (!document.getElementById('weather-hero-dynamic-css')){
      const style = document.createElement('style');
      style.id = 'weather-hero-dynamic-css';
      style.textContent = css;
      document.head.appendChild(style);
    }
  }

  // Convert a date string (yyyy-mm-dd) into a weekday name. This helper
  // normalizes dashes versus slashes for Safari compatibility.
  function formatDay(dateStr){
    const dt = new Date(dateStr.replace(/-/g,'/'));
    return dt.toLocaleDateString('en-US', { weekday: 'long' });
  }

  // Factory function that returns a custom element class extending the
  // Staffbase widget base class. The implementation closely follows
  // the pattern used in the official weather widget but is modified
  // to remove unwanted fields (date/time, hourly breakdown) and to
  // render only three forecast days. It also adds click handling on
  // the city name for manual override when allowed.
  function WeatherHeroFactory(BaseClass, h){
    return class extends BaseClass {
      constructor(){
        super();
        this.container = null;
        this.apiKey = null;
      }
      static get observedAttributes(){
        return ['city','allowcityoverride','apikey'];
      }
      connectedCallback(){
        if (super.connectedCallback) super.connectedCallback();
        ensureCss();
        this.renderBlock();
      }
      attributeChangedCallback(attr, oldValue, newValue){
        if (super.attributeChangedCallback) super.attributeChangedCallback(attr, oldValue, newValue);
        if (oldValue !== newValue && (attr === 'city' || attr === 'apikey')){
          this.renderBlock();
        }
      }
      getInitialCity(){
        const attrCity = this.getAttribute('city');
        if (attrCity && attrCity.trim()) return attrCity;
        return 'New York';
      }
      // Fetch weather data using WeatherAPI. On success, call
      // renderWeather; on failure, call renderError. Always pass
      // through Fahrenheit units (temp_f, maxtemp_f, mintemp_f).
      fetchWeather(city){
        const keyAttr = this.getAttribute('apikey');
        const apiKey = keyAttr || (typeof window !== 'undefined' ? window.weatherApiKey : '');
        this.apiKey = apiKey;
        if (!apiKey){
          this.renderError('Missing API key');
          return;
        }
        const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(city)}&days=4&aqi=no&alerts=no`;
        fetch(url)
          .then(res => res.json())
          .then(data => {
            if (data.error){
              throw new Error(data.error.message || 'API error');
            }
            this.renderWeather(data);
          })
          .catch(err => {
            this.renderError(err.message || 'Error fetching weather');
          });
      }
      // Render an error message. The card fills its container and
      // displays the error text prominently.
      renderError(message){
        if (!this.container){
          this.container = document.createElement('div');
          this.appendChild(this.container);
        }
        this.container.innerHTML = `<div class="wh-card">${message}</div>`;
        const card = this.container.querySelector('.wh-card');
        if (card){
          card.style.width = '100%';
          card.style.display = 'block';
          card.style.boxSizing = 'border-box';
        }
      }
      // Render the card markup from WeatherAPI response data.
      renderWeather(data){
        if (!this.container){
          this.container = document.createElement('div');
          this.appendChild(this.container);
        }
        const currentTempF = Math.round(data.current.temp_f);
        const condition = data.current.condition.text;
        const highToday = Math.round(data.forecast.forecastday[0].day.maxtemp_f);
        const lowToday = Math.round(data.forecast.forecastday[0].day.mintemp_f);
        let forecastHtml = '';
        // Build rows for the next three forecast days (index 1,2,3).
        const days = data.forecast.forecastday.slice(1,4);
        days.forEach(day => {
          const name = formatDay(day.date);
          const high = Math.round(day.day.maxtemp_f);
          const low = Math.round(day.day.mintemp_f);
          const icon = day.day.condition.icon;
          const text = day.day.condition.text;
          forecastHtml += `<div class="wh-row"><div class="wh-day">${name}</div><div class="wh-cond"><img class="wh-icon" src="${icon}" alt="${text}"/> ${text}</div><div class="wh-high">${high}°</div><div class="wh-low">${low}°</div></div>`;
        });
        const cityName = data.location.name;
        const allowOverride = this.getAttribute('allowcityoverride') !== 'false';
        this.container.innerHTML =
          `<div class="wh-card">\n`
          +   `<div class="wh-city">${cityName}</div>\n`
          +   `<div class="wh-temp">${currentTempF}°F</div>\n`
          +   `<div class="wh-condition">${condition}</div>\n`
          +   `<div class="wh-hilo">H:${highToday}°  L:${lowToday}°</div>\n`
          +   `<div class="wh-forecast">${forecastHtml}</div>\n`
          + `</div>`;
        // Attach click handler to city label if overrides are allowed.
        const cityEl = this.container.querySelector('.wh-city');
        if (allowOverride && cityEl){
          cityEl.style.cursor = 'pointer';
          cityEl.onclick = () => {
            const current = this.getAttribute('city') || cityName;
            const newCity = prompt('Enter city name', current);
            if (newCity && newCity.trim()){
              this.setAttribute('city', newCity.trim());
            }
          };
        }
      }
      // Render the widget. If a city is provided via attribute
      // use it; otherwise fall back to the user profile location or a
      // default city. Then call fetchWeather.
      renderBlock(){
        ensureCss();
        const city = this.getInitialCity();
        this.fetchWeather(city);
      }
    };
  }

  // Define the block definition. A unique name and label are used
  // so this widget can be installed alongside other weather widgets.
  const blockDefinition = {
    name: 'andrew-weather-hero',
    factory: WeatherHeroFactory,
    attributes: ['city','allowcityoverride','mobileview','usenewimages','apikey'],
    blockLevel: 'block',
    configurationSchema: {"properties": {"city": {"type": "string", "title": "City", "default": "{{user.profile.location}}"}, "allowcityoverride": {"type": "boolean", "title": "Allow city override?", "default": true}, "mobileview": {"type": "boolean", "title": "Mobile view", "default": false}, "usenewimages": {"type": "boolean", "title": "Use new images?", "default": false, "description": "Use the new weather icons instead of the old ones."}, "apikey": {"type": "string", "title": "Weather API Key", "default": "", "description": "Your weatherapi.com API key"}}, "required": ["city"]},
    uiSchema: {"city": {"ui:help": "Enter the city name, or use {{user.profile.location}} to pull from the user."}, "allowcityoverride": {"ui:help": "If checked, clicking the city name in the widget will let the user override it."}, "mobileview": {"ui:help": "Hide date/time to simplify the widget for mobile."}, "usenewimages": {"ui:help": "Use the new weather icons instead of the old ones. This will be the default in the future."}, "apikey": {"ui:help": "Enter your WeatherAPI API key."}},
    label: 'Weather Hero (Andrew)',
    // Use the same base64 SVG icon as the original widget for consistency. This icon depicts
    // the Staffbase weather logo and is embedded here as a data URI. It is large but
    // necessary so the widget appears with the correct icon in the Studio.
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTE2IiBoZWlnaHQ9IjEwNTciIHZpZXdCb3g9IjAgMCA5MTYgMTA1NyIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0wIDM1MS42NzRDMCAxNTcuMjczIDE1Ny4wOTkgMC4xNzM1MjMgMzUxLjUgMC4xNzM1MjNDNTQ1LjkwMSAwLjE3MzUyMyA3MDMgMTU3LjI3MyA3MDMgMzUxLjY3NEM3MDMgMzY2LjI1MyA3MDIuMTE2IDM4MC42MjMgNzAwLjQgMzk0LjczMkg2NDEuNDQ5QzY0My41MyAzODAuNjc1IDY0NC42MDggMzY2LjI5NyA2NDQuNjA4IDM1MS42NzRDNjQ0LjYwOCAxOTAuMTI3IDUxMy4wNDcgNTguNTY1NiAzNTEuNSA1OC41NjU2QzE4OS45NTMgNTguNTY1NiA1OC4zOTIgMTkwLjEyNyA1OC4zOTIgMzUxLjY3NEM1OC4zOTIgNDQ1LjM3NiAxMDIuNjU0IDUyOC45OSAxNzEuMzU2IDU4Mi42OTNWNjUzLjY5OUM2OC42NTUzIDU5Mi4zOTkgMCA0ODAuMTg3IDAgMzUxLjY3NFoiIGZpbGw9IiM0NjRCNEYiLz4KPHBhdGggZD0iTTQxNy4zNTMgMzIxLjY4OEgzODEuNDg2VjE4NC4xMDFDMzgxLjQ4NiAxNjcuNjAyIDM2OCAxNTQuMTE2IDM1MS41MDEgMTU0LjExNkMzMzUuMDAyIDE1NC4xMTYgMzIxLjUxNiAxNjcuNjAyIDMyMS41MTYgMTg0LjEwMVYzNTEuNjc0QzMyMS41MTYgMzY4LjE3MyAzMzUuMDAyIDM4MS42NTkgMzUxLjUwMSAzODEuNjU5SDQxNy4zNTNDNDMzLjg1MiAzODEuNjU5IDQ0Ny4zMzggMzY4LjE3MyA0NDcuMzM4IDM1MS42NzRDNDQ3LjMzOCAzMzUuMTc1IDQzMy43MDkgMzIxLjY4OCA0MTcuMzUzIDMyMS42ODhaIiBmaWxsPSIjNDY0QjRGIi8+CjxwYXRoIGQ9Ik00NjYuMjg3IDQzMy43NkM0NjYuMjg3IDQxNi42MTkgNDgwLjE4MiA0MDIuNzI0IDQ5Ny4zMjMgNDAyLjcyNEM1MTQuNDY0IDQwMi43MjQgNTI4LjM1OSA0MTYuNjE5IDUyOC4zNTkgNDMzLjc2VjQ2NC43OTZDNTI4LjM1OSA0ODEuOTM3IDUxNC40NjQgNDk1LjgzMiA0OTcuMzIzIDQ5NS44MzJDNDgwLjE4MiA0OTUuODMyIDQ2Ni4yODcgNDgxLjkzNyA0NjYuMjg3IDQ2NC43OTZWNDMzLjc2WiIgZmlsbD0iIzQ2NEI0RiIvPgo8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGNsaXAtcnVsZT0iZXZlbm9kZCIgZD0iTTYzNi42NzEgNjIxLjgzOEM2MDguMzYgNTg0LjE0MiA1NjMuMjgxIDU1OS43NTggNTEyLjUwOSA1NTkuNzU4QzQyNi44MDYgNTU5Ljc1OCAzNTcuMzI5IDYyOS4yMzUgMzU3LjMyOSA3MTQuOTM3QzM1Ny4zMjkgNzI1Ljg0IDM1OC40NTQgNzM2LjQ4MiAzNjAuNTkzIDc0Ni43NDlDMzQ5LjY0IDc1MS4xIDMzOS40ODQgNzU2LjQ2MyAzMzAuMTUyIDc2Mi43NzZDMjg5LjU3MyA3OTAuMjI0IDI2OC44NDkgODMyLjczNyAyNjQuOTIzIDg3NS43NjhDMjU3LjI3IDk1OS42NTUgMzE0LjQ3OSAxMDU2LjMzIDQyNC44OTYgMTA1Ni4zM0g3NzcuOTQ3QzgyMS40NjggMTA1Ni4zMyA4NTYuNzQ3IDEwNDIuNjcgODgxLjE3NSAxMDE4Ljc0QzkwNS40MzMgOTk0Ljk4NiA5MTYuNTQ0IDk2My40NDEgOTE1Ljk1NCA5MzIuNDcxQzkxNC45MjcgODc4LjcxMyA4NzguNzkyIDgyNi4yMzUgODE1Ljk1NiA4MTEuMDIxQzgyNC44MTQgNzMxLjM1MiA3NjkuMjQxIDY2MC44MjIgNzAxLjU4IDYzNC4wOTdDNjgxLjI1MSA2MjYuMDY3IDY1OS4yMDkgNjIxLjYxNSA2MzYuNjcxIDYyMS44MzhaTTU2Ni4wNTggNjM4Ljk2NkM1NTAuOTE5IDYyOC4yNzggNTMyLjQ0NiA2MjEuOTk5IDUxMi41MDkgNjIxLjk5OUM0NjEuMTggNjIxLjk5OSA0MTkuNTcgNjYzLjYwOSA0MTkuNTcgNzE0LjkzN0M0MTkuNTcgNzIxLjM5OCA0MjAuMjI5IDcyNy43MDUgNDIxLjQ4NCA3MzMuNzk0QzQzOC4wNjggNzMyLjgxMyA0NTUuNzg4IDczMy41MjcgNDc0LjU5NiA3MzYuMDZDNDk4LjUyMSA2ODkuMDc0IDUzMC4wNzIgNjU2Ljk4NiA1NjYuMDU4IDYzOC45NjZaTTUyMi4zNjMgNzgwLjQwN0M1NDMuNzM3IDczMC4zNCA1NzEuNTgzIDcwNC4zMzggNTk3Ljg5MiA2OTIuNTUxQzYyNC4yODUgNjgwLjcyOSA2NTIuNzU3IDY4MS41NTEgNjc4Ljc3OCA2OTEuODI5QzczMy4yMjcgNzEzLjMzNiA3NjcuNDgxIDc3MC41NSA3NDkuOTU5IDgyMy42OUM3NDIuNzI3IDg0NS42MjMgNzU4LjgxOSA4NjguMDQ5IDc4MS41MDMgODY4Ljc2QzgzMC4yOTIgODcwLjI5IDg1My4zMTQgOTAzLjM1IDg1My44OTIgOTMzLjY1NkM4NTQuMTg3IDk0OS4wNTkgODQ4LjczMyA5NjMuNjM0IDgzNy43NDQgOTc0LjM5N0M4MjYuOTIxIDk4NC45OTkgODA4LjI2OSA5OTQuMjYgNzc3Ljk0NyA5OTQuMjZINDI0Ljg5NkMzNTkuMzg0IDk5NC4yNiAzMjEuNTg4IDkzNy44NTUgMzI2LjczOCA4ODEuNDA3QzMyOS4yMTMgODU0LjI3MyAzNDEuODQzIDgyOS44MDcgMzY0LjkyOSA4MTQuMTlDMzg4LjA1NyA3OTguNTQ4IDQyNS45NjcgNzg4Ljk0OCA0ODQuMTA4IDgwMC41NjVDNDk5Ljg3NCA4MDMuNzE1IDUxNS45NzIgNzk1LjM3OSA1MjIuMzYzIDc4MC40MDdaIiBmaWxsPSIjNDY0QjRGIi8+CjxwYXRoIGQ9Ik0yMTcuOTk5IDY4Mi4wNDZDMjE3Ljk5OSA2OTkuMTg3IDIzMS44OTQgNzEzLjA4MiAyNDkuMDM1IDcxMy4wODJIMjgwLjA3MUMyOTcuMjExIDcxMy4wODIgMzExLjEwNyA2OTkuMTg3IDMxMS4xMDcgNjgyLjA0NkMzMTEuMTA3IDY2NC45MDcgMjk3LjIxMSA2NTEuMDExIDI4MC4wNzEgNjUxLjAxMUgyNDkuMDM1QzIzMS44OTQgNjUxLjAxMSAyMTcuOTk5IDY2NC45MDcgMjE3Ljk5OSA2ODIuMDQ2WiIgZmlsbD0iIzQ2NEI0RiIvPgo8cGF0aCBkPSJNMjk5LjgxMiA1MjguNDMxQzI4Ny42OTIgNTE2LjMxMSAyODcuNjkyIDQ5Ni42NiAyOTkuODEyIDQ4NC41NEMzMTEuOTMyIDQ3Mi40MTkgMzMxLjU4MyA0NzIuNDE5IDM0My43MDMgNDg0LjU0TDM2NS42NDkgNTA2LjQ4NUMzNzcuNzY5IDUxOC42MDYgMzc3Ljc2OSA1MzguMjU3IDM2NS42NDkgNTUwLjM3N0MzNTMuNTI5IDU2Mi40OTcgMzMzLjg3OCA1NjIuNDk3IDMyMS43NTggNTUwLjM3N0wyOTkuODEyIDUyOC40MzFaIiBmaWxsPSIjNDY0QjRGIi8+CjxwYXRoIGQ9Ik02MjguOTk2IDUwNi40NzhDNjE2Ljg3NiA1MTguNTk4IDYxNi44NzYgNTM4LjI1IDYyOC45OTYgNTUwLjM3QzY0MS4xMTkgNTYyLjQ5IDY2MC43NjcgNTYyLjQ5IDY3Mi44OSA1NTAuMzdMNjk0LjgzNiA1MjguNDI0QzcwNi45NTUgNTE2LjMwNCA3MDYuOTU1IDQ5Ni42NTMgNjk0LjgzNiA0ODQuNTMzQzY4Mi43MTMgNDcyLjQxMiA2NjMuMDY0IDQ3Mi40MTIgNjUwLjk0NCA0ODQuNTMzTDYyOC45OTYgNTA2LjQ3OFoiIGZpbGw9IiM0NjRCNEYiLz4KPC9zdmc+Cg=='
  };
  const externalDefinition = { blockDefinition: blockDefinition, author: '', version: '1.0.0' };
  // Register the widget if inside Staffbase. If not present,
  // render the fallback directly on the page using a default city and the
  // API key on the window. The fallback uses the same card markup
  // defined above.
  if (typeof window !== 'undefined' && window.defineBlock){
    window.defineBlock(externalDefinition);
  } else {
    // Fallback mode: create a card in the DOM.
    ensureCss();
    const container = document.createElement('div');
    document.body.appendChild(container);
    function renderFallback(city){
      const apiKey = (typeof window !== 'undefined' && window.weatherApiKey) || '';
      if (!apiKey){
        container.innerHTML = '<div class="wh-card">Missing API key</div>';
        return;
      }
      const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(city)}&days=4&aqi=no&alerts=no`;
      fetch(url)
        .then(res => res.json())
        .then(data => {
          const currentTempF = Math.round(data.current.temp_f);
          const condition = data.current.condition.text;
          const highToday = Math.round(data.forecast.forecastday[0].day.maxtemp_f);
          const lowToday = Math.round(data.forecast.forecastday[0].day.mintemp_f);
          let forecastHtml = '';
          data.forecast.forecastday.slice(1,4).forEach(day => {
            const name = formatDay(day.date);
            const high = Math.round(day.day.maxtemp_f);
            const low = Math.round(day.day.mintemp_f);
            const icon = day.day.condition.icon;
            const text = day.day.condition.text;
            forecastHtml += `<div class=\"wh-row\"><div class=\"wh-day\">${name}</div><div class=\"wh-cond\"><img class=\"wh-icon\" src=\"${icon}\" alt=\"${text}\"/> ${text}</div><div class=\"wh-high\">${high}°</div><div class=\"wh-low\">${low}°</div></div>`;
          });
          container.innerHTML = `<div class=\"wh-card\"><div class=\"wh-city\">${data.location.name}</div><div class=\"wh-temp\">${currentTempF}°F</div><div class=\"wh-condition\">${condition}</div><div class=\"wh-hilo\">H:${highToday}°  L:${lowToday}°</div><div class=\"wh-forecast\">${forecastHtml}</div></div>`;
          // Allow override if user clicks the city name in fallback.
          const cityEl = container.querySelector('.wh-city');
          if (cityEl){
            cityEl.style.cursor = 'pointer';
            cityEl.onclick = () => {
              const newCity = prompt('Enter city name', data.location.name);
              if (newCity && newCity.trim()){
                renderFallback(newCity.trim());
              }
            };
          }
        })
        .catch(err => {
          container.innerHTML = `<div class=\"wh-card\">${err.message || 'Error fetching weather'}</div>`;
        });
    }
    // Determine default city in fallback: use browser geolocation if available,
    // otherwise fall back to New York. Note: this does not send the
    // current location to the API; it simply uses the profile location if
    // available via a global placeholder.
    const fallbackCity = (typeof window !== 'undefined' && window.userProfileLocation) || 'New York';
    renderFallback(fallbackCity);
  }
})();