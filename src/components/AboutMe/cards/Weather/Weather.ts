import { fetchWeatherApi } from "openmeteo";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register ScrollTrigger plugin
if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

export async function getWeather() {
    try {
        
        const params = {
            latitude: 35.4676,
            longitude: -97.5164,
            daily: ["temperature_2m_max", "temperature_2m_min"],
            current: ["temperature_2m", "snowfall", "rain", "showers", "wind_speed_10m", "wind_direction_10m", "is_day", "apparent_temperature"],
            timezone: "America/Chicago",
            wind_speed_unit: "mph",
            temperature_unit: "fahrenheit",
            precipitation_unit: "inch",
        };
        const url = "https://api.open-meteo.com/v1/forecast";
        const responses = await fetchWeatherApi(url, params);

        // Process first location. Add a for-loop for multiple locations or weather models
        const response = responses[0];

        // Attributes for timezone and location
        const latitude = response.latitude();
        const longitude = response.longitude();
        const elevation = response.elevation();
        const timezone = response.timezone();
        const timezoneAbbreviation = response.timezoneAbbreviation();
        const utcOffsetSeconds = response.utcOffsetSeconds();

        const current = response.current()!;
        const daily = response.daily()!;

        // Helper function to form time ranges
        const range = (start: number, stop: number, step: number) =>
            Array.from({ length: (stop - start) / step }, (_, i) => start + i * step);

        // Process daily data
        const dailyTime = range(Number(daily.time()), Number(daily.timeEnd()), daily.interval()).map(
            (t) => new Date((t + utcOffsetSeconds) * 1000)
        );
        const dailyTemperatureMax = daily.variables(0)!.valuesArray()!;
        const dailyTemperatureMin = daily.variables(1)!.valuesArray()!;

        // Note: The order of weather variables in the URL query and the indices below need to match!
        const weatherData = {
            current: {
                time: new Date((Number(current.time()) + utcOffsetSeconds) * 1000),
                temperature_2m: current.variables(0)!.value(),
                snowfall: current.variables(1)!.value(),
                rain: current.variables(2)!.value(),
                showers: current.variables(3)!.value(),
                wind_speed_10m: current.variables(4)!.value(),
                wind_direction_10m: current.variables(5)!.value(),
                is_day: current.variables(6)!.value(),
                apparent_temperature: current.variables(7)!.value(),
            },
            daily: {
                time: dailyTime[0], // Today's date
                temperature_2m_max: dailyTemperatureMax[0],
                temperature_2m_min: dailyTemperatureMin[0],
            },
        };

        return weatherData;
    } catch (error) {
        return null;
    }
}

// Helper function to get wind direction name from degrees
function getWindDirection(degrees: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return directions[Math.round(degrees / 22.5) % 16];
}

// Weather icon map - returns SVG path data for different weather conditions
export const weatherIcons = {
    raindrop: `<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="currentColor"/>`,
    showers: `<path d="M8 4l1 6h-2l-1-6h2zm8 0l1 6h-2l-1-6h2zm-4 0l1 6h-2l-1-6h2z" fill="currentColor"/><path d="M9 10v2m-1 2v2m2-4v2m1 2v2m-2-4v2m-1 2v2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
    snowflake: `<path d="M12 2 L12 8 M12 16 L12 22 M2 12 L8 12 M16 12 L22 12 M6.34 6.34 L10.59 10.59 M13.41 13.41 L17.66 17.66 M6.34 17.66 L10.59 13.41 M13.41 10.59 L17.66 6.34 M5.5 5.5 L9.5 9.5 M14.5 14.5 L18.5 18.5 M5.5 18.5 L9.5 14.5 M14.5 9.5 L18.5 5.5 M8 8 L10 10 M14 14 L16 16 M8 16 L10 14 M14 10 L16 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,
    sun: `<circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
    moon: `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/>`,
    wind: `<path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
};

export const weatherLightDarkTheme = {
    sunny: 'light',
    night: 'dark',
    cloudy: 'dark',
    snowy: 'dark',
    windy: 'light',
}

// Helper function to get the appropriate weather icon based on conditions
function getWeatherIcon(weather: { snowfall: number; rain: number; showers: number; is_day: number }): string {
    if (weather.snowfall > 0) {
        return weatherIcons.snowflake;
    }
    if (weather.showers > 0) {
        return weatherIcons.showers;
    }
    if (weather.rain > 0) {
        return weatherIcons.raindrop;
    }
    if (weather.is_day === 1) {
        return weatherIcons.sun;
    }
    return weatherIcons.moon;
}

function getWeatherImageKey(weather: { snowfall: number; rain: number; showers: number; is_day: number }): 'sunny' | 'night' | 'cloudy' | 'snowy' | 'windy' {
    if (weather.snowfall > 0) {
        return 'snowy';
    }
    if (weather.showers > 0 || weather.rain > 0) {
        return 'cloudy';
    } 
    if (weather.is_day === 1) {
        return 'sunny';
    }
    return 'night';
}

// Mock weather data for testing
const mockWeatherData = {
    current: {
        time: new Date(),
        temperature_2m: 50,
        snowfall: 0,
        rain: 0, // Raining
        showers: 0,
        wind_speed_10m: 8,
        wind_direction_10m: 225, // SW direction
        is_day: 1,
        apparent_temperature: 48,
    },
    daily: {
        time: new Date(),
        temperature_2m_max: 65,
        temperature_2m_min: 42,
    },
};

export async function initializeWeatherWidget() {
    const weatherWidget = document.getElementById('weather-widget');
    if (!weatherWidget) return;

    weatherWidget.setAttribute('data-loading', 'true');

    // Use mock data instead of API call for testing
    //const weather = mockWeatherData;
    const weather = await getWeather();
    if (!weather) return;

    const weatherContent = document.getElementById('weather-widget-content');
    if (!weatherContent) return;

    // Update weather icon
    const weatherIcon = document.getElementById('weather-icon');
    if (weatherIcon) {
        weatherIcon.innerHTML = getWeatherIcon(weather.current);
    }

    // Update weather image by showing/hiding pre-loaded images
    const imageKey = getWeatherImageKey(weather.current);
    
    // Hide all weather images first
    const allImages = document.querySelectorAll('.weather-image-option');
    allImages.forEach(img => {
        img.classList.add('hidden');
    });
    
    // Show the appropriate image
    const targetImage = document.getElementById(`weather-image-${imageKey}`);
    if (targetImage) {
        targetImage.classList.remove('hidden');
    }
    
    // Update widget theme attribute for text color
    if (weatherWidget && weatherLightDarkTheme[imageKey]) {
        weatherWidget.setAttribute('data-weather-theme', weatherLightDarkTheme[imageKey]);
    }
    
    // Update canvas animation attribute
    const canvas = document.getElementById('weather-canvas');
    if (canvas) {
        if (weather.current.snowfall > 0) {
            canvas.setAttribute('data-weather-animation', 'snowy');
        } else if (weather.current.rain > 0 || weather.current.showers > 0) {
            canvas.setAttribute('data-weather-animation', 'rainy');
        } else {
            canvas.setAttribute('data-weather-animation', 'clear');
        }
    }
    

    // Update temperature
    const weatherTemperature = document.getElementById('weather-temperature');
    if (weatherTemperature) {
        weatherTemperature.textContent = `${weather.current.temperature_2m.toFixed(0)}°F`;
    }

    // Update high/low temperatures
    const tempHigh = document.getElementById('temp-high');
    const tempLow = document.getElementById('temp-low');
    if (tempHigh && weather.daily) {
        tempHigh.textContent = weather.daily.temperature_2m_max.toFixed(0);
    }
    if (tempLow && weather.daily) {
        tempLow.textContent = weather.daily.temperature_2m_min.toFixed(0);
    }

    // Update wind speed and direction
    const windSpeed = document.getElementById('wind-speed');
    const windArrow = document.getElementById('wind-arrow');
    if (windSpeed) {
        windSpeed.textContent = `${weather.current.wind_speed_10m.toFixed(0)} mph ${getWindDirection(weather.current.wind_direction_10m)}`;
    }
    if (windArrow) {
        // Rotate arrow to point in wind direction (wind_direction_10m is where wind comes FROM)
        // Arrow points in direction wind is blowing TO (opposite direction)
        // arguments are: rotate(angle in degrees, x, y)
        windArrow.setAttribute('transform', `rotate(${weather.current.wind_direction_10m + 180} 25 25)`);
    }

    weatherWidget.setAttribute('data-loading', 'false');

    // Animate sections when data loads and content enters viewport
    const sections = gsap.utils.toArray('.weather-section') as HTMLElement[];
    if (sections.length > 0) {
        gsap.fromTo(sections, {
            y: 20,
            opacity: 0,
        }, {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: 'power3.out',
            stagger: 0.1,
            scrollTrigger: {
                trigger: weatherWidget,
                start: 'top 80%', // Trigger when top of element is 80% down viewport
                once: true, // Only animate once
            }
        });
    }


    
}