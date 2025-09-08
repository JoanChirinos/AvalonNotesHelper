
# Avalon Notes Helper - Setup & Start Guide


## Dev Setup

After cloning the repo, run the following commands in each directory:

### Backend
1. Create a `.env` file in the `backend` directory with the following content:
	```env
	DATABASE_URL="file:./db/{DB_NAME}.db"
	PROD="false"
	```
2. Then run:
	```sh
	npm install
	npx prisma migrate dev --name init
	npx prisma generate
	npm start
	```

### Frontend
```sh
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


## Prod Setup
	To set up in a production environment:

### Frontend
We want to build the frontend and serve it with express. To do so,
```sh
cd frontend
npm install
npm run build
```

### Backend
1. Change the `PROD` flag in the `.env` file in the backend directory to `"true"`. You likely also want to change the name of the database to your prod database
```env
DATABASE_URL="file:./db/{DB_NAME}.db"
PROD="true"
```

2. Then 
```sh
npm install
npx prisma migrate deploy
npx prisma generate
npm run build
npm run start
```

This should start serving your Express app with HTTPS and redirecting HTTP.

---

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).
