import dotenv from 'dotenv';
import connectDB from './src/db/index.js';
import app from './src/app.js';

dotenv.config({
    path: '/env'
});

connectDB()
.then (() => {
    app.listen(process.env.PORT, () => {
        console.log(`Server is running on port ${process.env.PORT}`);
    });
})
.catch((error) => {
    console.log("Error connecting to the Mongodb:"+error);
});