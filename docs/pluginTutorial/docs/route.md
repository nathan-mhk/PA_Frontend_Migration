# Route plugin

This tutorial assumed you have all the knowledge from [Heat map plugin](heat-map.md).

We will develop a very similar plugin to consume the data we have from our mock API to draw all walking paths with color indicating how the traffic or air quality for each path instead of drawing a heat map on the floor plan.

Before we start,

1. it is advised that you should read [documentation - things to avoid](https://pathadvisor.ust.hk/docs/#/thingsToAvoid/README) first so that we can have these principles in our mind when we are developing the plugin.

2. [PathAdvisor frontend running locally](setup.md)

3. [Make sure you have the mock API server started and working](api.md)

## Basic plugin files

We will name our plugin Traffic Route this time.
```text
src
└── plugins/
    └── TrafficRoute/
        ├──  package.json
        └──  TrafficRoute.js
```

content for **package.json**
```json
{
  "name": "@ust-pathadvisor/traffic-route-example",
  "version": "0.0.0",
  "private": true,
  "dependencies": {
    "react": "^16.4.1",
  }
}
```

Run this command to install whatwg-fetch dependency `npx bolt w @ust-pathadvisor/traffic-route-example add whatwg-fetch`

Copy most of the reusable logic and remove unrelated code from the previous plugin for **TrafficRoute.js**
```javascript
import 'whatwg-fetch';
import { Component } from 'react';

const colors = {
  green: 'rgba(99, 214, 104, 0.9)',
  yellow: 'rgba(255, 151, 17, 0.9)',
  red: 'rgba(242, 60, 50, 0.9)',
};

function valueToColor(value) {
  if (value > 0.67) {
    return colors.red;
  }

  if (value > 0.33) {
    return colors.yellow;
  }

  return colors.green;
}

async function getTraffic(x, y, toX, toY, floor) {
  const url = 'http://localhost:8888/traffic';
  const qs = `?x=${x}&y=${y}&toX=${toX}&toY=${toY}&floor=${encodeURIComponent(floor)}`;

  const response = await fetch(url + qs);
  return response.json();
}


class TrafficRoute extends Component {
  componentDidMount() {
  }

  componentDidUpdate() {
  }

  render() {
    return null;
  }
}

const MapCanvasPlugin = {
  Component: TrafficRoute,
  connect: ['setMapItems'],
};

const id = 'trafficRouteExample';
const name = 'Traffic Route';

export { id, name, MapCanvasPlugin };
```

If your plugin want to show air quality data instead, change the above url to

```javascript
  const url = 'http://localhost:8888/air-quality';
```

Import the plugin in `src/plugins/index.js` file so that it is actually loaded when the app start.

At the top of `index.js` file, add
```javascript
import * as Traffic from './TrafficRoute/TrafficRoute';
```

And at the end, add `TrafficRoute` to the array
```javascript
export default [
  ...,
  TrafficRoute, // <- Add traffic route plugin to the end
];
```

## Draw walking paths

The mocked traffic API only returns traffic data for 100x100 tiles at different position, there is no information about the position of the walking paths. In fact, the walking paths should be coming from the PathAdvisor system. You can get the all the walking paths within the current view port from a connected properties called `edgeStore`.

You can find out the schema of `edgeStore` [here](https://pathadvisor.ust.hk/docs/#/typesOfPlugins/README?id=edgestore) in the official documentation.

Basically in the store it contains a `success` boolean property and an array `edges` of edge item with `fromNodeCoordinates` and `toNodeCoordinates`.

We can check each time when `success` is true, then for each edge in the `edges` array, we draw a line on the map using the coordinates from the edge item.

To draw a line, we can use `setMapItems`.

For the full list of items you can draw, you can read [documentation - setMapItems](https://pathadvisor.ust.hk/docs/#/typesOfPlugins/README?id=setmapitems)


Add the following required properties to `connect` array to make them available to the plugin.

**TrafficRoute.js**
```javascript
const MapCanvasPlugin = {
  Component: TrafficRoute,
  connect: ['setMapItems', 'removeMapItems', 'edgeStore'],
};
```

Combining all the information above, we can then define the following function called `drawEdges` as a member function of `TrafficRoute` class.

```javascript

edgeIds = new Set();

drawEdges() {
  const { setMapItems, edgeStore } = this.props;
  const { success, edges } = edgeStore;

  if (!success) {
    return;
  }

  const edgeMapItems = edges.map(({ id, floor, fromNodeCoordinates, toNodeCoordinates }) => ({
    id,
    floor,
    line: {
      cap: 'round',
      strokeStyle: colors.green,
      width: 4,
      coordinates: [fromNodeCoordinates, toNodeCoordinates],
    },
  }));

  edgeMapItems.forEach(({ id }) => {
    this.edgeIds.add(id);
  });
  setMapItems(edgeMapItems);
}
```

And call the `drawEdges` function when the plugin is first mounted or when incoming edges are updated. We should remove items when component is unmounted.
```javascript
componentDidMount() {
  this.drawEdges();
}

componentDidUpdate() {
  this.drawEdges();
}

componentWillUnmount() {
  this.props.removeMapItems([...this.edgeIds]);
}
```

Now try to run the app locally, toggle on the plugin, you can see the green walking paths are now rendered on the map.

<img src="../imgs/walkingpaths.png" alt="Walking paths screenshot" />

## Color the walking paths

Note that we hard coded all walking paths to be green. We want them to be red if it is busy, yellow if the traffic is moderate and green if it is good. We have already defined `valueToColor` function above to help us with this logic, and we also have `getTraffic` function above to help us to get the traffic value for each 100x100 tile position.

We can say if the edge stays within a tile, then the traffic value of the edge is equal to that tile. If the edge is longer than a tile, then we can split the edge into multiple segments, and each segment should fit within a tile and the traffic value of that segment is equal to the tile enclosing it.

We can make use of this external library [trufjs](http://turfjs.org/docs/#lineIntersect) to help us to do the math.

Run the following command to install these dependencies:

* `npx bolt w @ust-pathadvisor/traffic-route-example add @turf/line-intersect`
* `npx bolt w @ust-pathadvisor/traffic-route-example add @turf/helpers`

Add the following lines to the top of **TrafficRoute.js**

```javascript
import lineIntersect from '@turf/line-intersect';
import { lineString, featureCollection } from '@turf/helpers';
```

and add these helper functions outside `TrafficRoute` class implementing the above logic:

```javascript
const dimension = 100;

function getFloor(value) {
  return Math.floor(value / dimension) * dimension;
}

function getCeil(value) {
  return Math.floor(value / dimension) * dimension;
}

function splitEdge(a, b) {
  const topLeft = [];
  const bottomRight = [];

  [0, 1].forEach(d => {
    let _a = a;
    let _b = b;

    if (a[d] > b[d]) {
      _a = b;
      _b = a;
    }

    topLeft[d] = getFloor(_a[d]);
    bottomRight[d] = getCeil(_b[d]);

    if (topLeft[d] === bottomRight[d]) {
      bottomRight[d] += dimension;
    }
  });

  const lines = [];
  for (let x = topLeft[0]; x <= bottomRight[0]; x += dimension) {
    lines.push([[x, topLeft[1]], [x, bottomRight[1]]]);
  }

  for (let y = topLeft[1]; y <= bottomRight[1]; y += dimension) {
    lines.push([[topLeft[0], y], [bottomRight[0], y]]);
  }

  const intersects = lineIntersect(
    lineString([a, b]),
    featureCollection(lines.map(line => lineString(line))),
  );

  const edges = [];
  [a, b, ...intersects.features.map(feature => feature.geometry.coordinates)]
    .sort((_a, _b) => {
      const dx = _a[0] - _b[0];
      if (!dx) {
        return _a[1] - _b[1];
      }
      return dx;
    })
    .forEach((_, index, sorted) => {
      if (!index) {
        return;
      }
      edges.push([sorted[index - 1], sorted[index]]);
    });

  return edges;
}
```

Now update the `drawEdges` function, we call `getTraffic(x, y, toX, toY, floor)` to get the tile with traffic data and put them into a hash map with `x`, `y` values as key so that we can get the traffic value by position quickly.

Note that unlike the previous plugin, we get position data from `getPosition` function instead of connecting them directly because our plugin doesn't need to re-render for every position changes. We only need to re-render if the edges from `edgeStore` are updated, and the update frequency of `edgeStore` is already throttled. If we connect to position parameters directly, `componentDidUpdate` will be invoked multiple times when user is doing drag and drop which is unnecessary and will cause performance issue.


Replace `drawEdges` function with the following:

```javascript
async drawEdges() {
  const { setMapItems, edgeStore, getPosition } = this.props;
  const { success, edges } = edgeStore;

  if (!success) {
    return;
  }

  const { movingLeftX, movingTopY, floor, normalizedWidth, normalizedHeight } = getPosition();

  const trafficTiles = await getTraffic(
    movingLeftX,
    movingTopY,
    movingLeftX + normalizedWidth,
    movingTopY + normalizedHeight,
    floor,
  );

  const trafficValuesByCoordinates = {};

  trafficTiles.forEach(({ x, y, value }) => {
    if (!trafficValuesByCoordinates[x]) {
      trafficValuesByCoordinates[x] = {};
    }

    trafficValuesByCoordinates[x][y] = value;
  });

  const edgeMapItems = [];

  edges.forEach(edge => {
    const { id, fromNodeCoordinates, toNodeCoordinates } = edge;
    const subEdges = splitEdge(fromNodeCoordinates, toNodeCoordinates);

    subEdges.forEach(([from, to]) => {
      const trafficValue = (trafficValuesByCoordinates[getFloor(from[0])] || {})[
        getFloor(from[1])
      ];

      if (Number.isNaN(trafficValue)) {
        return;
      }

      this.edgeIds.add(`${id}_${from.join('_')}_${to.join('_')}`);
      edgeMapItems.push({
        id: `${id}_${from.join('_')}_${to.join('_')}`,
        floor,
        line: {
          cap: 'round',
          strokeStyle: valueToColor(trafficValue),
          width: 4,
          coordinates: [from, to],
        },
      });
    });
  });

  setMapItems(edgeMapItems);
}

const MapCanvasPlugin = {
  Component: TrafficRoute,
  connect: ['setMapItems', 'removeMapItems', 'edgeStore', 'getPosition'], // <- Add getPosition to connect array
};

```

Now we have the full working plugin implemented! You can find the completed source code [here](https://gitlab.com/thenrikie/pathadvisor-frontend/-/tree/develop/docs/pluginTutorial/src/TrafficRoute).

<img src="../imgs/completed-walkingpaths.png" alt="Walking paths screenshot">