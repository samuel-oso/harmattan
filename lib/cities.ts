// code is the IATA code of the main airport serving the city, used as a short station name
export type City = { slug: string; code: string; name: string; country: string; lat: number; lon: number; tz: string };

// coordinates and time zones from Open-Meteo's geocoding API
export const CITIES: City[] = [
  { slug: "lagos", code: "LOS", name: "Lagos", country: "Nigeria", lat: 6.4541, lon: 3.3947, tz: "Africa/Lagos" },
  { slug: "abuja", code: "ABV", name: "Abuja", country: "Nigeria", lat: 9.0579, lon: 7.4951, tz: "Africa/Lagos" },
  { slug: "kano", code: "KAN", name: "Kano", country: "Nigeria", lat: 12.0001, lon: 8.5167, tz: "Africa/Lagos" },
  { slug: "accra", code: "ACC", name: "Accra", country: "Ghana", lat: 5.556, lon: -0.1969, tz: "Africa/Accra" },
  { slug: "abidjan", code: "ABJ", name: "Abidjan", country: "Côte d’Ivoire", lat: 5.3544, lon: -4.0017, tz: "Africa/Abidjan" },
  { slug: "dakar", code: "DSS", name: "Dakar", country: "Senegal", lat: 14.6937, lon: -17.4441, tz: "Africa/Dakar" },
  { slug: "bamako", code: "BKO", name: "Bamako", country: "Mali", lat: 12.6091, lon: -7.9752, tz: "Africa/Bamako" },
  { slug: "ouagadougou", code: "OUA", name: "Ouagadougou", country: "Burkina Faso", lat: 12.3657, lon: -1.5339, tz: "Africa/Ouagadougou" },
  { slug: "niamey", code: "NIM", name: "Niamey", country: "Niger", lat: 13.5137, lon: 2.1098, tz: "Africa/Niamey" },
  { slug: "cairo", code: "CAI", name: "Cairo", country: "Egypt", lat: 30.0626, lon: 31.2497, tz: "Africa/Cairo" },
  { slug: "casablanca", code: "CMN", name: "Casablanca", country: "Morocco", lat: 33.5883, lon: -7.6114, tz: "Africa/Casablanca" },
  { slug: "khartoum", code: "KRT", name: "Khartoum", country: "Sudan", lat: 15.5518, lon: 32.5324, tz: "Africa/Khartoum" },
  { slug: "addis-ababa", code: "ADD", name: "Addis Ababa", country: "Ethiopia", lat: 9.025, lon: 38.7469, tz: "Africa/Addis_Ababa" },
  { slug: "nairobi", code: "NBO", name: "Nairobi", country: "Kenya", lat: -1.2833, lon: 36.8167, tz: "Africa/Nairobi" },
  { slug: "kampala", code: "EBB", name: "Kampala", country: "Uganda", lat: 0.3163, lon: 32.5822, tz: "Africa/Kampala" },
  { slug: "dar-es-salaam", code: "DAR", name: "Dar es Salaam", country: "Tanzania", lat: -6.8235, lon: 39.2695, tz: "Africa/Dar_es_Salaam" },
  { slug: "kinshasa", code: "FIH", name: "Kinshasa", country: "DR Congo", lat: -4.3276, lon: 15.3136, tz: "Africa/Kinshasa" },
  { slug: "luanda", code: "LAD", name: "Luanda", country: "Angola", lat: -8.8368, lon: 13.2343, tz: "Africa/Luanda" },
  { slug: "johannesburg", code: "JNB", name: "Johannesburg", country: "South Africa", lat: -26.2023, lon: 28.0436, tz: "Africa/Johannesburg" },
  { slug: "cape-town", code: "CPT", name: "Cape Town", country: "South Africa", lat: -33.9258, lon: 18.4232, tz: "Africa/Johannesburg" },
];

export const HOME = "lagos";
export const cityBySlug = (slug: string) => CITIES.find((c) => c.slug === slug);
