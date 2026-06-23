import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const API_KEY = process.env.GOOGLE_MAPS_KEY || 'AIzaSyBmvJph4LmrbtW7skeczzpBIyb9WWzFKo4';

app.get('/api/places', async (req, res) => {
  let { lat, lng, radius = 5000, location } = req.query;

  // Support client sending either `lat` & `lng` or `location=lat,lng`
  if ((!lat || !lng) && location) {
    const parts = String(location).split(',').map(s => s.trim());
    if (parts.length >= 2) {
      lat = parts[0];
      lng = parts[1];
    }
  }

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Missing coordinates (provide lat & lng or location=lat,lng)' });
  }

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${encodeURIComponent(lat + ',' + lng)}&radius=${encodeURIComponent(radius)}&type=establishment&key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      return res.json(data);
    } catch (parseErr) {
      console.error('Places proxy: invalid JSON from Google API', parseErr, text);
      return res.status(502).json({ error: 'Invalid response from Places API', details: text.slice(0, 200) });
    }
  } catch (err) {
    console.error('Places proxy error:', err);
    res.status(500).json({ error: 'Failed to fetch places' });
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
