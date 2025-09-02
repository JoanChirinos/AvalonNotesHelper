
# Avalon Notes Helper - Setup & Start Guide


## Setup

After cloning the repo, run the following commands in each directory:

### Backend
1. Create a `.env` file in the `backend` directory with the following content:
	```env
	DATABASE_URL="file:./db/{DB_NAME}.db"
	```
2. Then run:
	```sh
	npm install
	npx prisma migrate dev --name init
	npx prisma generate
	npm start
	```

### Frontend
```
cd frontend
npm install
npm start
```

## Usage

- The backend runs on [http://localhost:5000](http://localhost:5000)
- The frontend runs on [http://localhost:3000](http://localhost:3000)
- API requests from the frontend are proxied to the backend automatically.

## Development Notes

- Make sure to run both backend and frontend servers for full functionality.
- Database migrations are handled by Prisma.
- Environment variables for the backend should be set in `backend/.env`.

---

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).
