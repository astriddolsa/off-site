// ==================== STATE ====================

const VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY="AIzaSyDg_s87-w7ARUVSaoyrDoxd_lNSIKaxea8"
const VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID="66a32682faa1cf2628d20552f144b60a"

// Load Google Maps JS API (Places library) dynamically for client-side Places lookups
let _placesServiceReady = false;
let _placesService = null;
function loadPlacesAPI() {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps && window.google.maps.places) {
      _placesServiceReady = true;
      return resolve();
    }

    window.__initOffsitePlaces = function() {
      _placesServiceReady = true;
      resolve();
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY}&libraries=places&callback=__initOffsitePlaces`;
    script.async = true;
    script.defer = true;
    script.onerror = (e) => reject(new Error('Failed to load Google Maps API'));
    document.head.appendChild(script);
  }).then(() => {
    // Create an offscreen map element for the PlacesService
    const mapDiv = document.createElement('div');
    mapDiv.style.width = '1px';
    mapDiv.style.height = '1px';
    mapDiv.style.position = 'absolute';
    mapDiv.style.left = '-9999px';
    document.body.appendChild(mapDiv);
    const map = new google.maps.Map(mapDiv, { center: { lat: 0, lng: 0 }, zoom: 15 });
    _placesService = new google.maps.places.PlacesService(map);
    return;
  });
}

// map activity keywords by sport
function getSportKeywords(sport) {
  const key = String(sport || '').toLowerCase();
  const map = {
    football: 'football field',
    basketball: 'basketball court',
    tennis: 'tennis court',
    volleyball: 'volleyball beach volleyball court',
    yoga: 'yoga studio',
    running: 'running track',
    surfing: 'surf',
    climbing: 'climbing bouldering gym',
    swimming: 'swimming pool',
    cycling: 'cycling track',
    boxing: 'boxing gym',
    mma: 'mma gym',
    'jiu jitsu': 'jiu jitsu gym',
    'krav maga': 'krav maga gym',
    'muay thai': 'muay thai gym',
    taekwondo: 'taekwondo gym',
    combat: 'martial arts gym',
    'combat sports': 'martial arts gym',
    other: 'martial arts gym',
    golf: 'golf course'
  };
  return map[key] || 'sports facility';
}

function detectSportFromPlace(place) {
  const types = (place.types || []).map(t => String(t).toLowerCase());
  const name = (place.name || '');

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function containsWord(haystack, word) {
    try {
      const re = new RegExp('\\b' + escapeRe(word) + '\\b', 'i');
      return re.test(haystack || '');
    } catch (e) { return (haystack || '').toLowerCase().includes(word.toLowerCase()); }
  }

  if (types.includes('stadium') || types.includes('soccer') || containsWord(name, 'soccer') || containsWord(name, 'football')) return 'Football';
  if (types.includes('basketball') || containsWord(name, 'basketball')) return 'Basketball';
  if (types.includes('tennis') || containsWord(name, 'tennis')) return 'Tennis';
  if (types.includes('volleyball') || containsWord(name, 'volleyball') || containsWord(name, 'beach volleyball')) return 'Volleyball';
  if (types.includes('yoga_studio') || containsWord(name, 'yoga')) return 'Yoga';
  if (types.includes('swimming_pool') || containsWord(name, 'pool') || containsWord(name, 'swim')) return 'Swimming';
  if (types.includes('beach') || containsWord(name, 'surf') || containsWord(name, 'surfing')) return 'Surfing';
  if (types.includes('climbing_gym') || containsWord(name, 'climb') || containsWord(name, 'climbing') || containsWord(name, 'boulder') || containsWord(name, 'bouldering') || containsWord(name, 'rock gym')) return 'Climbing';
  if (types.includes('golf_course') || containsWord(name, 'golf')) return 'Golf';
  if (types.includes('bicycle_store') || containsWord(name, 'cycling') || containsWord(name, 'cycle') || containsWord(name, 'bike')) return 'Cycling';
  if (containsWord(name, 'boxing') || containsWord(name, 'fight club') || containsWord(name, 'boxing gym')) return 'Boxing';
  if (containsWord(name, 'mma') || containsWord(name, 'mixed martial arts')) return 'MMA';
  if (containsWord(name, 'jiu jitsu') || containsWord(name, 'jiujitsu')) return 'Jiu Jitsu';
  if (containsWord(name, 'krav maga')) return 'Krav Maga';
  if (containsWord(name, 'muay thai')) return 'Muay Thai';
  if (containsWord(name, 'taekwondo') || containsWord(name, 'tae kwon do') || containsWord(name, 'tkd')) return 'Taekwondo';
  if (containsWord(name, 'martial arts') || containsWord(name, 'dojo')) return 'Combat Sports';
  if (types.includes('park') || containsWord(name, 'park') || containsWord(name, 'trail') || containsWord(name, 'running')) return 'Running';
  if (types.includes('gym') || types.includes('fitness_center') || containsWord(name, 'gym') || containsWord(name, 'fitness')) return 'Fitness';

  // If nothing specific matched, return null so we avoid incorrect specific tags
  return null;
}

function isRetailPlace(place) {
  const types = (place.types || []).join(' ').toLowerCase();
  const name = (place.name || '').toLowerCase();
  const retailTerms = ['store', 'shop', 'boutique', 'outlet', 'mall', 'equipment', 'clothing', 'apparel', 'sportswear', 'bike shop', 'tire shop'];
  const retailTypes = ['store', 'shoe_store', 'clothing_store', 'electronics_store', 'department_store', 'home_goods_store'];
  return retailTypes.some(type => types.includes(type)) || retailTerms.some(term => types.includes(term) || name.includes(term));
}

function isSportsPlace(place) {
  const types = (place.types || []).join(' ').toLowerCase();
  const name = (place.name || '').toLowerCase();
  const sportVenueTypes = [
    'stadium', 'gym', 'sports_complex', 'park', 'bowling_alley', 'tennis_court',
    'fitness_center', 'swimming_pool', 'yoga_studio', 'climbing_gym', 'track', 'field', 'court',
    'playground', 'hiking_trail', 'golf_course', 'cycling_track'
  ];
  const sportTerms = [
    'sports', 'stadium', 'soccer', 'football', 'gym', 'fitness', 'park', 'running', 'basketball',
    'tennis', 'volleyball', 'beach volleyball', 'yoga', 'pool', 'swim', 'surf', 'climbing', 'boulder', 'bouldering', 'golf', 'cycling',
    'track', 'field', 'court', 'martial', 'boxing', 'dojo', 'athletic', 'recreation', 'studio',
    'mma', 'jiu jitsu', 'jiujitsu', 'bjj', 'krav maga', 'muay thai', 'taekwondo', 'fight'
  ];
  if (isRetailPlace(place)) return false;
  return sportVenueTypes.some(type => types.includes(type)) || sportTerms.some(term => types.includes(term) || name.includes(term));
}

function getPlacePhotoUrl(place) {
  if (!place.photos || place.photos.length === 0) return null;
  const photo = place.photos.find(p => p.photo_reference || typeof p.getUrl === 'function');
  if (!photo) return null;
  if (typeof photo.getUrl === 'function') {
    return photo.getUrl({ maxWidth: 400 });
  }
  if (photo.photo_reference) {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photo.photo_reference}&key=${VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY}`;
  }
  return null;
}

function getPlaceImage(place) {
  const sport = detectSportFromPlace(place);
  if (!isSportsPlace(place)) {
    return getImageForSport(sport || 'Football');
  }
  const photoUrl = getPlacePhotoUrl(place);
  return photoUrl || getImageForSport(sport || 'Football');
}

async function fetchPlaceDetails(placeId) {
  try {
    await loadPlacesAPI();
    if (!_placesService) return null;
    const request = { placeId, fields: ['place_id','name','opening_hours','website','formatted_phone_number','types','url','formatted_address','business_status'] };
    const details = await new Promise((resolve) => {
      _placesService.getDetails(request, (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place) return resolve(null);
        resolve(place);
      });
    });
    return details;
  } catch (err) {
    console.error('Error fetching place details', err);
    return null;
  }
}

function inferReservationMembership(details) {
  if (!details) return 'Check the venue website for membership or reservation terms.';

  const types = (details.types || []).map(t => String(t).toLowerCase());
  const fields = [details.name, details.website, details.url, details.formatted_address].filter(Boolean).join(' ').toLowerCase();

  const membershipKeywords = ['club', 'membership', 'members-only', 'private', 'exclusive', 'annual pass', 'monthly pass', 'sign up', 'join now', 'become a member', 'member login'];
  const publicKeywords = ['park', 'beach', 'playground', 'public', 'municipal', 'city', 'community center', 'recreation center', 'sports complex', 'open to public'];

  const hasMembershipHint = membershipKeywords.some(keyword => fields.includes(keyword));
  const hasPublicHint = publicKeywords.some(keyword => fields.includes(keyword));
  const isGymLike = types.includes('gym') || types.includes('fitness_center') || types.includes('health') || types.includes('sports_club') || types.includes('health_spa') || types.includes('yoga_studio');
  const isPublicLike = types.includes('park') || types.includes('beach') || types.includes('playground') || types.includes('stadium') || types.includes('hiking_trail') || types.includes('tourist_attraction');

  if (hasMembershipHint || isGymLike) {
    return 'Membership or paid access likely.';
  }
  if (hasPublicHint || isPublicLike) {
    return 'Likely public/open.';
  }
  if (/book|reserve|booking|class|appointment|lesson|court reservation/.test(fields)) {
    return 'Reservation may be required.';
  }
  return 'Check the venue website.';
}


function calcDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI/180) *
    Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLon / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
}

async function fetchNearby({ lat, lng, radius = 5000, keyword = 'sports' }) {
  try {
    await loadPlacesAPI();
    if (!_placesService) return [];

    const request = {
      location: new google.maps.LatLng(Number(lat), Number(lng)),
      radius: Number(radius),
      type: 'establishment',
      keyword: String(keyword || 'sports')
    };

    const results = await new Promise((resolve) => {
      _placesService.nearbySearch(request, (places, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !places) return resolve([]);
        resolve(places);
      });
    });

    const filteredResults = (results || []).filter(isSportsPlace).slice(0, 20);
    return filteredResults.map(place => {
      const sport = detectSportFromPlace(place);
      return {
        id: place.place_id,
        title: place.name,
        sport,
        category: getCategoryForSport(sport),
        image: getPlaceImage(place),
        fallbackImage: getImageForSport(sport),
        date: "Flexible",
        time: "Anytime",
        location: place.vicinity || (place.formatted_address || ''),
        coords: {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        },
        level: "All Levels",
        spots: `${Math.floor(Math.random() * 5 + 3)}/10`,
        description: (place.types || []).join(', '),
        host: {
          name: "Nearby Host",
          bio: "Auto-generated activity",
          image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100"
        },
        participants: [],
        openNow: place.opening_hours?.open_now || false,
        rating: place.rating || null,
        placeId: place.place_id,
        mapsUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
        raw: place,
        distance: calcDistance(lat, lng, place.geometry.location.lat(), place.geometry.location.lng())
      };
    });

  } catch (err) {
    console.error("Places API error:", err);
    return [];
  }
}

const state = {
  user: null,
  lastFetched: null,
  runningLocationSuggestions: [],
  selectedDiscoverView: 'venues',
  selectedRadiusKm: 5,
  activities: [
    { id: 1, title: 'Sunday Morning Football', sport: 'Football', category: 'team', image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=600&fit=crop', date: 'Sun, Jun 28', time: '9:00 AM', location: 'Central Park Field 3', country: 'US', coords: { lat: 40.785091, lng: -73.968285 }, level: 'All Levels', spots: '8/12', description: 'Casual 5-a-side football. All skill levels welcome. Bring water and good vibes. We usually grab coffee after.', host: { name: 'Marcus Chen', bio: 'Football enthusiast. Organizer of Sunday matches for 2 years.', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face' }, participants: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&crop=face','https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&h=60&fit=crop&crop=face','https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&crop=face'] },
    { id: 2, title: 'Beach Volleyball at Sunset', sport: 'Volleyball', category: 'team', image: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400&h=460&fit=crop', date: 'Sat, Jun 27', time: '6:30 PM', location: 'Venice Beach Courts', country: 'US', coords: { lat: 33.985047, lng: -118.469483 }, level: 'Intermediate', spots: '4/6', description: 'Beach volleyball as the sun goes down. Intermediate level preferred. Nets provided.', host: { name: 'Sofia Reyes', bio: 'Beach volleyball player. Love the sand and the sunset.', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face' }, participants: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face','https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&crop=face'] },
    { id: 3, title: 'Tennis Doubles', sport: 'Tennis', category: 'racket', image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400&h=550&fit=crop', date: 'Mon, Jun 29', time: '7:00 PM', location: 'Riverside Tennis Club', country: 'US', coords: { lat: 40.728224, lng: -73.794852 }, level: 'Intermediate', spots: '2/4', description: 'Looking for two more players for doubles. Courts reserved for 2 hours.', host: { name: 'James Park', bio: 'Tennis coach and player. Always looking for good matches.', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face' }, participants: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&crop=face'] },
    { id: 4, title: 'Morning Yoga in the Park', sport: 'Yoga', category: 'fitness', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=520&fit=crop', date: 'Sat, Jun 27', time: '8:00 AM', location: 'Griffith Park Lawn', country: 'US', coords: { lat: 34.136554, lng: -118.294228 }, level: 'All Levels', spots: '15/20', description: 'Free community yoga session. Bring your own mat. All levels welcome. Donations appreciated.', host: { name: 'Aria Thompson', bio: 'Yoga instructor. Believes movement is medicine.', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face' }, participants: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face','https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&h=60&fit=crop&crop=face','https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&crop=face','https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&crop=face'] },
    { id: 5, title: 'Sunrise Run Crew', sport: 'Running', category: 'outdoor', image: 'https://images.unsplash.com/photo-1552674605-4694c0cc5ce6?w=400&h=450&fit=crop', date: 'Tue, Jun 30', time: '6:00 AM', location: 'Santa Monica Pier', country: 'US', coords: { lat: 34.009351, lng: -118.497092 }, level: 'All Levels', spots: '10/15', description: 'Easy 5K along the beach. No one gets left behind. Coffee after at Groundwork.', host: { name: 'Diego Martinez', bio: 'Morning person. Runner. Coffee lover.', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face' }, participants: ['https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&h=60&fit=crop&crop=face','https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&crop=face'] },
    { id: 6, title: 'Surf Session', sport: 'Surfing', category: 'water', image: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=400&h=580&fit=crop', date: 'Sun, Jun 28', time: '7:00 AM', location: 'Malibu Surfrider Beach', country: 'US', coords: { lat: 34.035591, lng: -118.678658 }, level: 'Intermediate', spots: '3/5', description: 'Dawn patrol surf session. Boards available to borrow. Must be comfortable in overhead waves.', host: { name: 'Kai Nakamura', bio: 'Surfer since age 8. Malibu local.', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face' }, participants: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face'] },
    { id: 7, title: 'Indoor Climbing', sport: 'Climbing', category: 'fitness', image: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=400&h=490&fit=crop', date: 'Wed, Jul 1', time: '6:00 PM', location: 'Boulder Basin Gym', country: 'US', coords: { lat: 34.052235, lng: -118.243685 }, level: 'All Levels', spots: '5/8', description: 'Bouldering session for all levels. Shoe rental available. First-timers welcome.', host: { name: 'Lena Volkov', bio: 'Climbing instructor. Problem solver on and off the wall.', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face' }, participants: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=60&h=60&fit=crop&crop=face','https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face'] },
  ],
  saved: new Set(),
  joined: new Set(),
  currentDetailId: null,
  selectedSport: null,
  selectedCombat: 'all',
  selectedVisibility: 'public',
  currentProfileTab: 'joined',
  userLocation: null,
  activityChats: {},
  manualActivities: [],
  connections: new Set()
};

const sportsData = [
  { name: 'Football', emoji: '⚽', category: 'team' },
  { name: 'Basketball', emoji: '🏀', category: 'team' },
  { name: 'Tennis', emoji: '🎾', category: 'racket' },
  { name: 'Swimming', emoji: '🏊', category: 'water' },
  { name: 'Yoga', emoji: '🧘', category: 'fitness' },
  { name: 'Running', emoji: '🏃', category: 'outdoor' },
  { name: 'Surfing', emoji: '🏄', category: 'water' },
  { name: 'Cycling', emoji: '🚴', category: 'outdoor' },
  { name: 'Combat Sports', emoji: '🥊', category: 'combat' },
  { name: 'Volleyball', emoji: '🏐', category: 'team' },
  { name: 'Golf', emoji: '⛳', category: 'outdoor' },
  { name: 'Climbing', emoji: '🧗', category: 'fitness' },
];

const allCountries = [
  { code: "AF", name: "Afghanistan" }, { code: "AX", name: "Åland Islands" },
  { code: "AL", name: "Albania" }, { code: "DZ", name: "Algeria" },
  { code: "AS", name: "American Samoa" }, { code: "AD", name: "Andorra" },
  { code: "AO", name: "Angola" }, { code: "AI", name: "Anguilla" },
  { code: "AQ", name: "Antarctica" }, { code: "AG", name: "Antigua and Barbuda" },
  { code: "AR", name: "Argentina" }, { code: "AM", name: "Armenia" },
  { code: "AW", name: "Aruba" }, { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" }, { code: "AZ", name: "Azerbaijan" },
  { code: "BS", name: "Bahamas" }, { code: "BH", name: "Bahrain" },
  { code: "BD", name: "Bangladesh" }, { code: "BB", name: "Barbados" },
  { code: "BY", name: "Belarus" }, { code: "BE", name: "Belgium" },
  { code: "BZ", name: "Belize" }, { code: "BJ", name: "Benin" },
  { code: "BM", name: "Bermuda" }, { code: "BT", name: "Bhutan" },
  { code: "BO", name: "Bolivia" }, { code: "BQ", name: "Bonaire" },
  { code: "BA", name: "Bosnia and Herzegovina" }, { code: "BW", name: "Botswana" },
  { code: "BR", name: "Brazil" }, { code: "IO", name: "British Indian Ocean Territory" },
  { code: "BN", name: "Brunei" }, { code: "BG", name: "Bulgaria" },
  { code: "BF", name: "Burkina Faso" }, { code: "BI", name: "Burundi" },
  { code: "CV", name: "Cabo Verde" }, { code: "KH", name: "Cambodia" },
  { code: "CM", name: "Cameroon" }, { code: "CA", name: "Canada" },
  { code: "KY", name: "Cayman Islands" }, { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" }, { code: "CL", name: "Chile" },
  { code: "CN", name: "China" }, { code: "CO", name: "Colombia" },
  { code: "KM", name: "Comoros" }, { code: "CG", name: "Congo" },
  { code: "CD", name: "Congo, Democratic Republic of" }, { code: "CK", name: "Cook Islands" },
  { code: "CR", name: "Costa Rica" }, { code: "HR", name: "Croatia" },
  { code: "CU", name: "Cuba" }, { code: "CW", name: "Curaçao" },
  { code: "CY", name: "Cyprus" }, { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" }, { code: "DJ", name: "Djibouti" },
  { code: "DM", name: "Dominica" }, { code: "DO", name: "Dominican Republic" },
  { code: "EC", name: "Ecuador" }, { code: "EG", name: "Egypt" },
  { code: "SV", name: "El Salvador" }, { code: "GQ", name: "Equatorial Guinea" },
  { code: "ER", name: "Eritrea" }, { code: "EE", name: "Estonia" },
  { code: "SZ", name: "Eswatini" }, { code: "ET", name: "Ethiopia" },
  { code: "FK", name: "Falkland Islands" }, { code: "FO", name: "Faroe Islands" },
  { code: "FJ", name: "Fiji" }, { code: "FI", name: "Finland" },
  { code: "FR", name: "France" }, { code: "GF", name: "French Guiana" },
  { code: "PF", name: "French Polynesia" }, { code: "GA", name: "Gabon" },
  { code: "GM", name: "Gambia" }, { code: "GE", name: "Georgia" },
  { code: "DE", name: "Germany" }, { code: "GH", name: "Ghana" },
  { code: "GI", name: "Gibraltar" }, { code: "GR", name: "Greece" },
  { code: "GL", name: "Greenland" }, { code: "GD", name: "Grenada" },
  { code: "GP", name: "Guadeloupe" }, { code: "GU", name: "Guam" },
  { code: "GT", name: "Guatemala" }, { code: "GG", name: "Guernsey" },
  { code: "GN", name: "Guinea" }, { code: "GW", name: "Guinea-Bissau" },
  { code: "GY", name: "Guyana" }, { code: "HT", name: "Haiti" },
  { code: "HN", name: "Honduras" }, { code: "HK", name: "Hong Kong" },
  { code: "HU", name: "Hungary" }, { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" }, { code: "ID", name: "Indonesia" },
  { code: "IR", name: "Iran" }, { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" }, { code: "IM", name: "Isle of Man" },
  { code: "IL", name: "Israel" }, { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" }, { code: "JP", name: "Japan" },
  { code: "JE", name: "Jersey" }, { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" }, { code: "KE", name: "Kenya" },
  { code: "KI", name: "Kiribati" }, { code: "KP", name: "Korea, North" },
  { code: "KR", name: "Korea, South" }, { code: "KW", name: "Kuwait" },
  { code: "KG", name: "Kyrgyzstan" }, { code: "LA", name: "Laos" },
  { code: "LV", name: "Latvia" }, { code: "LB", name: "Lebanon" },
  { code: "LS", name: "Lesotho" }, { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libya" }, { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lithuania" }, { code: "LU", name: "Luxembourg" },
  { code: "MO", name: "Macao" }, { code: "MG", name: "Madagascar" },
  { code: "MW", name: "Malawi" }, { code: "MY", name: "Malaysia" },
  { code: "MV", name: "Maldives" }, { code: "ML", name: "Mali" },
  { code: "MT", name: "Malta" }, { code: "MH", name: "Marshall Islands" },
  { code: "MQ", name: "Martinique" }, { code: "MR", name: "Mauritania" },
  { code: "MU", name: "Mauritius" }, { code: "YT", name: "Mayotte" },
  { code: "MX", name: "Mexico" }, { code: "FM", name: "Micronesia" },
  { code: "MD", name: "Moldova" }, { code: "MC", name: "Monaco" },
  { code: "MN", name: "Mongolia" }, { code: "ME", name: "Montenegro" },
  { code: "MS", name: "Montserrat" }, { code: "MA", name: "Morocco" },
  { code: "MZ", name: "Mozambique" }, { code: "MM", name: "Myanmar" },
  { code: "NA", name: "Namibia" }, { code: "NR", name: "Nauru" },
  { code: "NP", name: "Nepal" }, { code: "NL", name: "Netherlands" },
  { code: "NC", name: "New Caledonia" }, { code: "NZ", name: "New Zealand" },
  { code: "NI", name: "Nicaragua" }, { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" }, { code: "NU", name: "Niue" },
  { code: "NF", name: "Norfolk Island" }, { code: "MK", name: "North Macedonia" },
  { code: "MP", name: "Northern Mariana Islands" }, { code: "NO", name: "Norway" },
  { code: "OM", name: "Oman" }, { code: "PK", name: "Pakistan" },
  { code: "PW", name: "Palau" }, { code: "PS", name: "Palestine" },
  { code: "PA", name: "Panama" }, { code: "PG", name: "Papua New Guinea" },
  { code: "PY", name: "Paraguay" }, { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" }, { code: "PN", name: "Pitcairn" },
  { code: "PL", name: "Poland" }, { code: "PT", name: "Portugal" },
  { code: "PR", name: "Puerto Rico" }, { code: "QA", name: "Qatar" },
  { code: "RE", name: "Réunion" }, { code: "RO", name: "Romania" },
  { code: "RU", name: "Russian Federation" }, { code: "RW", name: "Rwanda" },
  { code: "BL", name: "Saint Barthélemy" }, { code: "SH", name: "Saint Helena" },
  { code: "KN", name: "Saint Kitts and Nevis" }, { code: "LC", name: "Saint Lucia" },
  { code: "MF", name: "Saint Martin" }, { code: "PM", name: "Saint Pierre and Miquelon" },
  { code: "VC", name: "Saint Vincent and the Grenadines" }, { code: "WS", name: "Samoa" },
  { code: "SM", name: "San Marino" }, { code: "ST", name: "Sao Tome and Principe" },
  { code: "SA", name: "Saudi Arabia" }, { code: "SN", name: "Senegal" },
  { code: "RS", name: "Serbia" }, { code: "SC", name: "Seychelles" },
  { code: "SL", name: "Sierra Leone" }, { code: "SG", name: "Singapore" },
  { code: "SX", name: "Sint Maarten" }, { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" }, { code: "SB", name: "Solomon Islands" },
  { code: "SO", name: "Somalia" }, { code: "ZA", name: "South Africa" },
  { code: "GS", name: "South Georgia" }, { code: "SS", name: "South Sudan" },
  { code: "ES", name: "Spain" }, { code: "LK", name: "Sri Lanka" },
  { code: "SD", name: "Sudan" }, { code: "SR", name: "Suriname" },
  { code: "SJ", name: "Svalbard and Jan Mayen" }, { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" }, { code: "SY", name: "Syria" },
  { code: "TW", name: "Taiwan" }, { code: "TJ", name: "Tajikistan" },
  { code: "TZ", name: "Tanzania" }, { code: "TH", name: "Thailand" },
  { code: "TL", name: "Timor-Leste" }, { code: "TG", name: "Togo" },
  { code: "TK", name: "Tokelau" }, { code: "TO", name: "Tonga" },
  { code: "TT", name: "Trinidad and Tobago" }, { code: "TN", name: "Tunisia" },
  { code: "TR", name: "Turkey" }, { code: "TM", name: "Turkmenistan" },
  { code: "TC", name: "Turks and Caicos Islands" }, { code: "TV", name: "Tuvalu" },
  { code: "UG", name: "Uganda" }, { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" }, { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States of America" }, { code: "UM", name: "United States Minor Outlying Islands" },
  { code: "UY", name: "Uruguay" }, { code: "UZ", name: "Uzbekistan" },
  { code: "VU", name: "Vanuatu" }, { code: "VA", name: "Vatican City" },
  { code: "VE", name: "Venezuela" }, { code: "VN", name: "Vietnam" },
  { code: "VG", name: "Virgin Islands, British" }, { code: "VI", name: "Virgin Islands, U.S." },
  { code: "WF", name: "Wallis and Futuna" }, { code: "EH", name: "Western Sahara" },
  { code: "YE", name: "Yemen" }, { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" }
];

// ==================== NAVIGATION ====================
function navTo(screen) {
  if (!localStorage.getItem('userCountry') && screen !== 'country') return;
  if ((screen === 'create' || screen === 'profile') && !state.user) {
    showAuth();
    return;
  }
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + screen).classList.add('active');

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (screen === 'discover') document.querySelectorAll('.nav-item')[0].classList.add('active');
  if (screen === 'saved') document.querySelectorAll('.nav-item')[1].classList.add('active');
  if (screen === 'profile') document.querySelectorAll('.nav-item')[3].classList.add('active');

  window.scrollTo(0, 0);

  if (screen === 'discover') renderDiscover();
  if (screen === 'saved') renderSaved();
  if (screen === 'profile') renderProfile();
  if (screen === 'create') renderSportGrid();
}

function navToScreen(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + screen).classList.add('active');
  window.scrollTo(0, 0);
}

function setDiscoverView(view) {
  state.selectedDiscoverView = view;
  const v = document.getElementById('tab-venues');
  const m = document.getElementById('tab-matches');
  if (v) v.classList.toggle('active', view === 'venues');
  if (m) m.classList.toggle('active', view === 'matches');
  renderDiscoverFilters(view);
  renderDiscover();
}

function getActiveDiscoverSelection() {
  const activeFilter = document.querySelector('#filterScroll .filter-chip.active')?.dataset.filter || 'all';
  const combatSubfilter = activeFilter === 'combat' ? (state.selectedCombat || 'all') : 'all';
  return { filter: activeFilter, combatSubfilter };
}

function setDiscoverRadius(value) {
  const radiusKm = Number(value);
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) return;
  state.selectedRadiusKm = radiusKm;
  const { filter, combatSubfilter } = getActiveDiscoverSelection();
  renderDiscover(filter, combatSubfilter);
}

function renderDiscoverFilters(view) {
  const container = document.getElementById('filterScroll');
  if (!container) return;
  container.innerHTML = '';

  // Build a list of filter buttons: All + sports names
  const btnAll = document.createElement('button');
  btnAll.className = 'filter-chip active';
  btnAll.dataset.filter = 'all';
  btnAll.textContent = 'All';
  container.appendChild(btnAll);

  // Use sportsData to create sport-specific chips (friendly labels)
  sportsData.forEach(s => {
    const b = document.createElement('button');
    b.className = 'filter-chip';
    b.dataset.filter = s.name === 'Combat Sports' ? 'combat' : s.name.toLowerCase();
    b.textContent = s.name;
    container.appendChild(b);
  });

  // Hook up click handlers
  container.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const filter = chip.dataset.filter;
      if (filter === 'combat') {
        renderCombatSubfilters(true);
        renderDiscover('combat', state.selectedCombat || 'all');
      } else {
        renderCombatSubfilters(false);
        renderDiscover(filter);
      }
    });
  });

  renderCombatSubfilters(false);
}

function renderCombatSubfilters(show) {
  const combatRow = document.getElementById('combatFilterScroll');
  if (!combatRow) return;
  combatRow.style.display = show ? 'flex' : 'none';
  if (!show) return;

  combatRow.querySelectorAll('.filter-chip').forEach(chip => {
    chip.onclick = (e) => {
      e.stopPropagation();
      combatRow.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.selectedCombat = chip.dataset.combat;
      renderDiscover('combat', chip.dataset.combat);
    };
    chip.classList.toggle('active', chip.dataset.combat === state.selectedCombat);
  });
}

function setDiscoverNotice(message) {
  const discoverScreen = document.getElementById('screen-discover');
  const grid = document.getElementById('discoverGrid');
  if (!discoverScreen || !grid) return;

  let note = document.getElementById('discoverNotice');
  if (!note) {
    note = document.createElement('div');
    note.id = 'discoverNotice';
    note.style.margin = '8px 16px 0';
    note.style.padding = '10px 12px';
    note.style.borderRadius = '12px';
    note.style.background = 'rgba(19, 98, 70, 0.08)';
    note.style.border = '1px solid rgba(19, 98, 70, 0.25)';
    note.style.color = 'var(--text-secondary)';
    note.style.fontSize = '13px';
    note.style.lineHeight = '1.35';
    discoverScreen.insertBefore(note, grid);
  }

  if (!message) {
    note.style.display = 'none';
    note.textContent = '';
    return;
  }

  note.style.display = 'block';
  note.textContent = message;
}

function formatSpotsLabel(spots) {
  return spots ? String(spots) : 'No spots info';
}

// ==================== DISCOVER ====================
async function renderDiscover(filter, combatSubfilter = 'all') {
  const col1 = document.getElementById('col1');
  const col2 = document.getElementById('col2');
  col1.innerHTML = '';
  col2.innerHTML = '';

  const view = state.selectedDiscoverView || 'venues';
  const radiusKm = Number(state.selectedRadiusKm) || 5;
  const radiusMeters = Math.round(radiusKm * 1000);

  // search term and category filter helpers
  const searchTerm = document.getElementById('searchInput')?.value?.toLowerCase() || '';
  const matchesCategory = (item) => {
    if (!filter || filter === 'all') return true;
    const f = String(filter).toLowerCase();
    if ((item.category || '').toLowerCase() === f) return true;
    if ((item.sport || '').toLowerCase() === f) return true;
    // allow partial matches (e.g., 'ball' matching 'basketball')
    if ((item.sport || '').toLowerCase().includes(f)) return true;
    return false;
  };
  const matchesCombat = (item) => {
    if (!filter || filter !== 'combat' || !combatSubfilter || combatSubfilter === 'all') return true;
    const sport = (item.sport || '').toLowerCase();
    const title = (item.title || '').toLowerCase();
    const location = (item.location || '').toLowerCase();
    const description = (item.description || '').toLowerCase();
    const text = `${sport} ${title} ${location} ${description}`;
    const term = String(combatSubfilter).toLowerCase();

    const aliasesBySubfilter = {
      'krav maga': ['krav maga'],
      'mma': ['mma', 'mixed martial arts'],
      'jiu jitsu': ['jiu jitsu', 'jiujitsu', 'bjj', 'gracie'],
      'boxing': ['boxing', 'boxeo'],
      'muay thai': ['muay thai', 'thai boxing'],
      'taekwondo': ['taekwondo', 'tae kwon do', 'tkd'],
      'other': ['martial arts', 'dojo', 'kickboxing', 'self defense', 'self-defense']
    };
    const knownPrimary = ['krav maga', 'mma', 'mixed martial arts', 'jiu jitsu', 'jiujitsu', 'bjj', 'gracie', 'boxing', 'boxeo', 'muay thai', 'thai boxing', 'taekwondo', 'tae kwon do', 'tkd'];

    if (term === 'other') {
      const hasOtherTerm = aliasesBySubfilter.other.some(t => text.includes(t));
      const hasKnownPrimary = knownPrimary.some(t => text.includes(t));
      return hasOtherTerm && !hasKnownPrimary;
    }

    const aliases = aliasesBySubfilter[term] || [term];
    return aliases.some(t => text.includes(t));
  };

  if (view === 'venues') {
    let venues = [];
    let usedCombatFallback = false;
    let usedGenericSportFallback = false;
    if (state.userLocation) {
      const keyword = filter && filter !== 'all'
        ? filter === 'combat'
          ? getSportKeywords(combatSubfilter && combatSubfilter !== 'all' ? combatSubfilter : 'combat')
          : getSportKeywords(filter)
        : 'sports';
      venues = await fetchNearby({ lat: state.userLocation.lat, lng: state.userLocation.lng, radius: radiusMeters, keyword });

      // If a specific combat style is sparse in Places results, broaden to martial arts.
      if (filter === 'combat' && combatSubfilter && combatSubfilter !== 'all' && venues.length === 0) {
        venues = await fetchNearby({ lat: state.userLocation.lat, lng: state.userLocation.lng, radius: radiusMeters, keyword: getSportKeywords('combat') });
        usedCombatFallback = venues.length > 0;
      }

      // For non-combat filters with sparse Places data, retry with broader sport query.
      if (filter && filter !== 'all' && filter !== 'combat' && venues.length === 0) {
        venues = await fetchNearby({ lat: state.userLocation.lat, lng: state.userLocation.lng, radius: radiusMeters, keyword: 'sports facility' });
        usedGenericSportFallback = venues.length > 0;
      }

      state.lastFetched = venues;
    }

    if (searchTerm) {
      venues = venues.filter(v => v.title.toLowerCase().includes(searchTerm) || v.sport.toLowerCase().includes(searchTerm) || v.location.toLowerCase().includes(searchTerm));
    }
    venues = venues.filter(matchesCategory).filter(matchesCombat);

    if (filter === 'combat' && combatSubfilter && combatSubfilter !== 'all') {
      const subfilterLabel = combatSubfilter.charAt(0).toUpperCase() + combatSubfilter.slice(1);
      if (usedCombatFallback && venues.length > 0) {
        setDiscoverNotice(`No exact ${subfilterLabel} venues nearby, showing broader Combat Sports results.`);
      } else if (venues.length === 0) {
        setDiscoverNotice(`No nearby results for ${subfilterLabel}. Try All or Other in Combat Sports.`);
      } else {
        setDiscoverNotice('');
      }
    } else if (filter && filter !== 'all' && filter !== 'combat') {
      const label = filter.charAt(0).toUpperCase() + filter.slice(1);
      if (usedGenericSportFallback && venues.length > 0) {
        setDiscoverNotice(`No exact ${label} venues nearby, showing broader sports facilities.`);
      } else if (venues.length === 0) {
        setDiscoverNotice(`No nearby ${label} venues found.`);
      } else {
        setDiscoverNotice('');
      }
    } else {
      setDiscoverNotice('');
    }

    venues.forEach((act, i) => {
      const card = document.createElement('div');
      card.className = 'activity-card venue-card';
      card.onclick = () => openDetail(act.id);
      const rating = act.rating ? `<span class="venue-rating">⭐ ${act.rating}</span>` : '';
      const openStatus = act.openNow ? '<span class="venue-open">Open now</span>' : '<span class="venue-closed">Check hours</span>';
      card.innerHTML = `
        <div class="card-image-wrap">
          <img src="${act.image}" alt="${act.title}" class="card-image" loading="lazy" onerror="this.onerror=null;this.src='${act.fallbackImage}'">
          <div class="card-image-overlay"><span class="card-sport-tag">${act.sport || 'Facility'}</span></div>
        </div>
        <div class="card-body">
          <div class="card-title">${act.title} ${rating}</div>
          <div class="card-meta">${act.location}${act.distance ? ' · ' + act.distance + ' km' : ''}</div>
          <div class="card-meta">${openStatus}</div>
        </div>
      `;
      (i % 2 === 0 ? col1 : col2).appendChild(card);
    });
  } else {
    // matches view — show user-created activities near the user
    let matches = state.activities.slice();
    if (state.userLocation) {
      matches = matches.map(a => ({ ...a, distance: calcDistance(state.userLocation.lat, state.userLocation.lng, a.coords.lat, a.coords.lng) }));
      matches = matches.filter(a => a.distance && Number(a.distance) <= radiusKm);
    }

    if (searchTerm) {
      matches = matches.filter(a => a.title.toLowerCase().includes(searchTerm) || a.sport.toLowerCase().includes(searchTerm) || a.location.toLowerCase().includes(searchTerm));
    }
    matches = matches.filter(matchesCategory).filter(matchesCombat);

    matches.forEach((act, i) => {
      const card = document.createElement('div');
      card.className = 'activity-card';
      card.onclick = () => openDetail(act.id);
      const spotsText = formatSpotsLabel(act.spots);
      const isJoined = state.joined.has(act.id);
      card.innerHTML = `
        <div class="card-image-wrap">
          <img src="${act.image}" alt="${act.title}" class="card-image" loading="lazy" onerror="this.onerror=null;this.src='${act.fallbackImage || getImageForSport(act.sport)}'">
          <div class="card-image-overlay"><span class="card-sport-tag">${act.sport}</span></div>
        </div>
        <div class="card-body">
          <div class="card-title">${act.title}</div>
          <div class="card-meta">${act.time}</div>
          <div class="card-meta">${act.location}${act.distance ? ' · ' + act.distance + ' km' : ''}</div>
          <div class="card-participants">
            <div class="participant-avatars">${act.participants.slice(0,3).map(p => `<img src="${p}" alt="">`).join('')}</div>
            <span class="participant-count">${spotsText}</span>
            <button class="card-join-btn" onclick="event.stopPropagation(); quickJoin(${act.id})">${isJoined ? 'Joined' : 'Join'}</button>
          </div>
        </div>
      `;
      (i % 2 === 0 ? col1 : col2).appendChild(card);
    });
  }
}

// ==================== DETAIL ====================
function openDetail(id) {
  // Look in current displayed activities (could be from fetchNearby or static)
  let act = state.activities.find(a => a.id === id);
  // If not found in static, it might be a dynamic fetchNearby result
  // We re-render from whatever is currently displayed, but for detail we need the data
  // For simplicity, if not in state.activities, create a minimal version from the card data
  if (!act) {
    // Try to find from the last fetched results stored temporarily
    act = state.lastFetched?.find(a => a.id === id);
  }
  if (!act) return;
  state.currentDetailId = id;

  // If this is a dynamic venue (from Places), try to fetch up-to-date details
  if (act.placeId) {
    fetchPlaceDetails(act.placeId).then(details => {
      if (!details) return;
      // merge useful fields
      act.details = details;
      document.getElementById('detailHours').innerHTML = (details.opening_hours && details.opening_hours.weekday_text) ? details.opening_hours.weekday_text.join('<br>') : 'Hours not available';
      const facilities = (details.types || []).map(t => t.replace(/_/g,' ')).slice(0,6).join(', ');
      document.getElementById('detailFacilities').textContent = facilities || 'Not specified';
      const contactEl = document.getElementById('detailContact');
      contactEl.innerHTML = '';
      if (details.website) {
        contactEl.innerHTML += `<a class="detail-link-chip" href="${details.website}" target="_blank">Website</a>`;
      }
      if (details.formatted_phone_number) {
        contactEl.innerHTML += `<button type="button" class="detail-link-chip detail-call-btn" data-phone="${details.formatted_phone_number}">Call</button>`;
      }
      contactEl.querySelectorAll('.detail-call-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          this.textContent = this.dataset.phone;
          this.disabled = true;
          this.style.opacity = '0.75';
        });
      });
      document.getElementById('detailReservation').textContent = inferReservationMembership(details);
      document.getElementById('detailAccessNote').textContent = details.website
        ? 'Visit the venue website for exact membership/reservation terms.'
        : 'Verify membership or reservation details with the venue.';
    }).catch(e => console.warn('place details fetch failed', e));
  } else {
    document.getElementById('detailHours').textContent = act.time || 'Flexible';
    document.getElementById('detailFacilities').textContent = act.description || 'Not specified';
    document.getElementById('detailContact').textContent = 'Not available';
    document.getElementById('detailReservation').textContent = 'Check the venue website for membership or reservation details.';
  }

  document.getElementById('detailImage').src = act.image;
  document.getElementById('detailImage').onerror = function() {
    this.onerror = null;
    this.src = act.fallbackImage || getImageForSport(act.sport);
  };
  document.getElementById('detailSport').textContent = act.sport;
  document.getElementById('detailTitle').textContent = act.title;
  document.getElementById('detailDate').textContent = act.date;
  document.getElementById('detailTime').textContent = act.time;
  document.getElementById('detailLocation').textContent = act.location;
  // If we have details with formatted address, prefer it
  if (act.details && act.details.formatted_address) document.getElementById('detailLocation').textContent = act.details.formatted_address;
  document.getElementById('detailLevel').textContent = act.level;
  document.getElementById('detailDescription').textContent = act.description;
  if (!act.placeId) document.getElementById('detailReservation').textContent = 'Check the venue website for membership or reservation details.';

  const spotsRow = document.getElementById('detailSpotsRow');
  const hostSection = document.getElementById('detailHostSection');
  const participantsSection = document.getElementById('detailParticipantsSection');

  if (act.placeId) {
    spotsRow.style.display = 'none';
    hostSection.style.display = 'none';
    participantsSection.style.display = 'none';
  } else {
    spotsRow.style.display = 'flex';
    hostSection.style.display = 'block';
    participantsSection.style.display = 'block';
    document.getElementById('detailSpots').textContent = act.spots;
    document.getElementById('hostImage').src = act.host.image;
    document.getElementById('hostName').textContent = act.host.name;
    document.getElementById('hostBio').textContent = act.host.bio;
    const followBtn = document.querySelector('.detail-host-follow');
    if (followBtn) {
      followBtn.textContent = state.connections.has(act.host.name) ? 'Connected' : 'Connect';
    }
    const parts = document.getElementById('detailParticipants');
    parts.innerHTML = act.participants.map(p => `
      <div class="detail-participant"><img src="${p}" alt=""></div>
    `).join('');
  }

  const chatSection = document.getElementById('detailChatSection');
  if (chatSection) {
    if (state.joined.has(id)) {
      chatSection.style.display = 'block';
      if (!state.activityChats[id]) {
        state.activityChats[id] = [];
      }
      renderActivityChat();
    } else {
      chatSection.style.display = 'none';
    }
  }

  const saveIcon = document.getElementById('detailSaveIcon');
  if (state.saved.has(id)) {
    saveIcon.style.fill = 'white';
    saveIcon.style.stroke = 'white';
  } else {
    saveIcon.style.fill = 'none';
    saveIcon.style.stroke = 'white';
  }

  const joinBtn = document.getElementById('detailJoinBtn');
  const mapsBtn = document.getElementById('detailMapsBtn');
  const mapsRow = document.getElementById('detailMapsRow');
  const skillRow = document.getElementById('detailSkillRow');

  if (act.placeId) {
    joinBtn.textContent = 'Open in Maps';
    joinBtn.style.background = 'var(--accent-light)';
    joinBtn.style.color = 'var(--text-primary)';
    joinBtn.onclick = (e) => { e.stopPropagation(); window.open(act.mapsUrl, '_blank'); };
    joinBtn.style.cursor = 'pointer';
    mapsRow.style.display = 'flex';
    skillRow.style.display = 'none';
    mapsBtn.href = act.mapsUrl;
  } else {
    mapsRow.style.display = 'none';
    skillRow.style.display = 'flex';
    joinBtn.onclick = null;
    if (state.joined.has(id)) {
      joinBtn.textContent = 'Leave Activity';
      joinBtn.style.background = 'var(--text-secondary)';
      joinBtn.style.color = 'white';
      joinBtn.onclick = joinActivity;
    } else {
      joinBtn.textContent = 'Join Activity';
      joinBtn.style.background = 'var(--accent)';
      joinBtn.style.color = 'white';
      joinBtn.onclick = joinActivity;
    }
    joinBtn.style.cursor = 'pointer';
  }

  navToScreen('detail');
}

function toggleSave() {
  if (!state.user) { showAuth(); return; }
  const id = state.currentDetailId;
  if (state.saved.has(id)) {
    state.saved.delete(id);
    showToast('Removed from saved');
  } else {
    state.saved.add(id);
    showToast('Saved for later');
  }
  const saveIcon = document.getElementById('detailSaveIcon');
  saveIcon.style.fill = state.saved.has(id) ? 'white' : 'none';
  if (document.getElementById('screen-discover').classList.contains('active')) renderDiscover();
  if (document.getElementById('screen-saved').classList.contains('active')) renderSaved();
  if (document.getElementById('screen-profile').classList.contains('active')) renderProfile();
}

function joinActivity() {
  if (!state.user) { showAuth(); return; }
  const id = state.currentDetailId;
  if (state.joined.has(id)) {
    state.joined.delete(id);
    showToast('Left activity');
  } else {
    state.joined.add(id);
    showToast('You joined!');
    if (!state.activityChats[id]) {
      state.activityChats[id] = [];
    }
  }
  const joinBtn = document.getElementById('detailJoinBtn');
  const chatSection = document.getElementById('detailChatSection');
  if (state.joined.has(id)) {
    joinBtn.textContent = 'Leave Activity';
    joinBtn.style.background = 'var(--text-secondary)';
    if (chatSection) {
      chatSection.style.display = 'block';
      renderActivityChat();
    }
  } else {
    joinBtn.textContent = 'Join Activity';
    joinBtn.style.background = 'var(--accent)';
    if (chatSection) {
      chatSection.style.display = 'none';
    }
  }
  if (document.getElementById('screen-discover').classList.contains('active')) renderDiscover();
  if (document.getElementById('screen-profile').classList.contains('active')) renderProfile();
}

function quickJoin(id) {
  if (!state.user) { showAuth(); return; }
  if (state.joined.has(id)) {
    state.joined.delete(id);
    showToast('Left activity');
  } else {
    state.joined.add(id);
    showToast('Joined!');
  }
  renderDiscover();
}

function followHost() {
  if (!state.user) { showAuth(); return; }
  const id = state.currentDetailId;
  const act = state.activities.find(a => a.id === id);
  if (!act || !act.host) return;
  const hostId = act.host.name;
  if (state.connections.has(hostId)) {
    state.connections.delete(hostId);
    showToast('Disconnected');
    const followBtn = document.querySelector('.detail-host-follow');
    if (followBtn) followBtn.textContent = 'Connect';
  } else {
    state.connections.add(hostId);
    showToast(`Connected with ${act.host.name}`);
    const followBtn = document.querySelector('.detail-host-follow');
    if (followBtn) followBtn.textContent = 'Connected';
  }
}

function sendMessage(e) {
  e.preventDefault();
  if (!state.user) { showAuth(); return; }
  const id = state.currentDetailId;
  const input = document.getElementById('chatMessageInput');
  const message = input.value.trim();
  if (!message) return;
  
  if (!state.activityChats[id]) {
    state.activityChats[id] = [];
  }
  
  state.activityChats[id].push({
    author: state.user.name,
    text: message,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
  
  input.value = '';
  renderActivityChat();
}

function renderActivityChat() {
  const id = state.currentDetailId;
  const messagesContainer = document.getElementById('chatMessages');
  if (!messagesContainer) return;
  
  const messages = state.activityChats[id] || [];
  messagesContainer.innerHTML = messages.map(msg => `
    <div class="chat-message ${msg.author === state.user.name ? 'own' : 'other'}">
      <div>${msg.text}</div>
      <div class="chat-message-meta">${msg.author} · ${msg.time}</div>
    </div>
  `).join('');
  
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ==================== CREATE ====================
function toggleUnlimitedSpots(enabled) {
  const maxInput = document.getElementById('createMax');
  if (!maxInput) return;
  maxInput.disabled = !!enabled;
  maxInput.required = !enabled;
}

async function fetchRunningStartPoints({ lat, lng }) {
  await loadPlacesAPI();
  if (!_placesService) return { suggestions: [], radiusUsed: null };

  const keywords = ['running trail', 'park', 'running track', 'trailhead'];
  const radii = [2000, 5000, 10000];
  const dedup = new Map();
  let radiusUsed = radii[0];

  for (const radius of radii) {
    radiusUsed = radius;
    const searches = keywords.map((keyword) => {
      const request = {
        location: new google.maps.LatLng(Number(lat), Number(lng)),
        radius: Number(radius),
        type: 'establishment',
        keyword
      };
      return new Promise((resolve) => {
        _placesService.nearbySearch(request, (places, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !places) return resolve([]);
          resolve(places);
        });
      });
    });

    const groups = await Promise.all(searches);
    groups.flat().forEach((place) => {
      if (!place || !place.place_id) return;
      if (isRetailPlace(place)) return;
      const name = String(place.name || '');
      const vicinity = String(place.vicinity || place.formatted_address || '');
      const value = vicinity ? `${name} - ${vicinity}` : name;
      if (!value.trim()) return;
      if (!dedup.has(place.place_id)) dedup.set(place.place_id, value);
    });

    if (dedup.size >= 6) break;
  }

  return { suggestions: Array.from(dedup.values()).slice(0, 10), radiusUsed };
}

async function renderRunningLocationSuggestions() {
  const input = document.getElementById('createLocation');
  const list = document.getElementById('createLocationSuggestions');
  const hint = document.getElementById('runningLocationHint');
  if (!input || !list || !hint) return;

  if (state.selectedSport !== 'Running') {
    input.removeAttribute('list');
    list.innerHTML = '';
    hint.style.display = 'none';
    hint.textContent = '';
    return;
  }

  input.setAttribute('list', 'createLocationSuggestions');
  hint.style.display = 'block';

  if (!state.userLocation) {
    hint.textContent = 'Enable location to get nearby starting point suggestions.';
    requestUserLocation();
    return;
  }

  if (Array.isArray(state.runningLocationSuggestions) && state.runningLocationSuggestions.length) {
    list.innerHTML = state.runningLocationSuggestions.map(v => `<option value="${v.replace(/"/g, '&quot;')}"></option>`).join('');
    hint.textContent = 'Suggestions based on your current location.';
    return;
  }

  hint.textContent = 'Finding nearby running start points...';
  try {
    const { suggestions, radiusUsed } = await fetchRunningStartPoints({
      lat: state.userLocation.lat,
      lng: state.userLocation.lng
    });

    state.runningLocationSuggestions = suggestions;
    if (state.selectedSport !== 'Running') return;

    list.innerHTML = suggestions.map(v => `<option value="${v.replace(/"/g, '&quot;')}"></option>`).join('');
    hint.textContent = suggestions.length
      ? `Suggestions based on your current location (within ${((radiusUsed || 5000) / 1000).toFixed(0)} km).`
      : 'No nearby running points found. Try a park or trailhead name.';
  } catch (err) {
    console.warn('Running suggestions failed', err);
    hint.textContent = 'Could not load suggestions right now. You can still type a starting point.';
  }
}

function updateCreateFormForSport() {
  const isRunning = state.selectedSport === 'Running';
  const locationLabel = document.getElementById('createLocationLabel');
  const locationInput = document.getElementById('createLocation');
  const maxLabel = document.getElementById('createMaxLabel');
  const unlimitedWrap = document.getElementById('runningUnlimitedWrap');
  const unlimitedCheckbox = document.getElementById('createUnlimited');

  if (locationLabel) {
    locationLabel.textContent = isRunning ? 'Location / Starting Point' : 'Location';
  }
  if (locationInput) {
    locationInput.placeholder = isRunning ? 'Trailhead, park entrance, or meetup point' : 'Venue or address';
  }
  if (maxLabel) {
    maxLabel.textContent = 'Max Participants';
  }
  if (unlimitedWrap) {
    unlimitedWrap.style.display = isRunning ? 'block' : 'none';
  }

  if (!isRunning && unlimitedCheckbox) {
    unlimitedCheckbox.checked = false;
  }
  toggleUnlimitedSpots(isRunning && !!unlimitedCheckbox?.checked);
  renderRunningLocationSuggestions();
}

function renderSportGrid() {
  const grid = document.getElementById('sportGrid');
  grid.innerHTML = sportsData.map(s => `
    <div class="sport-option" data-sport="${s.name}" onclick="selectSport(this)">
      <span class="sport-emoji">${s.emoji}</span>
      ${s.name}
    </div>
  `).join('');
  updateCreateFormForSport();
}

function selectSport(el) {
  document.querySelectorAll('.sport-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  state.selectedSport = el.dataset.sport;
  updateCreateFormForSport();
}

function selectVis(el) {
  document.querySelectorAll('.visibility-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  state.selectedVisibility = el.dataset.vis;
}

function handleCreate(e) {
  e.preventDefault();
  if (!state.selectedSport) { showToast('Please select a sport'); return; }

  const sportData = sportsData.find(s => s.name === state.selectedSport);
  const unlimitedForRunning = state.selectedSport === 'Running' && !!document.getElementById('createUnlimited')?.checked;
  const maxParticipants = document.getElementById('createMax').value;
  const newAct = {
    id: Date.now(),
    title: document.getElementById('createTitle').value,
    sport: state.selectedSport,
    category: sportData ? sportData.category : 'team',
    image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&h=500&fit=crop',
    date: new Date(document.getElementById('createDate').value).toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric'}),
    time: document.getElementById('createTime').value,
    location: document.getElementById('createLocation').value,
    level: document.getElementById('createLevel').value,
    spots: unlimitedForRunning ? '1/No limit' : '1/' + maxParticipants,
    description: document.getElementById('createDesc').value,
    host: {
      name: state.user?.name || 'You',
      bio: 'Activity host',
      image: state.user?.image || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face'
    },
    participants: []
  };

  state.activities.unshift(newAct);
  showToast('Activity created!');
  e.target.reset();
  document.querySelectorAll('.sport-option').forEach(o => o.classList.remove('selected'));
  state.selectedSport = null;
  state.selectedVisibility = 'public';
  updateCreateFormForSport();
  navTo('discover');
}

function toggleManualLogForm() {
  const shell = document.getElementById('manualLogShell');
  const toggle = document.getElementById('manualLogToggle');
  if (!shell || !toggle) return;

  const isOpen = shell.style.display !== 'none';
  shell.style.display = isOpen ? 'none' : 'block';
  toggle.textContent = isOpen ? 'Add activity' : 'Hide activity log';
  if (!isOpen) {
    populateManualActivityTypes();
    const dateInput = document.getElementById('manualActivityDate');
    if (dateInput && !dateInput.value) dateInput.value = getTodayKey();
  }
}

function loadManualActivities() {
  try {
    const stored = JSON.parse(localStorage.getItem('manualActivities') || '[]');
    state.manualActivities = Array.isArray(stored) ? stored.map(normalizeManualActivity) : [];
  } catch (error) {
    console.error('[OFF SITE] Manual activity load error:', error);
    state.manualActivities = [];
  }
}

function normalizeManualActivity(activity) {
  return {
    ...activity,
    reactions: Array.isArray(activity.reactions) ? activity.reactions : [],
    media: Array.isArray(activity.media) ? activity.media : []
  };
}

function persistManualActivities() {
  localStorage.setItem('manualActivities', JSON.stringify(state.manualActivities));
}

function createSeedReactions(activityId) {
  const friendNames = [...state.connections];
  const reactionPool = ['❤️', '🔥', '👏', '🎉', '💪'];
  return friendNames.slice(0, 3).map((name, index) => ({
    id: `${activityId}-seed-${index}`,
    emoji: reactionPool[(activityId.length + index) % reactionPool.length],
    from: name,
    createdAt: new Date().toISOString(),
    seeded: true
  }));
}

function populateManualActivityTypes() {
  const select = document.getElementById('manualActivityType');
  if (!select) return;

  const currentValue = select.value;
  select.innerHTML = sportsData.map(sport => {
    const label = `${sport.emoji} ${sport.name}`;
    return `<option value="${sport.name}">${label}</option>`;
  }).join('') + '<option value="Other">Other</option>';

  if (currentValue && [...select.options].some(option => option.value === currentValue)) {
    select.value = currentValue;
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

async function readManualMedia(files) {
  const selectedFiles = [...(files || [])].slice(0, 6);
  const mediaItems = [];

  for (const file of selectedFiles) {
    const dataUrl = await readFileAsDataUrl(file);
    mediaItems.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: file.type,
      name: file.name,
      url: dataUrl,
      kind: file.type.startsWith('video/') ? 'video' : 'image'
    });
  }

  return mediaItems;
}

function getTodayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function formatManualDate(value) {
  if (!value) return '';
  const today = getTodayKey();
  if (value === today) return 'Today';
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
}

function formatManualDistance(value) {
  const number = Number(value) || 0;
  return `${number.toFixed(number % 1 === 0 ? 0 : 1)} km`;
}

function formatManualVisibility(value) {
  return value === 'connections' ? 'Connections' : 'Only me';
}

function groupManualActivitiesByDate() {
  return state.manualActivities.reduce((groups, activity) => {
    const dateKey = activity.date || getTodayKey();
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(activity);
    return groups;
  }, {});
}

function renderManualActivityPanel() {
  const summaryContainer = document.getElementById('manualSummary');
  const listContainer = document.getElementById('manualActivityList');
  const dateInput = document.getElementById('manualActivityDate');
  populateManualActivityTypes();
  if (!summaryContainer || !listContainer) return;

  if (dateInput && !dateInput.value) {
    dateInput.value = getTodayKey();
  }

  const today = getTodayKey();
  const todaysActivities = state.manualActivities.filter(activity => activity.date === today);
  const totalMinutes = todaysActivities.reduce((sum, activity) => sum + (Number(activity.duration) || 0), 0);
  const totalDistance = todaysActivities.reduce((sum, activity) => sum + (Number(activity.distance) || 0), 0);

  summaryContainer.innerHTML = `
    <div class="manual-summary-card">
      <div class="manual-summary-label">Today</div>
      <div class="manual-summary-value">${todaysActivities.length}</div>
      <div class="manual-summary-label">activities</div>
    </div>
    <div class="manual-summary-card">
      <div class="manual-summary-label">Time</div>
      <div class="manual-summary-value">${totalMinutes} min</div>
      <div class="manual-summary-label">logged today</div>
    </div>
    <div class="manual-summary-card">
      <div class="manual-summary-label">Distance</div>
      <div class="manual-summary-value">${totalDistance.toFixed(totalDistance % 1 === 0 ? 0 : 1)} km</div>
      <div class="manual-summary-label">logged today</div>
    </div>
  `;

  if (state.manualActivities.length === 0) {
    listContainer.innerHTML = '<div class="manual-entry" style="justify-content:center;color:var(--text-tertiary);">No activities yet. Add one above to preview your day summary.</div>';
    return;
  }

  const groupedActivities = groupManualActivitiesByDate();
  const orderedDates = Object.keys(groupedActivities).sort((left, right) => right.localeCompare(left));

  listContainer.innerHTML = orderedDates.map(dateKey => `
    <div class="manual-date-group">
      <div class="manual-date-header">
        <span>${formatManualDate(dateKey)}</span>
        <span>${groupedActivities[dateKey].length} ${groupedActivities[dateKey].length === 1 ? 'entry' : 'entries'}</span>
      </div>
      <div class="manual-date-list">
        ${groupedActivities[dateKey].map(activity => {
          const reactions = activity.reactions || [];
          const media = activity.media || [];
          const emojiCounts = reactions.reduce((counts, reaction) => {
            counts[reaction.emoji] = (counts[reaction.emoji] || 0) + 1;
            return counts;
          }, {});
          const reactionPreview = Object.entries(emojiCounts);

          return `
          <div class="manual-entry">
            <div class="manual-entry-main">
              <div class="manual-entry-top">
                <div class="manual-entry-title">${activity.type}</div>
                <div class="manual-entry-meta">${formatManualVisibility(activity.visibility)}</div>
              </div>
              <div class="manual-entry-meta">${activity.duration ? `${activity.duration} min` : 'Duration n/a'} · ${activity.distance ? formatManualDistance(activity.distance) : 'Distance n/a'}</div>
              <div class="manual-privacy-badge ${activity.visibility === 'connections' ? 'manual-privacy-shared' : 'manual-privacy-private'}">${formatManualVisibility(activity.visibility)}</div>
              ${media.length > 0 ? `
                <div class="manual-media-grid">
                  ${media.map(item => item.kind === 'video'
                    ? `<video class="manual-media-item manual-media-video" controls playsinline src="${item.url}"></video>`
                    : `<img class="manual-media-item manual-media-image" src="${item.url}" alt="${item.name || 'Activity media'}">`
                  ).join('')}
                </div>
              ` : ''}
              ${activity.notes ? `<div class="manual-entry-notes">${activity.notes}</div>` : ''}
              <div class="manual-reaction-strip">
                ${reactionPreview.length > 0 ? reactionPreview.map(([emoji, count]) => `
                  <button class="manual-reaction-pill" type="button" onclick="addManualReaction('${activity.id}', '${emoji}')">
                    <span>${emoji}</span>
                    <span>${count}</span>
                  </button>
                `).join('') : '<span class="manual-reaction-empty">No reactions yet. Connections can react with emojis.</span>'}
              </div>
              <div class="manual-reaction-row">
                ${['❤️','🔥','👏','🎉','💪'].map(emoji => `
                  <button class="manual-reaction-add" type="button" onclick="addManualReaction('${activity.id}', '${emoji}')">${emoji}</button>
                `).join('')}
              </div>
              ${reactions.length > 0 ? `<div class="manual-reaction-meta">${reactions.slice(0, 3).map(reaction => `${reaction.from} ${reaction.emoji}`).join(' · ')}</div>` : ''}
            </div>
            <button class="manual-entry-remove" type="button" onclick="deleteManualActivity('${activity.id}')" aria-label="Delete activity">×</button>
          </div>
        `;
        }).join('')}
      </div>
    </div>
  `).join('');
}

async function addManualActivity(e) {
  e.preventDefault();
  if (!state.user) {
    showAuth();
    return;
  }

  const type = document.getElementById('manualActivityType')?.value || 'Other';
  const visibility = document.getElementById('manualVisibility')?.value === 'connections' ? 'connections' : 'private';
  const durationValue = document.getElementById('manualDuration')?.value;
  const distanceValue = document.getElementById('manualDistance')?.value;
  const date = document.getElementById('manualActivityDate')?.value || getTodayKey();
  const notes = document.getElementById('manualNotes')?.value.trim() || '';
  const mediaInput = document.getElementById('manualMedia');
  const mediaFiles = mediaInput?.files || [];
  const duration = Number(durationValue) || 0;
  const distance = Number(distanceValue) || 0;

  if (!duration && !distance && !notes) {
    showToast('Add at least a duration, distance, or note.');
    return;
  }

  let media = [];
  try {
    media = await readManualMedia(mediaFiles);
  } catch (error) {
    console.error('[OFF SITE] Manual media read error:', error);
    showToast('Could not read one of the attached files.');
    return;
  }

  state.manualActivities.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    duration,
    distance,
    date,
    notes,
    visibility,
    reactions: visibility === 'connections' ? createSeedReactions(`${Date.now()}`) : [],
    media,
    createdAt: new Date().toISOString()
  });

  persistManualActivities();
  e.target.reset();
  const dateInput = document.getElementById('manualActivityDate');
  if (dateInput) dateInput.value = getTodayKey();
  const visibilityInput = document.getElementById('manualVisibility');
  if (visibilityInput) visibilityInput.value = 'private';
  populateManualActivityTypes();
  showToast('Activity added');
  renderManualActivityPanel();
  renderProfile();
}

function deleteManualActivity(id) {
  state.manualActivities = state.manualActivities.filter(activity => activity.id !== id);
  persistManualActivities();
  renderManualActivityPanel();
}

function addManualReaction(activityId, emoji) {
  const activity = state.manualActivities.find(entry => entry.id === activityId);
  if (!activity) return;

  activity.reactions = Array.isArray(activity.reactions) ? activity.reactions : [];
  activity.reactions.unshift({
    id: `${activityId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    emoji,
    from: state.user?.name || 'You',
    createdAt: new Date().toISOString(),
    seeded: false
  });

  persistManualActivities();
  renderManualActivityPanel();
}

function renderProfile() {
  if (!state.user) return;
  document.getElementById('profileName').textContent = state.user.name;
  document.getElementById('profileBio').textContent = state.user.bio || 'Sports enthusiast';
  document.getElementById('profileAvatar').src = state.user.image;
  document.getElementById('profileBtn').textContent = 'Edit Profile';
  document.getElementById('statJoined').textContent = state.joined.size;
  document.getElementById('statHosted').textContent = '0';
  document.getElementById('statStreak').textContent = '0';

  const sportsEl = document.getElementById('profileSports');
  if (sportsEl) {
    const uniqueSports = [...new Set([...state.joined].map(id => {
      const act = state.activities.find(a => a.id === id);
      return act ? act.sport : null;
    }).filter(Boolean))];
    sportsEl.innerHTML = uniqueSports.map(s => `<span class="profile-sport-tag">${s}</span>`).join('');
  }

  const streakCard = document.getElementById('streakCard');
  if (streakCard) streakCard.style.display = state.joined.size > 0 ? 'block' : 'none';

  renderManualActivityPanel();
  renderProfileActivities();
}

function renderProfileActivities() {
  const container = document.getElementById('profileActivities');
  container.innerHTML = '';

  let acts = [];
  if (state.currentProfileTab === 'joined') {
    acts = state.activities.filter(a => state.joined.has(a.id));
  } else if (state.currentProfileTab === 'saved') {
    acts = state.activities.filter(a => state.saved.has(a.id));
  } else if (state.currentProfileTab === 'hosted') {
    acts = state.activities.filter(a => a.host.name === state.user?.name);
  } else if (state.currentProfileTab === 'connections') {
    acts = state.activities.filter(a => state.connections.has(a.host.name));
  }

  if (acts.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--text-tertiary);font-size:14px;">No ${state.currentProfileTab} ${state.currentProfileTab === 'connections' ? 'hosts' : 'activities'} yet</div>`;
    return;
  }

  acts.forEach(act => {
    const card = document.createElement('div');
    card.className = 'profile-activity-card';
    card.onclick = () => openDetail(act.id);
    const isJoined = state.joined.has(act.id);
    card.innerHTML = `
      <img src="${act.image}" alt="${act.title}">
      <div class="profile-activity-info">
        <div class="profile-activity-title">${act.title}</div>
        <div class="profile-activity-meta">${act.date} · ${act.location}</div>
      </div>
      <span class="profile-activity-status ${isJoined ? 'status-upcoming' : 'status-past'}">${isJoined ? 'Upcoming' : 'Past'}</span>
    `;
    container.appendChild(card);
  });
}

function switchTab(el) {
  document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  state.currentProfileTab = el.dataset.tab;
  renderProfileActivities();
}

// ==================== SAVED ====================
function renderSaved() {
  const empty = document.getElementById('savedEmpty');
  const grid = document.getElementById('savedGrid');
  const col1 = document.getElementById('savedCol1');
  const col2 = document.getElementById('savedCol2');

  const saved = state.activities.filter(a => state.saved.has(a.id));

  if (saved.length === 0) {
    empty.style.display = 'block';
    grid.style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  grid.style.display = 'grid';
  col1.innerHTML = '';
  col2.innerHTML = '';

  saved.forEach((act, i) => {
    const card = document.createElement('div');
    card.className = 'activity-card';
    card.onclick = () => openDetail(act.id);
    const spotsText = formatSpotsLabel(act.spots);
    card.innerHTML = `
      <div class="card-image-wrap">
        <img src="${act.image}" alt="${act.title}" class="card-image" loading="lazy">
        <div class="card-image-overlay">
          <span class="card-sport-tag">${act.sport}</span>
        </div>
      </div>
      <div class="card-body">
        <div class="card-title">${act.title}</div>
        <div class="card-meta">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          ${act.time}
        </div>
        <div class="card-meta">
          <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${act.location}
        </div>
        <div class="card-participants">
          <div class="participant-avatars">
            ${act.participants.slice(0,3).map(p => `<img src="${p}" alt="">`).join('')}
          </div>
          <span class="participant-count">${spotsText}</span>
        </div>
      </div>
    `;
    (i % 2 === 0 ? col1 : col2).appendChild(card);
  });
}

// ==================== AUTH ====================
// To enable real Google Sign-In:
// 1. Go to https://console.cloud.google.com/
// 2. Create a new project (or use existing)
// 3. Enable Google+ API
// 4. Create OAuth 2.0 credentials (Web Application)
// 5. Add authorized JavaScript origins (e.g., http://localhost:3000, your domain)
// 6. Add authorized redirect URIs
// 7. Copy the Client ID and paste it in authGoogle() function below
// 8. For local testing, you may need to run on http:// or use ngrok for https

function showAuth() {
  document.getElementById('authModal').classList.add('active');
}

function closeAuth(e) {
  if (e.target === document.getElementById('authModal')) {
    document.getElementById('authModal').classList.remove('active');
  }
}

let googleTokenClient = null;

function authGoogle() {
  const clientId = '446299428719-t6tovvng0u2rhi7jheub8pgd7f0brsku.apps.googleusercontent.com';
  if (!window.google || !google.accounts || !google.accounts.oauth2) {
    showToast('Google Sign-In is still loading. Try again in a second.');
    return;
  }

  if (!googleTokenClient) {
    googleTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: async (tokenResponse) => {
        if (!tokenResponse || tokenResponse.error) {
          console.error('[OFF SITE] Google token error:', tokenResponse);
          showToast('Google Sign-In failed. Check authorized origin in Google Cloud.');
          return;
        }
        await handleGoogleAccessToken(tokenResponse.access_token);
      }
    });
  }

  googleTokenClient.requestAccessToken({ prompt: 'select_account' });
}

async function handleGoogleAccessToken(accessToken) {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch profile (${response.status})`);
    }

    const profile = await response.json();
    state.user = {
      name: profile.name || 'User',
      email: profile.email || '',
      image: profile.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face',
      bio: 'Sports enthusiast'
    };

    document.getElementById('authModal').classList.remove('active');
    showToast(`Welcome ${state.user.name}!`);
    navTo('discover');
  } catch (error) {
    console.error('[OFF SITE] Google profile error:', error);
    showToast('Could not read your Google profile. Try again.');
  }
}

function handleGoogleSignIn(response) {
  if (!response || !response.credential) {
    showToast('Google Sign-In failed.');
    return;
  }

  const token = response.credential;
  const decoded = parseJwt(token);

  if (decoded) {
    state.user = {
      name: decoded.name || 'User',
      email: decoded.email || '',
      image: decoded.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face',
      bio: 'Sports enthusiast'
    };
    document.getElementById('authModal').classList.remove('active');
    showToast(`Welcome ${decoded.name}!`);
    navTo('discover');
  }
}

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('JWT decode failed:', e);
    return null;
  }
}

function authEmail(e) {
  e.preventDefault();
  state.user = {
    name: 'Guest User',
    email: 'guest@example.com',
    image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face',
    bio: 'Sports lover'
  };
  document.getElementById('authModal').classList.remove('active');
  showToast('Welcome to OFF SITE!');
  navTo('discover');
}

function browseAnonymous() {
  document.getElementById('authModal').classList.remove('active');
}

// ==================== TOAST ====================
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ==================== LOCATION / GPS ====================
function requestUserLocation() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      state.runningLocationSuggestions = [];
      if (document.getElementById('screen-discover')?.classList.contains('active')) {
        renderDiscover(document.querySelector('.filter-chip.active')?.dataset.filter);
      }
      if (state.selectedSport === 'Running' && document.getElementById('screen-create')?.classList.contains('active')) {
        renderRunningLocationSuggestions();
      }
    },
    (err) => {
      console.log('[OFF SITE] Location denied:', err.message);
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
  );
}




function getCategoryForSport(sport) {
  const map = {
    'Football': 'team', 'Basketball': 'team', 'Volleyball': 'team',
    'Tennis': 'racket', 'Running': 'outdoor', 'Surfing': 'water',
    'Climbing': 'fitness', 'Yoga': 'fitness', 'Swimming': 'water',
    'Cycling': 'outdoor', 'Golf': 'outdoor',
    'Boxing': 'combat', 'MMA': 'combat', 'Jiu Jitsu': 'combat',
    'Krav Maga': 'combat', 'Muay Thai': 'combat', 'Taekwondo': 'combat'
  };
  return map[sport] || 'fitness';
}

function getImageForSport(sport) {
  const map = {
    'Football': 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=500&fit=crop',
    'Basketball': 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=500&fit=crop',
    'Volleyball': 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=400&h=500&fit=crop',
    'Tennis': 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400&h=500&fit=crop',
    'Running': 'https://images.unsplash.com/photo-1552674605-4694c0cc5ce6?w=400&h=500&fit=crop',
    'Surfing': 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=400&h=500&fit=crop',
    'Climbing': 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=400&h=500&fit=crop',
    'Yoga': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=500&fit=crop',
    'Swimming': 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&h=500&fit=crop'
  };
  return map[sport] || map['Football'];
}

// ==================== COUNTRY ONBOARDING ====================
let selectedCountryCode = null;

function populateCountryDropdown() {
  const dropdown = document.getElementById('countryDropdown');
  if (!dropdown) {
    console.error('[OFF SITE] countryDropdown element not found in DOM');
    return;
  }
  if (dropdown.querySelectorAll('option[value]').length > 1) return;

  allCountries.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.code;
    opt.textContent = c.name;
    dropdown.appendChild(opt);
  });
  console.log('[OFF SITE] Populated dropdown with', allCountries.length, 'countries');
}

function confirmCountry() {
  if (!selectedCountryCode) return;
  localStorage.setItem('userCountry', selectedCountryCode);
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  showToast('Welcome to OFF SITE!');
  document.getElementById('screen-discover').classList.add('active');
  renderDiscover();
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.nav-item')[0].classList.add('active');
}

function checkCountry() {
  const saved = localStorage.getItem('userCountry');
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  if (saved) {
    document.getElementById('screen-discover').classList.add('active');
    renderDiscover();
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.nav-item')[0].classList.add('active');
  } else {
    document.getElementById('screen-country').classList.add('active');
    requestAnimationFrame(() => populateCountryDropdown());
    const dropdown = document.getElementById('countryDropdown');
    if (dropdown) {
      dropdown.addEventListener('change', function() {
        selectedCountryCode = this.value;
        document.getElementById('countryContinue').disabled = !selectedCountryCode;
      });
    }
  }
}

// ==================== FILTERS ====================
// Filters are rendered dynamically by `renderDiscoverFilters`.
document.getElementById('searchInput')?.addEventListener('input', () => {
  const { filter, combatSubfilter } = getActiveDiscoverSelection();
  renderDiscover(filter, combatSubfilter);
});

// Initialize filters for the default view
renderDiscoverFilters(state.selectedDiscoverView || 'venues');
const radiusSelect = document.getElementById('discoverRadius');
if (radiusSelect) radiusSelect.value = String(state.selectedRadiusKm || 5);

// ==================== INIT ====================
loadManualActivities();
checkCountry();
requestUserLocation();
