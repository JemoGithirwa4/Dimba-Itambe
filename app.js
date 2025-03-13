import express from "express";
import bodyParser from "body-parser";
import env from "dotenv";
import pg from "pg";

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

let articles = [];
let videos = [];
let teams = [];
let players = [];
let stats = [];

app.get("/", async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM Articles ORDER BY publisheddate DESC"
        );
        articles = result.rows;

        res.render("index.ejs", { activePage: "latest", articles: articles });
    } catch (err){
        console.log(err);
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

app.get("/pay-ticket", (req, res) => {
    res.render("tickets/ticket-pay.ejs", { activePage: "latest" });
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