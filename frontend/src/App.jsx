import React from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';

import RideOfferForm from './components/RideOfferForm';
import RideMatchResults from './components/RideMatchResults';
import RideCoordination from './components/RideCoordination';
import MyRides from './components/MyRides';
import RideEditForm from './components/RideEditForm';
import RideDeleteForm from './components/RideDeleteForm';
import FeedbackForm from './components/FeedbackForm';
import FreeRooms from './components/FreeRooms';


export default function App() {

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top navigation */}
      <nav className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-3 flex space-x-6">
          <Link to="/offer" className="text-gray-700 hover:text-blue-600 font-medium">
            Offer Ride
            </Link>
          <Link to="/search" className="text-gray-700 hover:text-blue-600 font-medium">
            Find Ride
            </Link>
          <Link to="/myrides" className="text-gray-700 hover:text-blue-600 font-medium">
              My Rides
              </Link>
          <Link to="/free" className="text-gray-700 hover:text-blue-600 font-medium">Free Rooms
            </Link>

        </div>
      </nav>

      {/* Main content area */}
      <main className="max-w-4xl mx-auto p-4">
        <Routes>
          {/* Redirect root */}
          <Route path="/" element={<Navigate to="/offer" replace />} />

          {/* Your three screens */}
          <Route path="/offer" element={<RideOfferForm />} />
          <Route path="/search" element={<RideMatchResults />} />
          <Route path="/rides/:rideId/manage" element={<RideCoordination />} />
          <Route path="/myrides" element={<MyRides />} />
          <Route path="/rides/:rideId/edit" element={<RideEditForm />} />
          <Route path="/rides/:rideId/delete" element={<RideDeleteForm />} />
          <Route path="/rides/:rideId/feedback" element={<FeedbackForm />} />
           <Route path="/free" element={<FreeRooms />} />
          {/* 404 fallback */}
          <Route
            path="*"
            element={
              <div className="text-center text-gray-600 mt-20">
                <h2 className="text-2xl font-semibold">404 — Page Not Found</h2>
                <p className="mt-4">Sorry, we couldn’t find that page.</p>
                <Link to="/offer" className="text-blue-600 hover:underline">
                  Back to Offer Ride
                </Link>
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
