# GraphQL Task Management App 🚀

A modern, full-stack web application for managing tasks, built to demonstrate the power of GraphQL APIs combined with a sleek React frontend. 

## ✨ Features

* **User Authentication**: Secure user registration and login using JSON Web Tokens (JWT).
* **Task Management**: Create, read, update, and delete (CRUD) tasks.
* **Task Timers**: Includes built-in timer functionality for individual tasks.
* **GraphQL API**: Robust and efficient data fetching using Apollo Server and GraphQL schema definitions.
* **Modern UI**: A responsive, visually appealing interface styled with Tailwind CSS and Lucide React icons.
* **Single Deployment**: The Express backend is configured to serve the Vite-built static React application in production, making it easy to deploy as a single service.

## 🛠️ Tech Stack

**Frontend:**
* [React](https://react.dev/) - UI Library
* [Vite](https://vitejs.dev/) - Frontend Build Tool
* [Apollo Client](https://www.apollographql.com/docs/react/) - GraphQL Client for React
* [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

**Backend:**
* [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/) - Web Server
* [Apollo Server](https://www.apollographql.com/docs/apollo-server/) - GraphQL Server
* [SQLite3](https://www.sqlite.org/index.html) - Relational Database
* [JSON Web Token (JWT)](https://jwt.io/) - Authentication

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js and npm installed on your machine.

### Installation

1. Install dependencies for both backend and frontend:
   ```bash
   npm run install
   ```

### Running Locally

To run the application locally, you'll need to start both the frontend and backend servers.

**Start the Backend:**
Open a terminal and run:
```bash
npm start
```
*The GraphQL server will be available at `http://localhost:4000/graphql`*

**Start the Frontend:**
Open a new terminal and run:
```bash
cd frontend
npm run dev
```
*The React app will be available on your local Vite dev server.*

## ☁️ Deployment

This project is configured for easy deployment on platforms like [Render](https://render.com/) using the included `render.yaml` blueprint. 

When building for production:
1. `npm run build` will compile the React frontend into the `frontend/dist` directory.
2. The Node.js Express server is configured to serve these static files alongside the `/graphql` endpoint, meaning you only need to host a single Web Service.
