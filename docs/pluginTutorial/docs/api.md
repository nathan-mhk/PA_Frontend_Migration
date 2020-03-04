# Mock API

Since we don't have genuine REST APIs for now, we have developed mock APIs that give us the traffic and air quality data.

You can find the source code of the mock APIs [here](https://gitlab.com/thenrikie/pathadvisor-frontend/-/tree/develop/docs/pluginTutorial/mockAPIs).

## Usage

We have three REST APIs available:

- `/traffic`: returns traffic data in a specified area
- `/air-quality`: returns air-quality data in a specified area
- `/rooms/info`: returns numbers of people and air quality in rooms

The `/traffic` and `/air-quality` API takes five parameters from query string:

- `x`, `y`, `toX`, `toY`: coordinates of the campus map. `x`, `y` is the top left corner and `toX`, `toY` is the coordinates of the bottom right corner of a rectangle area. The API returns data within this area.
- `floor`: floor of the campus map

## Response

The `/traffic` and `/air-quality` API returns data points for all tiles with 100x100 dimension that stay within or intersect with the rectangle area (x, y, toX, toY) in the following json format.

```json
[
  {
    "x": 0,
    "y": 0,
    "floor": "LG1",
    "width": 100,
    "height": 100,
    "value": 0.7398648648648649
  },
  {
    "x": 100,
    "y": 0,
    "floor": "LG1",
    "width": 100,
    "height": 100,
    "value": 0.6948198198198198
  }
]
```

`value` is in range [0, 1].

0 means no people to 1 means very busy for `/traffic` and 0 means best air quality to 1 means worst air quality for `/air-quality`.

`/rooms/info` API returns the following hard coded data.
```json
[
  {
    "name": "Barn B, ROOM 1101",
    "numOfPeople": 40,
    "airQuality": 1
  },
  {
    "name": "BARN C ROOM 4579-4580",
    "numOfPeople": 50,
    "airQuality": 0.5
  },
  {
    "name": "LTA",
    "numOfPeople": 100,
    "airQuality": 0.2
  },
  {
    "name": "LTB",
    "numOfPeople": 200,
    "airQuality": 0.7
  },
  {
    "name": "Passion",
    "numOfPeople": 23,
    "airQuality": 0.2
  }
]
```

- `name` is the name of the room
- `numOfPeople` is the number of the people in the room
- `airQuality` is the air quality of the room, 0 means best air quality to 1 means worst air quality.

## Setup

You can clone the repository

`git clone git@gitlab.com:thenrikie/pathadvisor-frontend.git`

then go into the mock API repo directory

`cd docs/pluginTutorial/mockAPIs`

and do install

`npm install`

and run the API locally

`npm start`

Now open a browser and try the following link

`http://localhost:8888/traffic?floor=LG1&x=0&y=0&toX=200&toY=200`

and you should able the see the response like this.

```json
[
  {
    "x": 0,
    "y": 0,
    "floor": "LG1",
    "width": 100,
    "height": 100,
    "value": 0.7398648648648649
  },
  {
    "x": 0,
    "y": 100,
    "floor": "LG1",
    "width": 100,
    "height": 100,
    "value": 0.7353603603603603
  },
  {
    "x": 100,
    "y": 0,
    "floor": "LG1",
    "width": 100,
    "height": 100,
    "value": 0.6948198198198198
  },
  {
    "x": 100,
    "y": 100,
    "floor": "LG1",
    "width": 100,
    "height": 100,
    "value": 0.23085585585585586
  }
]
```
