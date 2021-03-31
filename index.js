const fs = require("fs").promises;
const SolarCalc = require("solar-calc");
const restify = require("restify");
const moment = require("moment");
const yrno = require("./libs/yrno");

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
        const data = JSON.parse(await fs.readFile(`./data/${ req.params.city }-${ req.params.date }-new.json`));
        res.send(data);
    } catch(err) {
        console.error(new Date(), err);
        res.send(`Could not get weather info for ${req.params.city}`);
    }
})

const getData = async (req, res, next) => {
    try {
        var date = moment();
        if (req.params.date) {
            date = moment(req.params.date);
        } else if (req.params.offset) {
            date = moment().add(req.params.offset, "days");
        }
        const id = `${ req.params.city }-${ date.format("YYYY-MM-DD") }`;
        const data = JSON.parse(await fs.readFile(`./data/${ id }-new.json`));
        const pos = Cities[req.params.city];
        const solarcalc = new SolarCalc(new Date(date), pos.lat, pos.lon);
        const english = `Weather ${ req.params.city }, ${ moment(data.date).format('ddd DD/MM')}: ${ data.morning.description} morn. ${ data.evening.description} eve. Temp ${ Math.round(data.day.temperature_min) }C - ${ Math.round(data.day.temperature_max) }C. Wind ${ data.day.wind_direction } ${ beaufortWindName[data.day.beaufort_scale] }. Rain ${ data.day.precipitation }mm. Sunrise ${ moment(solarcalc.sunrise).format("HH:mm") } Sunset ${ moment(solarcalc.sunset).format("HH:mm") }. ${ moonPhase(solarcalc.lunarIlluminosity) }`
        res.locals = {
            id,
            data,
            pos,
            solarcalc,
            english
        }
        next();
    } catch(err) {
        console.error(new Date(), err);
        res.send(`Could not get weather info for ${req.params.city}`);
    }
}

server.get(`/english/:city/:date`, getData, async (req, res) => {
    try {
        res.send(res.locals.english);
    } catch(err) {
        console.error(new Date(), err);
        res.send(`Could not get weather info for ${req.params.city}`);
    }
})

server.get(`/offset/:city/:offset`, getData, async (req, res) => {
    try {
        res.send(res.locals.english);
    } catch(err) {
        console.error(new Date(), err);
        res.send(`Could not get weather info for ${req.params.city}`);
    }
})

server.get(`/offset/rss/:city/:offset`, getData, async (req, res) => {
    try {
        res.sendRaw(`<rss version="2.0">
<channel>
<title>Weather feed</title>
<description/>
<link>http://protoscape.co.za/weather/</link>
<lastBuildDate>${ moment().format("YYYY-MM-DDTHH:mm:ss.SS") }</lastBuildDate>
<pubDate>${ moment(last_update).format("YYYY-MM-DDTHH:mm:ss.SS") }</pubDate>
<item>
<title>Weather feed for Cape Town</title>
<description>
${res.locals.english}. MTN Play.
</description>
<guid isPermaLink="false">${ res.locals.id }</guid>
<pubDate>${ moment(last_update).format("YYYY-MM-DDTHH:mm:ss.SS") }</pubDate>
</item>
</channel>
</rss>`, { "Content-Type": "application/rss+xml" })
    } catch(err) {
        console.error(new Date(), err);
        res.send(`Could not get weather info for ${req.params.city}`);
    }
})

var last_update = new Date();

const sync = async () => {
    try {
        for (i in Cities) {
            try {
                console.log(new Date(), `Updating ${i}`);
                const weather = await yrno.getWeatherTomorrow(Cities[i])
                console.log(weather);
                const fname = `./data/${ i }-${ moment().add(1, "day").format("YYYY-MM-DD") }-new.json`;
                await fs.writeFile(fname, JSON.stringify(weather));
                last_update = new Date();
            } catch(err) {
                console.error(new Date(), err);
            }
        }
    } catch(err) {
        console.error(err);
    }
}

setInterval(sync, 3600000);
sync();