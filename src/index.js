import dotenv from "dotenv";
import connectDB from "./db/index.js";
import app from "./app.js";
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables with explicit path
dotenv.config({ path: path.join(__dirname, '../.env') });

connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is running at port: ${process.env.PORT}`);
        });

        // listening for the event of error
        app.on("error", (error) => {
            console.log("Error: ", error);
            throw error;
        });
    })
    .catch((error) => {
        console.log("MONGODB connection failed !!! ", error);
    });
    