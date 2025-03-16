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

   // prepare data for the bar chart
   function makeChartData(filteredQuakes) {
    // define magnitude ranges for the chart
    let ranges = [
      { name: '0-1.9', range: [0, 1.9], count: 0 },
      { name:'2-2.9', range: [2, 2.9], count: 0 },
      { name: '3-3.9', range: [3, 3.9], count:0 },
      { name: '4+', range: [4, Infinity], count: 0 }
    ];
    
    // count earthquakes in each range
    for (let i = 0; i < filteredQuakes.length; i++) {
      let quake = filteredQuakes[i];
      let mag = quake.properties.mag;
      
      // find the right range and increment count
      for (let j = 0; j < ranges.length; j++) {
        let rangeData = ranges[j];
        if (mag >= rangeData.range[0] && mag <= rangeData.range[1]) {
          rangeData.count++;
          break;
        }
      }
    }
    
    //update chart data state
    setChartData(ranges);
  }

  //load data when component mounts or time range changes
  useEffect(() => {
    // call the fetch function
    fetchEarthquakeData();
  }, [timeRange]); // this runs when timeRange changes

  // handle slider for minMag
  function handleMagnitudeChange(e) {
    let newMag = parseFloat(e.target.value);
    setMinMagnitude(newMag);
    //apply all filters again with new magnitude
    applyFilters(earthquakes, newMag, searchLocation);
  }

  // handle location search input change
  function handleLocationChange(e) {
    setSearchLocation(e.target.value);
  }

  // handle search button click
  function handleLocationSearch(e) {
    e.preventDefault(); // prevent page refresh
    applyFilters(earthquakes, minMagnitude, searchLocation);
  }

  // handle time range button clicks
  function handleTimeRangeChange(range) {
    setTimeRange(range);
    // the useEffect will trigger data fetch
  }

  // reset all filters to default
  function handleResetFilters() {
    setMinMagnitude(0);
    setSearchLocation('');
    setSearchError('');
    setMapCenter([20, 0]);
    setMapZoom(2);
    applyFilters(earthquakes, 0, '');
  }

  // render the component
  return (
    <div className="container py-4">
      <h1 className="mb-4 text-center">Earthquake Explorer</h1>
      
      {/* show error if there is one */}
      {error && (
        <div className="alert alert-danger mb-4" role="alert">
          {error}
        </div>
      )}
      
      {/* control panel for filters */}
      <div className="card mb-4">
        <div className="card-body">
          <h3 className="card-title mb-3">Search & Filter Options</h3>
          
          {/* time range buttons */}
          <div className="mb-3">
            <label className="form-label">Time Range:</label>
            <div className="btn-group d-flex" role="group">
              <button 
                type="button" 
                className={`btn btn-outline-primary ${timeRange === 'day' ? 'active' : ''}`}
                onClick={() => handleTimeRangeChange('day')}
              >
                Past Day
              </button>
              <button 
                type="button" 
                className={`btn btn-outline-primary ${timeRange === 'week' ? 'active' : ''}`}
                onClick={() => handleTimeRangeChange('week')}
              >
                Past Week
              </button>
              <button 
                type="button" 
                className={`btn btn-outline-primary ${timeRange === 'month' ? 'active' : ''}`}
                onClick={() => handleTimeRangeChange('month')}
              >
                Past Month
              </button>
            </div>
          </div>
          
          {/* THE slider */}
          <div className="mb-3">
            <label htmlFor="magnitude" className="form-label">
              Minimum Magnitude: {minMagnitude}
            </label>
            <input
              type="range"
              className="form-range"
              id="magnitude"
              min="0"
              max="7"
              step="0.5"
              value={minMagnitude}
              onChange={handleMagnitudeChange}
            />
          </div>
          
          {/* location search box */}
          <form onSubmit={handleLocationSearch} className="mb-3">
            <label htmlFor="location" className="form-label">Search by Location:</label>
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                id="location"
                placeholder="example), California, Pacific, Tokyo"
                value={searchLocation}
                onChange={handleLocationChange}
              />
              <button type="submit" className="btn btn-primary">Search</button>
            </div>
            <div className="form-text">Enter a region, country, city, or geographic feature</div>
            {searchError && (
              <div className="text-danger mt-2">{searchError}</div>
            )}
          </form>
          
          {/* reset button */}
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={handleResetFilters}
          >
            Reset All Filters
          </button>
        </div>
      </div>
      
      {/* show loading spinner or content */}
      {loading ? (
        <div className="d-flex justify-content-center mb-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <>
          {/* rar chart for magnitude distribution */}
          <div className="card mb-4">
            <div className="card-body">
              <h3 className="card-title mb-3">Magnitude Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4682B4" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* results count */}
          <div className="mb-4">
            <h3>Results: {filteredEarthquakes.length} earthquakes found</h3>
            {filteredEarthquakes.length === 0 && !searchError && (
              <div className="alert alert-info">
                No earthquakes match your current filter criteria. Try adjusting your filters!
              </div>
            )}
          </div>
          
          {/* color legend */}
          <div className="card mb-4 d-inline-block">
            <div className="card-body py-2">
              <h5 className="card-title mb-3">Magnitude Scale</h5>
              <div className="d-flex flex-column">
                <div className="mb-2 d-flex align-items-center">
                  <span 
                    className="d-inline-block rounded-circle me-2" 
                    style={{ backgroundColor: 'darkgreen', width: '15px', height: '15px' }}
                  ></span>
                  <span>Less than 2</span>
                </div>
                <div className="mb-2 d-flex align-items-center">
                  <span 
                    className="d-inline-block rounded-circle me-2" 
                    style={{ backgroundColor: 'darkorange', width: '15px', height: '15px' }}
                  ></span>
                  <span>2 - 3.9</span>
                </div>
                <div className="mb-2 d-flex align-items-center">
                  <span 
                    className="d-inline-block rounded-circle me-2" 
                    style={{ backgroundColor: 'darkred', width: '15px', height: '15px' }}
                  ></span>
                  <span>4 - 5.9</span>
                </div>
                <div className="mb-2 d-flex align-items-center">
                  <span 
                    className="d-inline-block rounded-circle me-2" 
                    style={{ backgroundColor: 'darkpurple', width: '15px', height: '15px' }}
                  ></span>
                  <span>6+</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* The map! */}
          <div className="card mb-4">
            <div className="card-body p-0">
              <MapContainer 
                key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`} 
                center={mapCenter} 
                zoom={mapZoom} 
                style={{ height: '70vh', width: '100%', borderRadius: 'calc(.375rem - 1px)' }}
                zoomControl={false}
              >
                <ZoomControl position="bottomright" />
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                {/* map over earthquakes and create markers */}
                {filteredEarthquakes.map((quake, idx) => {
                  // extract data from quake object
                  const [lng, lat, depth] = quake.geometry.coordinates;
                  const magnitude = quake.properties.mag;
                  const place = quake.properties.place;
                  const time = new Date(quake.properties.time).toLocaleString();
                  const { color, fillColor } = getCircleColor(magnitude);

                  //create a marker for each earthquake
                  return (
                    <CircleMarker
                      key={quake.id || idx}
                      center={[lat, lng]}
                      radius={Math.max(magnitude * 2, 4)}
                      color={color}
                      fillColor={fillColor}
                      fillOpacity={0.7}
                      weight={1}
                    >
                      <Popup>
                        <div>
                          <h5 className="mb-2">{place}</h5>
                          <p className="mb-1"><strong>Magnitude:</strong> {magnitude}</p>
                          <p className="mb-1"><strong>Depth:</strong> {depth.toFixed(2)} km</p>
                          <p className="mb-0"><strong>Time:</strong> {time}</p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>
          </div>
          
          {/*Thanks USGS for providing with such a great data!*/}
          <div className="text-muted small">
            <p className="mb-1">Data source: <a href="https://earthquake.usgs.gov" target="_blank" rel="noopener noreferrer" className="link-secondary">USGS</a></p>
            <p className="mb-1">Created for CS 378 HCI-Spring 2025</p>
          </div>
        </>
      )}
    </div>
  );
}

// Export the component
export default EarthquakeApp;