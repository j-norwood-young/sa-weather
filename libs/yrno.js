const axios = require("axios");
const moment = require("moment");

const HOST = "https://api.met.no/weatherapi";

const url = (lat, lon) => {
    return `${HOST}/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`
}

const getCardinal = (angle) => {
    /** 
     * Customize by changing the number of directions you have
     * We have 8
     */
    const degreePerDirection = 360 / 8;
  
    /** 
     * Offset the angle by half of the degrees per direction
     * Example: in 4 direction system North (320-45) becomes (0-90)
     */
    const offsetAngle = angle + degreePerDirection / 2;
  
    return (offsetAngle >= 0 * degreePerDirection && offsetAngle < 1 * degreePerDirection) ? "N"
      : (offsetAngle >= 1 * degreePerDirection && offsetAngle < 2 * degreePerDirection) ? "NE"
        : (offsetAngle >= 2 * degreePerDirection && offsetAngle < 3 * degreePerDirection) ? "E"
          : (offsetAngle >= 3 * degreePerDirection && offsetAngle < 4 * degreePerDirection) ? "SE"
            : (offsetAngle >= 4 * degreePerDirection && offsetAngle < 5 * degreePerDirection) ? "S"
              : (offsetAngle >= 5 * degreePerDirection && offsetAngle < 6 * degreePerDirection) ? "SW"
                : (offsetAngle >= 6 * degreePerDirection && offsetAngle < 7 * degreePerDirection) ? "W"
                  : "NW";
}

const beaufortScale = spd => {
    if (spd < 0.5) return 0;
    if (spd < 1.5) return 1;
    if (spd < 3.3) return 2;
    if (spd < 5.5) return 3;
    if (spd < 7.9) return 4;
    if (spd < 10.7) return 5;
    if (spd < 13.8) return 6;
    if (spd < 17.1) return 7;
    if (spd < 20.7) return 8;
    if (spd < 24.4) return 9;
    if (spd < 28.4) return 10;
    if (spd < 32.6) return 11;
    return 12;
}

const symbol_code_to_description = symbol => {
    const codes = {    
        "clearsky": "Clear sky",
        "cloudy": "Cloudy",
        "fair": "Fair",
        "fog": "Fog",
        "heavyrain": "Heavy rain",
        "heavyrainandthunder": "Heavy rain and thunder",
        "heavyrainshowers": "Heavy rain showers",
        "heavyrainshowersandthunder": "Heavy rain showers and thunder",
        "heavysleet": "Heavy sleet",
        "heavysleetandthunder": "Heavy sleet and thunder",
        "heavysleetshowers": "Heavy sleet showers",
        "heavysleetshowersandthunder": "Heavy sleet showers and thunder",
        "heavysnow": "Heavy snow",
        "heavysnowandthunder": "Heavy snow and thunder",
        "heavysnowshowers": "Heavy snow showers",
        "heavysnowshowersandthunder": "Heavy snow showers and thunder",
        "lightrain": "Light rain",
        "lightrainandthunder": "Light rain and thunder",
        "lightrainshowers": "Light rain showers",
        "lightrainshowersandthunder": "Light rain showers and thunder",
        "lightsleet": "Light sleet",
        "lightsleetandthunder": "Light sleet and thunder",
        "lightsleetshowers": "Light sleet showers",
        "lightsnow": "Light snow",
        "lightsnowandthunder": "Light snow and thunder",
        "lightsnowshowers": "Light snow showers",
        "lightssleetshowersandthunder": "Light sleet showers and thunder",
        "lightssnowshowersandthunder": "Light snow showers and thunder",
        "partlycloudy": "Partly cloudy",
        "rain": "Rain",
        "rainandthunder": "Rain and thunder",
        "rainshowers": "Rain showers",
        "rainshowersandthunder": "Rain showers and thunder",
        "sleet": "Sleet",
        "sleetandthunder": "Sleet and thunder",
        "sleetshowers": "Sleet showers",
        "sleetshowersandthunder": "Sleet showers and thunder",
        "snow": "Snow",
        "snowandthunder": "Snow and thunder",
        "snowshowers": "Snow showers",
        "snowshowersandthunder": "Snow showers and thunder",
    }
    const clean_symbol = symbol.split("_")[0];
    return codes[clean_symbol];
}

const getWeatherTomorrow = async (pos) => {
    try {
        console.log({ pos });
        const data = (await axios.get(url(pos.lat, pos.lon))).data;
        const tomorrow = moment().add(1, "day");
        const timeseries = data.properties.timeseries.filter(dt => moment(dt.time).format("YYYY-MM-DD") === tomorrow.format("YYYY-MM-DD"));
        const am = timeseries.find(dt => Number(moment(dt.time).format("H")) === 6).data;
        const pm = timeseries.find(dt => Number(moment(dt.time).format("H")) === 18).data;
        console.log({ am });
        const morning = {
            description: symbol_code_to_description(am.next_12_hours.summary.symbol_code)
        }
        const evening = {
            description: symbol_code_to_description(pm.next_12_hours.summary.symbol_code)
        }
        const day = {
            air_temperature: [am.instant.details.air_temperature],
            wind_from_direction: [am.instant.details.wind_from_direction],
            wind_speed: [am.instant.details.wind_speed],
            precipitation: [am.next_1_hours.details.precipitation_amount],
            data: [am]
        }
        for (let dt of timeseries) {
            const hr = Number(moment(dt.time).format("H"));
            day.air_temperature.push(dt.data.instant.details.air_temperature);
            day.wind_from_direction.push(dt.data.instant.details.wind_from_direction);
            day.wind_speed.push(dt.data.instant.details.wind_speed);
            if (dt.data.next_1_hours) {
                day.precipitation.push(dt.data.next_1_hours.details.precipitation_amount);
            }
            day.data.push(dt.data);
            
        }
        
        day.temperature_min = Math.min(...day.air_temperature);
        day.temperature_max = Math.max(...day.air_temperature);
        day.precipitation = day.precipitation.reduce((a, b) => a+b);
        day.wind_direction = getCardinal(day.wind_from_direction.reduce((a, b) => a+b) / day.wind_from_direction.length);
        day.wind_speed_max = Math.max(...day.wind_speed);
        day.beaufort_scale = beaufortScale(day.wind_speed_max);
        
        return { day, morning, evening };
    } catch(err) {
        return Promise.reject(err);
    }
}

module.exports = { getWeatherTomorrow };