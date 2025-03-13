import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import userRoutes from './routes/user.route.js';
import uploadRoutes from './routes/upload.route.js';

dotenv.config();

const port = process.env.PORT || 3000;

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server is running!');
});

app.use('/api', uploadRoutes);

app.use("/api/user", userRoutes);

app.listen(port, () => {
  connectDB();  
  console.log(`Server started at http://localhost:${port}`);
});