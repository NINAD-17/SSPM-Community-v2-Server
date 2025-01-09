import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const env = process.env.NODE_ENV || "development";
    let DB_URI;

    if (env === "development") {
      DB_URI = process.env.DEV_MONGODB_URI;
    } else if (env === "production") {
      DB_URI = process.env.PROD_MONGODB_URI;
    } else {
      DB_URI = process.env.TEST_MONGODB_URI;
    }

    console.log(`Connecting to MongoDB URI: ${DB_URI}`);
    const connectionInstance = await mongoose.connect(DB_URI);

    console.log(
      `\nMongoDB connected !! DB HOST: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log("MONGODB connection error: ", error);
    process.exit(1);
  }
};

export default connectDB;
