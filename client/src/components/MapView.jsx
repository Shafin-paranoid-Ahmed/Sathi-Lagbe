import React, { useEffect, useState } from "react";
import {
  APIProvider,
  Map,
  useMap,
  useMapsLibrary,
  AdvancedMarker,
} from "@vis.gl/react-google-maps";

const MapView = ({ startLocation, endLocation }) => {
  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <div style={{ height: "400px", width: "100%" }}>
        <Map
          mapId={import.meta.env.VITE_GOOGLE_MAPS_MAP_ID}
          defaultZoom={10}
          defaultCenter={{ lat: 23.8103, lng: 90.4125 }}
          gestureHandling={"greedy"}
          disableDefaultUI={true}
        >
          <Directions start={startLocation} end={endLocation} />
        </Map>
      </div>
    </APIProvider>
  );
};

function Directions({ start, end }) {
  const map = useMap();
  const routesLibrary = useMapsLibrary("routes");
  const geocodingLibrary = useMapsLibrary("geocoding");
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [geocodingService, setGeocodingService] = useState(null);
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);

  useEffect(() => {
    if (!routesLibrary || !map) return;
    setDirectionsService(new routesLibrary.DirectionsService());
    setDirectionsRenderer(new routesLibrary.DirectionsRenderer({ map }));
  }, [routesLibrary, map]);
  
  useEffect(() => {
    if (!geocodingLibrary) return;
    setGeocodingService(new geocodingLibrary.Geocoder());
  }, [geocodingLibrary]);

  useEffect(() => {
    if (!geocodingService || !start || !end) return;

    geocodingService.geocode({ address: start }, (results, status) => {
      if (status === 'OK') {
        setStartPoint(results[0].geometry.location);
      } else {
        console.error(`Geocode was not successful for the following reason: ${status}`);
      }
    });

    geocodingService.geocode({ address: end }, (results, status) => {
      if (status === 'OK') {
        setEndPoint(results[0].geometry.location);
      } else {
        console.error(`Geocode was not successful for the following reason: ${status}`);
      }
    });
  }, [geocodingService, start, end]);

  useEffect(() => {
    if (!directionsService || !directionsRenderer || !startPoint || !endPoint) return;

    directionsService
      .route({
        origin: startPoint,
        destination: endPoint,
        travelMode: window.google.maps.TravelMode.DRIVING,
      })
      .then((response) => {
        directionsRenderer.setDirections(response);
      })
      .catch((e) => console.error("Directions request failed due to " + e.status));

    return () => directionsRenderer.setMap(null);
  }, [directionsService, directionsRenderer, startPoint, endPoint]);

  return (
    <>
      {startPoint && <AdvancedMarker position={startPoint} />}
      {endPoint && <AdvancedMarker position={endPoint} />}
    </>
  );
}

export default MapView;
