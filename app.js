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

let fixture2 = " "; 
let phone2 = " ";
let email2 = " "; 
let date2 = "";
let time2 = "";
let venue2 = "";

env.config();

const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});

async function generateToken() {
    const consumerKey = process.env.CONSUMER_KEY;
    const consumerSecret = process.env.CONSUMER_SECRET;
    const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

    const encodedCredentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

    try {
        const response = await axios.get(url, {
            headers: { Authorization: `Basic ${encodedCredentials}` }
        });
        return response.data.access_token;
    } catch (error) {
        console.error("Token Error:", error.response?.data || error.message);
        throw new Error("Failed to get access token.");
    }
}

async function sendStkPush() {
    const token = await generateToken();
    const date = new Date();
    const timestamp =
        date.getFullYear() +
        ("0" + (date.getMonth() + 1)).slice(-2) +
        ("0" + date.getDate()).slice(-2) +
        ("0" + date.getHours()).slice(-2) +
        ("0" + date.getMinutes()).slice(-2) +
        ("0" + date.getSeconds()).slice(-2);

    const shortCode = "174379"; // ✅ Sandbox Paybill
    const passkey = process.env.PASS_KEY;

    const stk_password = Buffer.from(shortCode + passkey + timestamp).toString("base64");

    const url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";

    const headers = {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json"
    };

    const requestBody = {
        BusinessShortCode: shortCode,
        Password: stk_password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: "10",
        PartyA: "254759807494", // ✅ Ensure this is a test M-Pesa number
        PartyB: shortCode,
        PhoneNumber: "254759807494", // ✅ Must match PartyA
        CallBackURL: "https://yourwebsite.co.ke/callbackurl",
        AccountReference: "TestAccount",
        TransactionDesc: "Test Payment"
    };

    try {
        const response = await axios.post(url, requestBody, { headers });
        console.log("STK Push Response:", response.data);
    } catch (error) {
        console.error("STK Push Error:", error.response?.data || error.message);
    }
}
  
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
        const [articlesResult, fixturesResult, featuredPlayers] = await Promise.all([
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
                WHERE m.GAMEWEEK = 1 AND status = 'Not Completed'
                ORDER BY m.MDATE, m.MTIME;
            `),
            db.query(`
                SELECT
                    player.fname,
                    player.lname,
                    player.teamname,
                    player.position,
                    player.nationality,
                    player.image_url,
                    stats.playerid,
                    stats.matches_played,
                    stats.minutes_played,
                    stats.goals,
                    stats.assists,
                    team.logo_url
                FROM stats
                JOIN player ON stats.playerid = player.playerid
                JOIN team ON player.teamname  = team.teamname
                JOIN featured_players on stats.playerid = featured_players.playerid;
            `)
        ]);

        // Extract rows
        const articles = articlesResult.rows;
        const fixtures = fixturesResult.rows;
        const featured_players = featuredPlayers.rows;

        res.render("index.ejs", { activePage: "latest", articles, fixtures, featured_players });

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
        const { fixture, phone, email, date, time, venue } = req.body;
        const amount = "1";
        fixture2 = fixture;
        phone2 = phone;
        email2 = email;
        date2 = date;
        time2 = time;
        venue2 = venue;

        
        // Format phone number
        let formattedPhone = /^07\d{8}$/.test(phone) ? "254" + phone.substring(1) : phone;
        if (!/^2547\d{8}$/.test(formattedPhone)) {
            return res.status(400).json({ error: "Invalid phone number format." });
        }

        // Generate unique ticket ID
        const ticketId = uuidv4().slice(0, 8).toUpperCase();

        // Store ticket ID in the database
        await db.query(
            "INSERT INTO tickets (ticket_id, fixture, match_date, match_time, venue, email) VALUES ($1, $2, $3, $4, $5, $6)",
            [ticketId, fixture, date, time, venue, email]
        );

        // Generate QR Code as Buffer
        const qrData = `Ticket ID: ${ticketId}\nMatch: ${fixture}\nDate: ${date}\nTime: ${time}\nVenue: ${venue}\nEmail: ${email}`;
        const qrBuffer = await QRCode.toBuffer(qrData);

        // Email content with inline image reference
        const emailHTML = `
            <h3>Your Match Ticket</h3>
            <p><strong>Match:</strong> ${fixture}</p>
            <p><strong>Date:</strong> ${date}</p>
            <p><strong>Time:</strong> ${time}</p>
            <p><strong>Venue:</strong> ${venue}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Ticket ID:</strong> ${ticketId}</p>
            <p>Scan the QR Code below at the entrance:</p>
            <img src="cid:qrCodeImage" alt="QR Code" width="200">
        `;

        // Setup Nodemailer Transporter
        let transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "jagithirwa@gmail.com",
                pass: process.env.EMAIL_PWD,
            },
        });

        // Send Email with QR code as an attachment
        await transporter.sendMail({
            from: '"Dimba Itambe" <jagithirwa@gmail.com>',
            to: email,
            subject: "Your Match Ticket",
            html: emailHTML,
            attachments: [
                {
                    filename: "qrcode.png",
                    content: qrBuffer,
                    cid: "qrCodeImage",
                },
            ],
        });

        // Generate M-Pesa token and STK push request
        const token = await generateToken();
        const timestamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
        const shortCode = "174379";
        const stk_password = Buffer.from(`${shortCode}${process.env.PASS_KEY}${timestamp}`).toString("base64");

        const stkRequestBody = {
            BusinessShortCode: shortCode,
            Password: stk_password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: amount,
            PartyA: formattedPhone,
            PartyB: shortCode,
            PhoneNumber: formattedPhone,
            CallBackURL: "https://c20e-105-29-165-235.ngrok-free.app/",
            AccountReference: "MatchTicket",
            TransactionDesc: `Ticket for ${fixture}`
        };

        // Send STK Push request
        const stkResponse = await axios.post(
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            stkRequestBody,
            { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );

        // Store in pending_payments table
        await db.query(
            `INSERT INTO pending_payments 
             (checkout_request_id, phone, email, fixture, amount, match_date, match_time, venue)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                stkResponse.data.CheckoutRequestID,
                formattedPhone,
                email,
                fixture,
                amount,
                date,
                time,
                venue
            ]
        );

        // Auto-trigger mock callback in development
        if (process.env.NODE_ENV === "development") {
            setTimeout(async () => {
                try {
                    const mockCallback = {
                        Body: {
                            stkCallback: {
                                ResultCode: 0,
                                CheckoutRequestID: stkResponse.data.CheckoutRequestID,
                                CallbackMetadata: {
                                    Item: [
                                        { Name: "Amount", Value: amount },
                                        { Name: "MpesaReceiptNumber", Value: "MPESA" + Math.random().toString(36).substring(2, 10).toUpperCase() },
                                        { Name: "PhoneNumber", Value: formattedPhone }
                                    ]
                                }
                            }
                        }
                    };
                    await axios.post("https://c20e-105-29-165-235.ngrok-free.app/mpesa-callback", mockCallback);
                } catch (mockError) {
                    console.error("Mock callback failed:", mockError.message);
                }
            }, 5000);
        }

        res.redirect("/stk-success");

    } catch (err) {
        console.error("STK Push Error:", err.response?.data || err.message);
        res.status(500).json({ error: "Payment request failed." });
    }
});

// Updated callback handler with crash protection
app.post("/mpesa-callback", async (req, res) => {
    try {
        // Safely access callback data
        const callbackData = req.body;
        if (!callbackData?.Body?.stkCallback) {
            console.error("Invalid callback structure:", callbackData);
            return res.status(400).send("Invalid callback format");
        }

        const resultCode = callbackData.Body.stkCallback.ResultCode;
        const checkoutRequestID = callbackData.Body.stkCallback.CheckoutRequestID;

        // Always respond to M-Pesa first to prevent timeouts
        res.sendStatus(200);

        // Process successful payments only
        if (resultCode === 0) {
            try {
                const metadata = callbackData.Body.stkCallback.CallbackMetadata?.Item || [];
                const amount = metadata.find(item => item.Name === "Amount")?.Value;
                const phone = metadata.find(item => item.Name === "PhoneNumber")?.Value;
                const mpesaReceipt = metadata.find(item => item.Name === "MpesaReceiptNumber")?.Value;

                // Retrieve pending payment details
                const pendingPayment = await db.query(
                    `SELECT * FROM pending_payments WHERE checkout_request_id = $1`,
                    [checkoutRequestID]
                );

                if (pendingPayment.rows.length) {
                    const { email, fixture, match_date, match_time, venue } = pendingPayment.rows[0];

                    // Generate ticket
                    const ticketId = uuidv4().slice(0, 8).toUpperCase();
                    await db.query(
                        `INSERT INTO tickets 
                         (ticket_id, fixture, match_date, match_time, venue, email)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [ticketId, fixture, match_date, match_time, venue, email]
                    );

                    // Cleanup
                    await db.query(
                        `DELETE FROM pending_payments WHERE checkout_request_id = $1`,
                        [checkoutRequestID]
                    );

                    // Generate and email QR code
                    const qrData = `Ticket ID: ${ticketId}\nMatch: ${fixture}\nDate: ${match_date}\nTime: ${match_time}\nVenue: ${venue}`;
                    const qrBuffer = await QRCode.toBuffer(qrData);

                    await transporter.sendMail({
                        to: email,
                        subject: "Your Match Ticket",
                        html: `<h1>Ticket for ${fixture}</h1><p>Scan the QR code below:</p><img src="cid:qr"/>`,
                        attachments: [{
                            filename: "ticket.png",
                            content: qrBuffer,
                            cid: "qr"
                        }]
                    });
                }
            } catch (processError) {
                console.error("Payment processing failed:", processError);
            }
        } else {
            console.log("Payment canceled or failed:", callbackData.Body.stkCallback.ResultDesc);
        }

    } catch (err) {
        console.error("Callback Error:", err);
        // Already responded, no need to send another response
    }
});

app.get("/stk-success", (req, res) => {
    res.render("tickets/ticket.ejs");
});

app.get("/watch", async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM video_highlights ORDER BY uploaded_at DESC"
        );
        videos = result.rows;

        res.render("watch.ejs", { activePage: "watch", videos: videos });
    } catch (err){
        console.log(err);
        res.status(500).send("Server Error, cannot fetch Videos");
    }
});

app.get("/teams", async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM team ORDER BY teamname ASC"
        );
        teams = result.rows;

        res.render("teams.ejs", { activePage: "teams", teams: teams });
    } catch (err){
        console.log(err);
        res.status(500).send("Server Error, cannot fetch Teams");
    }
});

app.get("/players", async (req, res) => {
    try {
        const [playersResult, statsResult] = await Promise.all([
            db.query(`
                SELECT 
                    player.*, 
                    team.logo_url 
                FROM player 
                JOIN team ON player.teamname  = team.teamname
                ORDER BY player.playerid ASC;
            `),
            db.query(`
                SELECT 
                    player.fname,
                    player.lname,
                    player.teamname,
                    player.position,
                    stats.playerid,
                    stats.matches_played,
                    stats.minutes_played,
                    stats.goals,
                    stats.assists,
                    stats.yellowcards,
                    stats.redcards
                FROM stats
                JOIN player ON stats.playerid = player.playerid
                ORDER BY stats.goals DESC, stats.assists DESC;
            `)
        ]);
                
        players = playersResult.rows;
        stats = statsResult.rows;

        res.render("players.ejs", { activePage: "players", players: players, stats: stats });
    } catch (err){
        console.log(err);
        res.status(500).send("Server Error, cannot fetch Players");
    }
});

app.get("/fixtures", async (req, res) => {
    try {
        const [fixtures, results, leagueTable] = await Promise.all([
            db.query(`
                SELECT 
                    m.MATCHID, 
                    m.MDATE, 
                    TO_CHAR(m.MTIME, 'HH24:MI') AS MTIME, 
                    m.HOMETEAM, 
                    m.AWAYTEAM, 
                    m.HOSTEDBY, 
                    m.STATUS, 
                    homeTeam.logo_url AS home_logo,
                    awayTeam.logo_url AS away_logo
                FROM MATCH as m
				JOIN team homeTeam ON m.HOMETEAM = homeTeam.teamname
                JOIN team awayTeam ON m.AWAYTEAM = awayTeam.teamname
                WHERE status = 'Not Completed'
                ORDER BY m.MDATE, m.MTIME;
            `),
            db.query(`
                SELECT 
                    m.MATCHID, 
                    m.MDATE, 
                    TO_CHAR(m.MTIME, 'HH24:MI') AS MTIME, 
                    m.HOMETEAM, 
                    m.AWAYTEAM, 
                    m.home_score,
                    m.away_score,
                    m.HOSTEDBY, 
                    m.STATUS, 
                    homeTeam.logo_url AS home_logo,
                    awayTeam.logo_url AS away_logo,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'goalid', g.goalid, 
                                'scorer', p.lname, 
                                'teamname', g.teamname, 
                                'time_min', g.time_min,
                                'goaltype', g.goal_type
                            ) 
                            ORDER BY g.time_min ASC
                        ) FILTER (WHERE g.goalid IS NOT NULL), '[]'
                    ) AS goals
                FROM MATCH AS m
                JOIN team homeTeam ON m.HOMETEAM = homeTeam.teamname
                JOIN team awayTeam ON m.AWAYTEAM = awayTeam.teamname
                LEFT JOIN goal g ON g.matchid = m.matchid
                LEFT JOIN player p ON g.playerid = p.playerid
                WHERE m.status = 'Completed'
                GROUP BY m.MATCHID, homeTeam.logo_url, awayTeam.logo_url
                ORDER BY m.MDATE DESC, m.MTIME DESC;
            `),
            db.query(`
                SELECT 
                    ls.*, 
                    t.logo_url
                FROM league_standings AS ls
                JOIN team AS t ON ls.team_id = t.teamname
                ORDER BY ls.points DESC, ls.goal_difference DESC;
            `)
        ]);

        // Extract rows
        const fixturesResult = fixtures.rows;
        const fixtureResults = results.rows;
        const standings = leagueTable.rows;

        res.render("fixtures.ejs", { 
            activePage: "fixtures", 
            fixturesResult,
            fixtureResults,
            standings
        });
    } catch (err) {
        console.error("Error fetching fixtures:", err);
        res.status(500).send("Server Error, unable to fetch fixtures");
    }
});

app.get("/careers", async (req, res) => {
    try {
        const result = await db.query(
          "SELECT id, title, location, job_type, openings, description, deadline FROM jobs WHERE deadline >= CURRENT_DATE ORDER BY created_at DESC"
        );
        res.render("careers.ejs", { activePage: "careers", jobs: result.rows });
      } catch (error) {
        console.error("Error fetching jobs:", error);
        res.status(500).send("Server Error");
      }
});

app.get("/job/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const result = await db.query("SELECT * FROM jobs WHERE id = $1", [id]);
        console.log(result.rows[0]);
        res.render("careers/job-details.ejs", { activePage: "careers", job: result.rows[0] });
    } catch (error) {
        console.error("Error fetching jobs:", error);
        res.status(500).send("Server Error");
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});