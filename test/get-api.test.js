require("dotenv").config({ path: "../.env" });
const { expect } = require("chai");
const supertest = require("supertest");
const { app, connectToMongo } = require("../index");

let request;

describe("GET API Tests", function () {
  this.timeout(15000); // Increase timeout to 10 seconds

  before(async () => {
    await connectToMongo();
    request = supertest(app);
  });

  it("should get all users (protected route)", async () => {
    // Since your GET /users requires basic auth, you need to provide credentials here.
    // For testing, use base64 encoded "email:password" of a test user you created during POST tests.

    const email = "testuser@example.com";
    const password = "password123";
    const basicAuth = Buffer.from(`${email}:${password}`).toString("base64");

    const res = await request
      .get("/users")
      .set("Authorization", `Basic ${basicAuth}`);

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("array");
    if (res.body.length > 0) {
      expect(res.body[0]).to.not.have.property("password");
    }
  });

  it("should get all locations", async () => {
    // /locations GET is protected too (uses basicAuth middleware)
    const email = "testuser@example.com";
    const password = "password123";
    const basicAuth = Buffer.from(`${email}:${password}`).toString("base64");

    const res = await request
      .get("/locations")
      .set("Authorization", `Basic ${basicAuth}`);

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("array");
  });

  it("should get all inventory items", async () => {
    const email = "testuser@example.com";
    const password = "password123";
    const basicAuth = Buffer.from(`${email}:${password}`).toString("base64");

    const res = await request
      .get("/inventory")
      .set("Authorization", `Basic ${basicAuth}`);

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("array");
  });

  it("should get all cart items", async () => {
    const email = "testuser@example.com";
    const password = "password123";
    const basicAuth = Buffer.from(`${email}:${password}`).toString("base64");

    const res = await request
      .get("/cart")
      .set("Authorization", `Basic ${basicAuth}`);

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("array");
  });

  it("should get all orders", async () => {
    const email = "testuser@example.com";
    const password = "password123";
    const basicAuth = Buffer.from(`${email}:${password}`).toString("base64");

    const res = await request
      .get("/orders")
      .set("Authorization", `Basic ${basicAuth}`);

    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("array");
  });
});
