require("dotenv").config({ path: "../.env" });
const { expect } = require("chai");
const supertest = require("supertest");
const { app, connectToMongo } = require("../index");

const request = supertest(app);

describe("POST API Tests", function () {
  this.timeout(10000); // increase timeout to 10 seconds

  before(async () => {
    await connectToMongo();
  });

  let userId;

  it("should create a new user", async () => {
    const res = await request.post("/signup").send({
      email: "chibu@mail.com",
      password: "password123",
      confirmPassword: "password123",
      name: "Test User",
    });

    expect(res.status).to.equal(201);
    expect(res.body).to.have.property("message", "User created successfully");
    expect(res.body).to.have.property("user_id");

    userId = res.body.user_id;
  });

  it("should not create user with password less than 8 chars", async () => {
    const res = await request.post("/signup").send({
      email: "shortpass@example.com",
      password: "short",
      confirmPassword: "short",
      name: "Short Pass",
    });

    expect(res.status).to.equal(400);
    expect(res.body).to.have.property(
      "error",
      "Password must be at least 8 characters long"
    );
  });

  it("should sign in with valid credentials", async () => {
    const res = await request.post("/signin").send({
      email: "obi@example.com",
      password: "password123",
    });

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("message", "Login successful");
    expect(res.body.user).to.have.property("email", "obi@example.com");
  });

  it("should reject signin with invalid credentials", async () => {
    const res = await request.post("/signin").send({
      email: "obi@example.com",
      password: "wrongpassword",
    });

    expect(res.status).to.equal(401);
    expect(res.body).to.have.property("error", "Invalid email or password");
  });

  // Add more POST tests for locations, inventory, cart, orders if needed
});
