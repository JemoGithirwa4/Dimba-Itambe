import express from "express";
import bodyParser from "body-parser";
import env from "dotenv";
import pg from "pg";
import QRCode from "qrcode";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import axios  from "axios";

const PORT = process.env.PORT || 3005;

const app = express();

env.config();

const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});
  
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let videos = [];
let teams = [];
let players = [];
let stats = [];

app.get("/", async (req, res) => {
    try {
        // Run queries concurrently using Promise.all()
        const [articlesResult, fixturesResult] = await Promise.all([
            db.query("SELECT * FROM Articles ORDER BY publisheddate DESC"),
            db.query(`
                SELECT 
                    m.MATCHID, 
                    m.GAMEWEEK, 
                    m.MDATE, 
                    TO_CHAR(m.MTIME, 'HH24:MI') AS MTIME,
                    m.HOMETEAM, 
                    m.AWAYTEAM, 
                    m.HOSTEDBY, 
                    homeTeam.logo_url AS home_logo,
                    awayTeam.logo_url AS away_logo
                FROM MATCH m
                JOIN team homeTeam ON m.HOMETEAM = homeTeam.teamname
                JOIN team awayTeam ON m.AWAYTEAM = awayTeam.teamname
                WHERE m.GAMEWEEK = 1
                ORDER BY m.MDATE, m.MTIME;
            `)
        ]);

        // Extract rows
        const articles = articlesResult.rows;
        const fixtures = fixturesResult.rows;

        res.render("index.ejs", { activePage: "latest", articles, fixtures });

    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

app.get("/article/:id", async(req, res) => {
    try {
        const articleId = req.params.id;
        const result = await db.query(
            "SELECT * FROM Articles WHERE articleid = $1", [articleId]
        );

        let blog = result.rows;

        res.render("home/article.ejs", {
            activePage: "latest",
            article: blog[0]
        });
    } catch (error) {
      res.status(500).send("Error fetching post");
    }
});

app.get("/pay-ticket/:matchid", async (req, res) => {
    try {
        const matchid = req.params.matchid;
        const result = await db.query("SELECT * FROM MATCH WHERE MATCHID = $1", [matchid]);

        res.render("tickets/ticket-pay.ejs", { fixture: result.rows[0], activePage: "latest" });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

app.post("/purchase-ticket", async (req, res) => {
    try {
        const { fixture, phone, email, amount, date, time, venue } = req.body;

        // Generate unique ticket ID
        const ticketId = uuidv4().slice(0, 8).toUpperCase();

        // Step 1: Initiate STK Push
        const token = await generateToken(); // Function to generate OAuth token
        const timestamp = new Date()
            .toISOString()
            .replace(/[^0-9]/g, "")
            .slice(0, 14); // Format: YYYYMMDDHHMMSS

        const shortCode = "174379"; // Sandbox PayBill (replace with production shortcode)
        const passkey = process.env.PASS_KEY; // Sandbox passkey (replace with production passkey)
        const stk_password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64");

        const stkPushResponse = await axios.post(
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", // Sandbox URL
            {
                BusinessShortCode: shortCode,
                Password: stk_password,
                Timestamp: timestamp,
                TransactionType: "CustomerPayBillOnline",
                Amount: amount,
                PartyA: phone,
                PartyB: shortCode,
                PhoneNumber: phone,
                CallBackURL: "https://your-ngrok-url.ngrok.io/callback", // Replace with your callback URL
                AccountReference: ticketId, // Use ticket ID as reference
                TransactionDesc: "Ticket Purchase",
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        console.log("STK Push Response:", stkPushResponse.data);

        // Step 2: Respond to the client
        res.send("STK Push initiated. Please complete the payment on your phone.");
    } catch (err) {
        console.error(err);
        res.status(500).send("Payment initiation failed. Try again.");
    }
});

// Callback route to handle payment confirmation
app.post("/callback", async (req, res) => {
    try {
        const callbackData = req.body;

        // Check if payment was successful
        if (callbackData.Body.stkCallback.ResultCode === 0) {
            const ticketId = callbackData.Body.stkCallback.CallbackMetadata.Item[4].Value; // Extract ticket ID from reference

            // Step 3: Fetch ticket details from the request (or store them temporarily)
            const { fixture, date, time, venue, email } = req.body;

            // Step 4: Insert ticket into the database
            await db.query(
                "INSERT INTO tickets (ticket_id, fixture, match_date, match_time, venue, email) VALUES ($1, $2, $3, $4, $5, $6)",
                [ticketId, fixture, date, time, venue, email]
            );

            // Step 5: Generate QR Code
            const qrData = `Ticket ID: ${ticketId}\nMatch: ${fixture}\nDate: ${date}\nTime: ${time}\nVenue: ${venue}\nEmail: ${email}`;
            const qrBuffer = await QRCode.toBuffer(qrData);

            // Step 6: Send email with QR code
            let transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: "jagithirwa@gmail.com",
                    pass: process.env.EMAIL_PWD, // Use an App Password
                },
            });

            await transporter.sendMail({
                from: '"Dimba Itambe" <jagithirwa@gmail.com>',
                to: email,
                subject: "Your Match Ticket",
                html: `
                    <h3>Your Match Ticket</h3>
                    <p><strong>Match:</strong> ${fixture}</p>
                    <p><strong>Date:</strong> ${date}</p>
                    <p><strong>Time:</strong> ${time}</p>
                    <p><strong>Venue:</strong> ${venue}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Ticket ID:</strong> ${ticketId}</p>
                    <p>Scan the QR Code below at the entrance:</p>
                    <img src="cid:qrCodeImage" alt="QR Code" width="200">
                `,
                attachments: [
                    {
                        filename: "qrcode.png",
                        content: qrBuffer,
                        cid: "qrCodeImage", // Content ID for embedding
                    },
                ],
            });

            console.log("Ticket sent to:", email);
        }

        // Respond to Safaricom's callback
        res.status(200).send("Callback received successfully.");
    } catch (err) {
        console.error("Callback error:", err);
        res.status(500).send("Callback processing failed.");
    }
});

// Function to generate OAuth token
async function generateToken() {
    const consumerKey = process.env.CONSUMER_KEY; // Replace with your sandbox/production key
    const consumerSecret = process.env.CONSUMER_SECRET; // Replace with your sandbox/production secret
    const authUrl = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

    const response = await axios.get(authUrl, {
        auth: {
            username: consumerKey,
            password: consumerSecret,
        },
    });

    return response.data.access_token;
}

app.get("/ticket-success", (req, res) => {
    res.render("tickets/ticket-success.ejs", { activePage: "latest" });
});

app.get("/watch", (req, res) => {
    res.render("watch.ejs", { activePage: "watch" });
});

app.get("/teams", (req, res) => {
    res.render("teams.ejs", { activePage: "teams" });
});

app.get("/fixtures", (req, res) => {
    res.render("fixtures.ejs", { activePage: "fixtures" });
});

app.get("/shop", (req, res) => {
    res.render("shop.ejs", { activePage: "shop" });
});

app.get("/careers", (req, res) => {
    res.render("careers.ejs", { activePage: "careers" });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});