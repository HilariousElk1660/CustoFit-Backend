require("dotenv").config();
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const base64 = require("base-64");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/CustoFit";

app.use(
  cors({
    origin: ["http://localhost:5173", "http://www.custo-fit.com.s3-website-us-east-1.amazonaws.com"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
let client, db;

async function connectToMongo() {
  try {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db("CustoFit");
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  }
}

async function basicAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Basic")) {
    return res
      .status(401)
      .json({ message: "Authorization header missing or invalid" });
  }

  try {
    const base64Credentials = authHeader.split(" ")[1];
    const credentials = Buffer.from(base64Credentials, "base64").toString(
      "ascii"
    );
    const [email, password] = credentials.split(":");

    if (!email || !password) {
      return res.status(401).json({ message: "Invalid credentials format" });
    }

    const collection = db.collection("Users");
    const user = await collection.findOne({ email });

    // Check if user exists.
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Decode the stored password and compare it to the provided password.
    const storedPassword = base64.decode(user.password);
    if (password !== storedPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ message: "Server error during authentication" });
  }
}

// ------------------- PUBLIC ROUTES (NO AUTH REQUIRED) -------------------

// User signup
app.post("/signup", async (req, res) => {
  try {
    const user = req.body;

    if (!user.email || !user.password || !user.confirmPassword || !user.name) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (user.password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters long" });
    }
    if (!user.email.includes("@")) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    if (user.password !== user.confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    const collection = db.collection("Users");
    const existingUser = await collection.findOne({ email: user.email });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "An account with this email already exists" });
    }

    delete user.confirmPassword;
    user.password = base64.encode(user.password);

    const result = await collection.insertOne({
      ...user,
      createdAt: new Date(),
    });

    res.status(201).json({
      message: "User created successfully",
      user_id: result.insertedId,
    });
  } catch (error) {
    console.error(`Error creating user: ${error}`);
    res.status(500).json({ error: "Server error" });
  }
});

// User signin
app.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const userCollection = db.collection("Users");
    const foundUser = await userCollection.findOne({ email });

    if (!foundUser) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const decodedPassword = base64.decode(foundUser.password);
    if (decodedPassword !== password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    return res.status(200).json({
      message: "Login successful",
      user: {
        _id: foundUser._id,
        name: foundUser.name,
        email: foundUser.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ------------------- PROTECTED ROUTES (AUTH REQUIRED) -------------------
app.use(basicAuth);

// Get all users
app.get("/users", async (_, res) => {
  try {
    const users = await db.collection("Users").find().toArray();
    const usersWithoutPasswords = users.map(({ password, ...rest }) => rest);
    res.json(usersWithoutPasswords);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/users/:id", async (req, res) => {
  try {
    const result = await db
      .collection("Users")
      .updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
    res.json({ updated: result.modifiedCount });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/users/:id", async (req, res) => {
  try {
    const result = await db
      .collection("Users")
      .deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ deleted: result.deletedCount });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ------------------- USER LOCATIONS -------------------
app.post("/locations", async (req, res) => {
  try {
    const { userId, location } = req.body;
    const result = await db
      .collection("User Locations")
      .insertOne({ userId, location, createdAt: new Date() });
    res.status(201).json({ id: result.insertedId });
  } catch (error) {
    console.error("Error adding location:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/locations", async (_, res) => {
  try {
    const locations = await db.collection("User Locations").find().toArray();
    res.json(locations);
  } catch (error) {
    console.error("Error fetching locations:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/locations/:id", async (req, res) => {
  try {
    const result = await db
      .collection("User Locations")
      .updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
    res.json({ updated: result.modifiedCount });
  } catch (error) {
    console.error("Error updating location:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/locations/:id", async (req, res) => {
  try {
    const result = await db
      .collection("User Locations")
      .deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ deleted: result.deletedCount });
  } catch (error) {
    console.error("Error deleting location:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ------------------- INVENTORY -------------------
app.post("/inventory", async (req, res) => {
  try {
    const result = await db.collection("Inventory").insertOne(req.body);
    res.status(201).json({ id: result.insertedId });
  } catch (error) {
    console.error("Error adding inventory item:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/inventory", async (_, res) => {
  try {
    const inventory = await db.collection("Inventory").find().toArray();
    res.json(inventory);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/inventory/:id", async (req, res) => {
  try {
    const result = await db
      .collection("Inventory")
      .updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
    res.json({ updated: result.modifiedCount });
  } catch (error) {
    console.error("Error updating inventory:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ------------------- CART -------------------
app.post("/cart", async (req, res) => {
  try {
    const result = await db.collection("Cart").insertOne(req.body);
    res.status(201).json({ id: result.insertedId });
  } catch (error) {
    console.error("Error adding cart item:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/cart", async (_, res) => {
  try {
    const cart = await db.collection("Cart").find().toArray();
    res.json(cart);
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/cart/:id", async (req, res) => {
  try {
    const result = await db
      .collection("Cart")
      .updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
    res.json({ updated: result.modifiedCount });
  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/cart/:id", async (req, res) => {
  try {
    const result = await db
      .collection("Cart")
      .deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ deleted: result.deletedCount });
  } catch (error) {
    console.error("Error deleting cart:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ------------------- ORDERS -------------------
app.post("/orders", async (req, res) => {
  try {
    const result = await db.collection("Orders").insertOne(req.body);
    res.status(201).json({ id: result.insertedId });
  } catch (error) {
    console.error("Error adding order:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/orders", async (_, res) => {
  try {
    const orders = await db.collection("Orders").find().toArray();
    res.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/orders/:id", async (req, res) => {
  try {
    const result = await db
      .collection("Orders")
      .updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
    res.json({ updated: result.modifiedCount });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/orders/:id", async (req, res) => {
  try {
    const result = await db
      .collection("Orders")
      .deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ deleted: result.deletedCount });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Start server
app.listen(port, async () => {
  await connectToMongo();
  console.log(`Server is running on http://localhost:${port}`);
});

module.exports = { app, connectToMongo };