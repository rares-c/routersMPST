const express = require("express");

const app = express();
app.use(express.json());
app.post("/", (req, res) => {
    console.log(req.body);
    res.end();
});

app.listen(8081, () => {
    console.log("test server listening on 8081");
});