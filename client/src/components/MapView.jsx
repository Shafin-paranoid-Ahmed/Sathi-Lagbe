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
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [routes, setRoutes] = useState([]);

  useEffect(() => {
    if (!routesLibrary || !map) return;
    setDirectionsService(new routesLibrary.DirectionsService());
    setDirectionsRenderer(new routesLibrary.DirectionsRenderer({ map }));
  }, [routesLibrary, map]);

  useEffect(() => {
    if (!directionsService || !directionsRenderer || !start || !end) return;

    directionsService
      .route({
        origin: start,
        destination: end,
        travelMode: window.google.maps.TravelMode.DRIVING,
      })
      .then((response) => {
        directionsRenderer.setDirections(response);
        setRoutes(response.routes);
      });

    return () => directionsRenderer.setMap(null);
  }, [directionsService, directionsRenderer, start, end]);

  return (
    <>
      {start && <AdvancedMarker position={start} />}
      {end && <AdvancedMarker position={end} />}
    </>
  );
}

export default MapView;
