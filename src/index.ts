import express from 'express';
import  userRoutes from './routes/user.routes';
const app: express.Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req: express.Request, res: express.Response) => {
  res.send('Express + TypeScript Server is running');
});

// Example POST request to create a user
/*
curl -X POST http://localhost:3000/user/user \
-H "Content-Type: application/json" \
-d '{
  "first_name": "John",
  "last_name": "Doe", 
  "email": "john.doe@example.com",
  "country_id": "US",
  "city": "New York",
  "state": "NY",
  "zip_code": "10001"
}'
*/

app.use('/', userRoutes);
// Start server
app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});