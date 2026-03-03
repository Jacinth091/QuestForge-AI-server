import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import AuthRoute from "./routes/auth.route.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cookieParser());
app.use(morgan("dev"));
app.use(express.json());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.CORS_ORIGIN
        : process.env.CORS_ORIGIN,
    credentials: true,
  }),
);

app.use("/api/auth/", AuthRoute);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
