# Sathi Lagbe - Campus Ride Sharing & Utility App

Sathi Lagbe is a full-stack MERN application designed to enhance the campus experience for BRAC University students. It provides a suite of tools including a real-time ride-sharing platform, classroom availability checker, friend system with status updates, real-time chat, and an SOS feature for emergencies.

## ✨ Key Features

-   **🚗 Real-time Ride Sharing:** Offer and find rides to and from campus. Includes one-time and recurring ride options.
-   **🤖 AI-Powered Ride Matching:** An intelligent matching system suggests the most suitable rides based on location, time, and user ratings.
-   **💬 Real-time Chat:** Communicate with friends and coordinate rides with an integrated chat system.
-   **👫 Friend System & Status Updates:** Connect with friends, see their availability (`Available`, `Busy`, `In Class`), and share your routine.
-   **🏫 Classroom Availability:** Check for free classrooms and labs in real-time based on the university's schedule.
-   **🆘 SOS Alerts:** Send emergency alerts with your location to pre-configured contacts.
-   **👤 User Profiles and Ratings:** Build your profile, and rate drivers and passengers to foster a trustworthy community.
-   **📅 Routine Management:** Manage your class schedule, which automatically updates your status for friends.

## 🛠️ Tech Stack

**Frontend:**

-   **React 19** with Vite
-   **Tailwind CSS** for styling
-   **React Router** for navigation
-   **Socket.IO Client** for real-time communication
-   **Axios** for API requests
-   **Chart.js** for data visualization

**Backend:**

-   **Node.js** with **Express.js**
-   **MongoDB** with **Mongoose** for the database
-   **Socket.IO** for real-time communication
-   **JSON Web Tokens (JWT)** for authentication
-   **bcryptjs** for password hashing
-   **Cloudinary** for image uploads

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later recommended)
-   [npm](https://www.npmjs.com/) (usually comes with Node.js)
-   [MongoDB](https://www.mongodb.com/try/download/community) (or a MongoDB Atlas account)

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/Sathi-Lagbe.git
    cd Sathi-Lagbe
    ```

2.  **Setup Backend:**
    ```bash
    cd server
    npm install
    ```
    Create a `.env` file in the `server` directory and add the following variables:
    ```env
    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret
    PORT=5000
    # Add Cloudinary credentials if you want to use image uploads
    CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
    CLOUDINARY_API_KEY=your_cloudinary_api_key
    CLOUDINARY_API_SECRET=your_cloudinary_api_secret
    ```

3.  **Setup Frontend:**
    ```bash
    cd ../client
    npm install
    ```
    Create a `.env` file in the `client` directory and add the following variables:
    ```env
    VITE_API_URL=http://localhost:5000
    VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
    ```

### Running the Application

1.  **Start the backend server:**
    ```bash
    cd server
    npm run dev 
    ```
    The server will start on `http://localhost:5000`.

2.  **Start the frontend development server:**
    ```bash
    cd client
    npm run dev
    ```
    The frontend will be available at `http://localhost:3000`.

## 📂 Project Structure

```
Sathi-Lagbe/
├── client/         # React frontend application
│   ├── src/
│   │   ├── api/        # Functions for making API calls
│   │   ├── assets/
│   │   ├── components/ # Reusable React components
│   │   ├── hooks/      # Custom React hooks
│   │   ├── pages/      # Page components for different routes
│   │   ├── services/   # Services like Socket.IO
│   │   └── utils/
│   └── ...
├── server/         # Node.js/Express backend application
│   ├── controllers/  # Logic for handling requests
│   ├── middleware/   # Express middleware (e.g., authentication)
│   ├── models/       # Mongoose schemas for MongoDB
│   ├── routes/       # API route definitions
│   ├── services/     # Business logic (e.g., AI matching, notifications)
│   ├── utils/        # Utility functions (e.g., socket setup)
│   └── index.js      # Server entry point
└── README.md
```

## 🐛 Known Issues

For a comprehensive list of known issues, bugs, and areas for improvement, please see our [ISSUES.md](ISSUES.md) file.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/your-username/Sathi-Lagbe/issues) or our [local issues documentation](ISSUES.md).

## 📝 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
