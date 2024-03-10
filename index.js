import express from 'express';
import dotenv from 'dotenv';
import Ai from './routes/ai.js';
import Cors from "cors"

dotenv.config();

const app = express();
const port = process.env.LOCALPORT || 3000;
app.use(Cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.get('/', (req, res) => {
    res.send('Hello World');
});
app.use('/ai', Ai)


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});