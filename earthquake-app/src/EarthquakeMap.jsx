import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// This is the main app component for earthquake data
function EarthquakeApp() {
  const [earthquakes, setEarthquakes] = useState([]);
  const [filteredEarthquakes, setFilteredEarthquakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('day'); 
  const [minMagnitude, setMinMagnitude] = useState(0);
  const [searchLocation, setSearchLocation] = useState('');
  const [searchError, setSearchError] = useState('');
  
  // map stuff
  const [mapCenter, setMapCenter] = useState([20, 0]);
  const [mapZoom, setMapZoom] = useState(2);
  
  // chart data
  const [chartData, setChartData] = useState([]);

  // This function picks colors for different earthquake strengths
  // TODO: maybe add more colors later? but I think that's good so far
  function getCircleColor(magnitude) {
    if (magnitude < 2) {
      return { color: 'green', fillColor: 'darkgreen' };
    }
    if (magnitude < 4) {
      return { color: 'orange', fillColor: 'darkorange' };
    }
    if (magnitude < 6) {
      return { color: 'red', fillColor: 'darkred' };
    }
    return { 
      color: 'purple', fillColor: 'darkpurple' 
    };
  }

  // gets data from USGS website
  async function fetchEarthquakeData() {
    try {
      //show loading spinner while fetching
      setLoading(true);
      setError(null);
      setSearchError('');
      
      // URLs for different time ranges
      var endpoints = {
        day: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
        week: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
        month: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson'
      };
      
      // fetch the data!
      let response = await fetch(endpoints[timeRange]);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      // parse JSON data
      let data = await response.json();
      
      // store earthquake data in state
      setEarthquakes(data.features);
      
      // aoply filters right away
      applyFilters(data.features, minMagnitude, searchLocation);
      
    } catch (error) {
      //something went wrong :(
      console.error('Error fetching earthquake data:', error);
      setError('Failed to load earthquake data. Please try again later.');
    } finally {
      // set false in any case after done
      setLoading(false);
    }
  }

  // This function filters the earthquake data
  function applyFilters(quakes, minMag, location) {
    //filter by magnitude first
    let filtered = quakes.filter(quake => quake.properties.mag >= minMag);
    
    // then filter by location if the user entered one
    if (location.trim() !== '') {
      const searchTerm = location.toLowerCase();
      
      filtered = filtered.filter(quake => {
        //make sure that place exists and includes the search term
        if (quake.properties.place) {
          return quake.properties.place.toLowerCase().includes(searchTerm);
        }
        return false;
      });
      
      //let user know if no results were found
      if (filtered.length === 0) {
        setSearchError(`No earthquakes found near "${location}". Try a different location or broaden your search.`);
      } else {
        setSearchError('');
        
        //center map on first matching earthquake
        const [lng, lat] = filtered[0].geometry.coordinates;
        setMapCenter([lat, lng]);
        //zoom in when location is filtered
        setMapZoom(5); 
      }
    } else {
      //reset map if no location filter
      setMapCenter([20, 0]);
      setMapZoom(2);
    }
    
    //update filtered earthquakes
    setFilteredEarthquakes(filtered);
    
    // then update chart
    makeChartData(filtered);
  }

  
}

// Export the component
export default EarthquakeApp;