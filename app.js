import express from "express";
import bodyParser from "body-parser";

const PORT = process.env.PORT || 3005;

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.render("index.ejs", { activePage: "latest" });
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