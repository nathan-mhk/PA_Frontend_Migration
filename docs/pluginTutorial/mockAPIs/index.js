"use strict";

const cors = require("cors");

function generateValue(seed, floor, step, x, y, toX, toY) {
  const mod = 888;

  x = Math.floor(x / step) * step;
  y = Math.floor(y / step) * step;

  toX = Math.ceil(toX / step) * step;
  toY = Math.ceil(toY / step) * step;

  const tiles = [];

  let currX = x;
  while (currX < toX) {
    let currY = y;
    while (currY < toY) {
      const token =
        [...floor].map(v => v.charCodeAt(0)).join("") +
        [...String(currX)].map(v => seed[v]).join("") +
        [...String(currY)].map(v => seed[v]).join("");
      tiles.push({
        x: currX,
        y: currY,
        floor,
        width: step,
        height: step,
        value: (parseInt(token) % mod) / mod
      });

      currY += step;
    }
    currX += step;
  }

  return tiles;
}

function parseQuery(query) {
  const { x, y, toX, toY, floor } = query;
  const intX = parseInt(x);
  const intY = parseInt(y);
  const intToX = parseInt(toX);
  const intToY = parseInt(toY);

  if (
    !x ||
    !y ||
    !floor ||
    isNaN(intX) ||
    isNaN(intY) ||
    isNaN(intToX) ||
    isNaN(intToY)
  ) {
    throw new Error(
      "Please specify x, y, toX, toY, floor in query. x, y, toX, toY must be integer"
    );
  }

  if (intToX < intX || intToY < intY) {
    throw new Error("toX must larger than x and toY must larger than y");
  }

  return { x: intX, y: intY, toX: intToX, toY: intToY, floor };
}

const express = require("express");
const app = express();
const port = 8888;

app.use(cors());
app.options("*", cors());
app.set("json spaces", 2);

app.get("/traffic", (req, res) => {
  const step = 100;
  const seed = [7, 4, 6, 1, 0, 2, 9, 3, 5, 8];
  const { x, y, toX, toY, floor } = parseQuery(req.query);
  res.json(generateValue(seed, floor, step, x, y, toX, toY));
});

app.get("/air-quality", (req, res) => {
  const step = 100;
  const seed = [1, 2, 0, 4, 9, 7, 8, 3, 5, 6];
  const { x, y, toX, toY, floor } = parseQuery(req.query);
  res.json(generateValue(seed, floor, step, x, y, toX, toY));
});

app.get("/rooms/info", (req, res) => {
  res.json([
    {
      name: "Barn B, ROOM 1101",
      numOfPeople: 40,
      airQuality: 1
    },
    {
      name: "BARN C ROOM 4579-4580",
      numOfPeople: 50,
      airQuality: 0.5
    },
    {
      name: "LTA",
      numOfPeople: 100,
      airQuality: 0.2
    },
    {
      name: "LTB",
      numOfPeople: 200,
      airQuality: 0.7
    },
    {
      name: "Passion",
      numOfPeople: 23,
      airQuality: 0.2
    }
  ]);
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
