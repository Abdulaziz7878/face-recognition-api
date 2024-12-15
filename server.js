const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt-nodejs");
const cors = require("cors");
const { user } = require("pg/lib/defaults");
const knex = require("knex")({
  client: "pg",
  connection: {
    host: "127.0.0.1",
    port: 5432,
    user: "Abdulaziz",
    password: "0982",
    database: "face-recognition",
  },
});

const app = express();

app.use(bodyParser.json());
app.use(cors());

app.get("/", (req, res) => {
  knex("users")
    .select("*")
    .returning("*")
    .then((users) => res.json(users));
});

app.post("/signin", (req, res) => {
  const { password, email } = req.body;
  if (password && email) {
    knex
      .select("email", "hash")
      .from("login")
      .where("email", "=", email)
      .then((data) => {
        const isValid = bcrypt.compareSync(password, data[0].hash);
        if (isValid) {
          knex
            .select("*")
            .from("users")
            .where({ email })
            .returning("*")
            .then((user) => res.json(user[0]))
            .catch((err) => res.status(400).json("unable to get user"));
        } else {
          res.status(400).json("Wrong password, please try again.");
        }
      })
      .catch((err) => {
        res.status(400).json("There seems to be an issue with your email");
      });
  } else {
    res.status(400).json("please ensure all required fields are filled");
  }
});

app.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  if (name && email && password) {
    const hash = bcrypt.hashSync(password);

    knex
      .transaction((trx) => {
        trx
          .insert({
            email,
            hash,
          })
          .into("login")
          .returning("email")
          .then((loginEmail) => {
            trx("users")
              .returning("*")
              .insert({
                name,
                email: loginEmail[0].email,
                joined: new Date(),
              })
              .then((user) => {
                res.json(user[0]);
              });
          })
          .then(trx.commit)
          .catch(trx.rollback);
      })
      .catch((err) =>
        res
          .status(400)
          .json(
            "Unable to register, there seems to be an issue with your credentials"
          )
      );
  } else {
    res
      .status(400)
      .json("Please ensure all required fields are filled correctly");
  }
});

app.get("/profile/:id", (req, res) => {
  const { id } = req.params;

  knex
    .select("*")
    .from("users")
    .where({ id })
    .then((user) => {
      if (user.length) {
        res.json(user[0]);
      } else {
        res.status(400).json("User Not found");
      }
    })
    .catch((err) => res.json("error getting user"));
});

app.put("/image", (req, res) => {
  const { id } = req.body;
  knex("users")
    .where({ id })
    .increment("entries", 1)
    .returning("entries")
    .then((entries) => {
      res.json(entries[0].entries);
    })
    .catch((err) => res.status(400).json("Error while getting entries"));
});

app.listen(3000, () => {
  console.log("The app is running in 3000");
});
