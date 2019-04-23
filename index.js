const fs = require("fs").promises;
const SolarCalc = require("solar-calc");
const restify = require("restify");
const moment = require("moment");

const yrno = require('yr.no-forecast')({
    request: {
      // make calls to locationforecast timeout after 15 seconds
      timeout: 15000
    }
});

const Cities = {
    "Bloemfontein" : { lat: -29.085, lon: 26.159},
    "Cape Town" : { lat: -33.924, lon: 18.424},
    "Durban" : { lat: -29.858, lon: 31.021},
    "Jhb" : { lat: -26.204, lon: 28.047},
    "Nelspuit" : { lat: -25.475, lon: 30.969},
    "Port Elizabeth" : { lat: -33.960, lon: 25.602},
    "Polokwane" : { lat: -23.896, lon: 29.448},
    "Pretoria" : { lat: -25.747, lon: 28.229},
    "Rustenburg" : { lat: -25.654, lon: 27.255},
}

const Icons = {
    Sun: "Sunny",
    LightCloud: "Light cloud",
    PartlyCloud: "Partly cloudy",
    Cloud: "Cloudy",
    LightRainSun: "Intermittent light rain",
    LightRainThunderSun: "Intermittent light rain and thunder",
    SleetSun: "Some sleet",
    SnowSun: "Some snow",
    LightRain: "Light rain",
    Rain: "Rain",
    RainThunder: "Rain and thunder",
    Sleet: "Sleet",
    Snow: "Snow",
    SnowThunder: "Snow and thunder",
    Fog: "Fog",
    SleetSunThunder: "Intermittent sleet and storms",
    SnowSunThunder: "Intermittent snow and storms",
    LightRainThunder: "Light rain with thunder",
    SleetThunder: "Sleet with thunder",
    DrizzleThunderSun: "Intermittent drizzle with thunder",
    RainThunderSun: "Intermittent rain with thunder",
    LightSleetThunderSun: "Intermittent light sleet with thunder",
    HeavySleetThunderSun: "Heavy intermittent sleet with thunder",
    LightSnowThunderSun: "Intermittent light snow with thunder",
    HeavySnowThunderSun: "Intermittent heavy snow with thunder",
    DrizzleThunder: "Drizzle with thunder",
    LightSleetThunder: "Light sleet with thunder",
    HeavySleetThunder: "Heavy sleet with thunder",
    LightSnowThunder: "Light snow with thunder",
    HeavySnowThunder: "Heavy snow with thunder",
    DrizzleSun: "Intermittent drizzle",
    RainSun: "Intermittent rain",
    LightSleetSun: "Intermittent light sleet",
    HeavySleetSun: "Intermittent heavy sleet",
    LightSnowSun: "Intermittent light snow",
    HeavysnowSun: "Intermittent heavy snow",
    Drizzle: "Drizzle",
    LightSleet: "Light sleet",
    HeavySleet: "Heavy sleet",
    LightSnow: "Light snow",
    HeavySnow: "Heavy snow"
}

const beaufortWindName = [
    "calm", 
    "light air", 
    "light breeze", 
    "gentle breeze",
    "moderate breeze",
    "fresh breeze",
    "strong breeze",
    "near gale",
    "gale",
    "strong gale",
    "storm",
    "violent storm",
    "hurricane"
];

const moonPhase = luminosity => {
    luminosity = Math.round(luminosity * 100);
    if (luminosity === 0) return "New moon";
    if (luminosity < 25) return "Waxing crescent moon";
    if (luminosity === 25) return "First quarter moon";
    if (luminosity < 50) return "Waxing gibbous moon";
    if (luminosity == 50) return "Full moon";
    if (luminosity < 75) return "Waning gibbous moon";
    if (luminosity == 75) return "Last quarter moon";
    return "Waning crescent moon";
}


const server = restify.createServer({
    name: 'Seftel-Weather',
    version: '1.0.0'
});

server.listen(process.env.PORT || 7700, function () {
    console.log('%s listening at %s', server.name, server.url);
});

server.get(`/raw/:city/:date`, async (req, res) => {
    try {
        const data = JSON.parse(await fs.readFile(`./data/${ req.params.city }-${ req.params.date }.json`));
        res.send(data);
    } catch(err) {
        console.error(new Date(), err);
        res.send(`Could not get weather info for ${req.params.city}`);
    }
})

server.get(`/english/:city/:date`, async (req, res) => {
    try {
        const data = JSON.parse(await fs.readFile(`./data/${ req.params.city }-${ req.params.date }.json`));
        const pos = Cities[req.params.city];
        const solarcalc = new SolarCalc(new Date(req.params.date), pos.lat, pos.lon);
        let s = `Weather ${ req.params.city }, ${ moment(data.from).format('ddd DD/MM')}: ${ Icons[data.icon]}. Temp ${ data.minTemperature.value }C - ${ data.maxTemperature.value }C. Wind ${ data.windDirection.name } ${ beaufortWindName[data.windSpeed.beaufort * 1] }. Rain ${ data.rainDetails.rain }${ data.rainDetails.unit }. Sunrise ${ moment(solarcalc.sunrise).format("HH:mm") } Sunset ${ moment(solarcalc.sunset).format("HH:mm") }. ${ moonPhase(solarcalc.lunarIlluminosity) }`
        res.send(s);
    } catch(err) {
        console.error(new Date(), err);
        res.send(`Could not get weather info for ${req.params.city}`);
    }
})

server.get(`/offset/:city/:offset`, async (req, res) => {
    try {
        const date = moment().add(req.params.offset, "days");
        console.group(date.format("YYYY-MM-DD"));
        const data = JSON.parse(await fs.readFile(`./data/${ req.params.city }-${ date.format("YYYY-MM-DD") }.json`));
        const pos = Cities[req.params.city];
        const solarcalc = new SolarCalc(new Date(date), pos.lat, pos.lon);
        let s = `Weather ${ req.params.city }, ${ moment(data.from).format('ddd DD/MM')}: ${ Icons[data.icon]}. Temp ${ data.minTemperature.value }C - ${ data.maxTemperature.value }C. Wind ${ data.windDirection.name } ${ beaufortWindName[data.windSpeed.beaufort * 1] }. Rain ${ data.rainDetails.rain }${ data.rainDetails.unit }. Sunrise ${ moment(solarcalc.sunrise).format("HH:mm") } Sunset ${ moment(solarcalc.sunset).format("HH:mm") }. ${ moonPhase(solarcalc.lunarIlluminosity) }`
        res.send(s);
    } catch(err) {
        console.error(new Date(), err);
        res.send(`Could not get weather info for ${req.params.city}`);
    }
})

var sync = async () => {
    try {
        for (i in Cities) {
            try {
                console.log(new Date(), `Updating ${i}`);
                const weather = await yrno.getWeather(Cities[i])
                const forecasts = await weather.getFiveDaySummary();
                for(forecast of forecasts) {
                    const date = moment(new Date(forecast.from));
                    const fname = `./data/${ i }-${ date.format("YYYY-MM-DD") }.json`;
                    await fs.writeFile(fname, JSON.stringify(forecast));
                }
            } catch(err) {
                console.error(new Date(), err);
            }
        }
    } catch(err) {
        console.error(err);
    }
}

setInterval(sync, 3600000);
// sync();