import json
import httpx
from urllib.parse import quote

# Weather codes from the API documentation to make them human-readable
WEATHER_CODES = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Depositing rime fog", 51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    56: "Light freezing drizzle", 57: "Dense freezing drizzle", 61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    66: "Light freezing rain", 67: "Heavy freezing rain", 71: "Slight snow fall", 73: "Moderate snow fall", 75: "Heavy snow fall",
    77: "Snow grains", 80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
    85: "Slight snow showers", 86: "Heavy snow showers", 95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail"
}

def get_tlt_journey_planner_link(origin: str, destination: str) -> dict:
    """
    Generates a pre-filled URL for the official Tallinn Transport (TLT) journey planner.
    """
    try:
        # URL encode the origin and destination to handle spaces and special characters
        origin_encoded = quote(origin)
        destination_encoded = quote(destination)

        # Construct the URL with the English language parameter
        planner_url = f"https://transport.tallinn.ee/#plan/{origin_encoded}/{destination_encoded}?lang=en"

        return {
            "summary": f"Route from {origin} to {destination}",
            "planner_link": planner_url
        }
    except Exception as e:
        print(f"ERROR: Could not generate TLT journey planner link: {e}")
        return {"error": "Could not create the journey planner link."}

async def get_live_weather_data() -> dict:
    """Fetches live weather data for Tallinn from a free weather API."""
    try:
        url = "https://api.open-meteo.com/v1/forecast?latitude=59.4370&longitude=24.7536&current=temperature_2m,weather_code"
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            response.raise_for_status()
            weather_api_data = response.json()
            current_temp = weather_api_data.get('current', {}).get('temperature_2m')
            weather_code = weather_api_data.get('current', {}).get('weather_code')
            return {"temperature_celsius": current_temp, "condition": WEATHER_CODES.get(weather_code, "Unknown condition")}
    except Exception as e:
        print(f"ERROR: Could not fetch live weather data: {e}")
        return {"error": "Could not retrieve live weather information."}

async def get_context_data(query: str) -> dict:
    """Orchestrates data gathering based on the user's query."""
    data = {}
    try:
        with open('data.json', 'r') as f:
            data = json.load(f)
    except Exception as e:
        print(f"ERROR reading data.json: {e}")

    data['current_weather'] = await get_live_weather_data()

    # Check for directions intent and fetch the journey planner link
    if any(keyword in query.lower() for keyword in ["direction", "get to", "bus", "route from", "how do i get", "transport"]):
        origin = "Mustamäe"
        # --- CHANGE ---
        # Using a specific, major bus stop near the destination is more reliable for routing APIs.
        destination = "Vabaduse väljak" # This is Freedom Square, a major hub next to the Old Town.

        directions_link = get_tlt_journey_planner_link(origin, destination)
        data['directions'] = directions_link

    return data


