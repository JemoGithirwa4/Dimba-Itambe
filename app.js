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
                WHERE m.GAMEWEEK = 1
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
        const { fixture, phone, email, amount, date, time, venue } = req.body;

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
                pass: process.env.EMAIL_PWD,  // Use an App Password
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
                    cid: "qrCodeImage", // Content ID for embedding
                },
            ],
        });

        res.send("Ticket sent successfully!");
    } catch (err) {
        console.error(err);
        res.status(500).send("Payment failed. Try again.");
    }
});

app.get("/ticket-success", (req, res) => {
    res.render("tickets/ticket-success.ejs", { activePage: "latest" });
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
                    awayTeam.logo_url AS away_logo
                FROM MATCH as m
				JOIN team homeTeam ON m.HOMETEAM = homeTeam.teamname
                JOIN team awayTeam ON m.AWAYTEAM = awayTeam.teamname
                WHERE status = 'Completed'
                ORDER BY m.MDATE, m.MTIME DESC;
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

app.get("/shop", (req, res) => {
    res.render("shop.ejs", { activePage: "shop" });
});

app.get("/careers", (req, res) => {
    res.render("careers.ejs", { activePage: "careers" });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});