# Heat map plugin

We will develop a plugin to consume the data we have from our mock API to draw a heat map on the map to show the traffic or air quality.

Before we start,

1. it is advised that you should read [documentation - things to avoid](https://pathadvisor.ust.hk/docs/#/thingsToAvoid/README) first so that we can have these principles in our mind when we are developing the plugin.

2. [PathAdvisor frontend running locally](setup.md)

3. [Make sure you have the mock API server started and working](api.md)

## Basic plugin files

To create a plugin, we first need to create the following files in `plugin` folder in your forked repository.

```text
src
└── plugins/
    └── Traffic/
        ├──  package.json
        └──  Traffic.js
```

content for **package.json**
```json
{
  "name": "@ust-pathadvisor/traffic-example",
  "version": "0.0.0",
  "private": true,
  "dependencies": {
    "react": "^16.4.1"
  }
}
```

package.json is a file to define dependencies of the plugin. We will later add more dependencies using the command `npx bolt w @ust-pathadvisor/traffic-example add [library-name]`, where [library-name] is any library from [https://www.npmjs.com](https://www.npmjs.com).

For full documentation on package.json, you can read [documentation - package.json](https://pathadvisor.ust.hk/docs/#/pluginStructure/README?id=packagejson).

content for **Traffic.js**
```javascript
import React, { Component } from 'react';

class Traffic extends Component {

  componentDidUpdate() {
  }

  render() {
    console.log('render called');
    return null;
  }
}

const MapCanvasPlugin = {
  Component: Traffic,
  connect: [],
};

const id = 'trafficExample';
const name = 'Traffic';

export { id, name, MapCanvasPlugin };
```

Since we are drawing heat map on the map area, we only need export our plugin as `MapCanvasPlugin`.

For full documentation on plugin types, you can read [documentation - plugin types](https://pathadvisor.ust.hk/docs/#/typesOfPlugins/README).

Finally, we still need to import our plugin in `src/plugins/index.js` file so that it is actually loaded when the app start.

At the top of `index.js` file, add
```javascript
import * as Traffic from './Traffic/Traffic';
```

And at the end, add `Traffic` to the array
```javascript
export default [
  MapTile,
  CampusBuildingOverlay,
  MapItem,
  Pin,
  NearestResult,
  ShortestResult,
  Legend,
  StreetView,
  ZoomButton,
  NearestResultMobile,
  LegendButton,
  ContextMenu,
  LiveView,
  Traffic, // <- Add traffic plugin among all other plugins
];
```

## Adding a red square

Now that you have added the files mentioned in the previous section, open a terminal go to your pathadvisor directory, and run `npm start`.

Now you should be able to visit your local pathadvisor: http://localhost:3000.

Click on the settings icon <img src="../imgs/settings.png" alt="Settings" style="width: 20px" /> at the bottom right corner, you will see a panel appear and you will see your plugin's name is already there.

<img src="../imgs/plugin-panel.png" style="width: 50%" alt="Plugin Panel" />

Let's try out the frontend API and add a red square to the map at the center coordinate.

Add the following colors code to Traffic.js, they will be used to show the traffic of the map.

```javascript
const colors = {
  green: 'rgba(99, 214, 104, 0.4)',
  yellow: 'rgba(255, 151, 17, 0.4)',
  red: 'rgba(242, 60, 50, 0.4)',
};
```

In order to add a square to the center, we need the following properties.

* `x` - The current x coordinate at the center
* `y` - The current y coordinate at the center
* `floor` - The current floor
* `setMapItems` - A function to add items the the map area

You can find the full list of properties available here [documentation - MapCanvasPlugin](https://pathadvisor.ust.hk/docs/#/typesOfPlugins/README?id=mapcanvasplugin)

We need to connect these four properties before we can use it, to connect it, you can add them to `connect` array in Traffic.js,

```javascript
const MapCanvasPlugin = {
  Component: Traffic,
  connect: ['x', 'y', 'floor', 'setMapItems'],
};
```

then it will be ready for consumption from `this.props`.

```javascript
  componentDidUpdate() {
    const { x, y, floor, setMapItems } = this.props;
    console.log('These properties are now defined in componentDidUpdate function', x, y, floor, setMapItems);
  }

  render() {
    const { x, y, floor, setMapItems } = this.props;
    console.log('These properties are now defined in render function', x, y, floor, setMapItems);
  }
```

If you try to drag and drop to map, it will update its x, y values. Every time x or y value is updated, both `render` and `componentDidUpdate` function will be called.

Now given that we have the `x`, `y` coordinates which is the center coordinates the user is viewing, we can use `setMapItems` to add a square with red color at this `(x, y)` coordinates on current `floor`.

`setMapItems` takes an array of items to be added, all items should have at least `id`, `x`, `y` and `floor` properties defined. To add a square, we further define a `rect` object with `width`, `height` and `color` properties which define the color and size of the square.

For the full list of items you can set for `setMapItems`, you can read [documentation - setMapItems](https://pathadvisor.ust.hk/docs/#/typesOfPlugins/README?id=setmapitems)


For now We can call `setMapItems` in either `render` or `componentDidUpdate` function, it will have the same effect. However, `render` is usually for returning React element and it should not cause side effect like API calls or interacting with browser. The best practice to do this in `componentDidUpdate`.

This is what we have now for in the `componentDidUpdate` function.

```javascript
componentDidUpdate() {
  const { x, y, floor, setMapItems } = this.props;

  const width = 100;
  const height = 100;

  setMapItems([
    {
      id: 'testRect1',
      x: x - width / 2,
      y: y - height / 2,
      floor,
      rect: {
        width,
        height,
        color: colors.red,
      },
    },
  ]);
}
```

Now if you go to your local development path advisor website, you still can't see a red square in the middle. That's because your plugin is switched off by default. Now open the plugin panel by clicking on the settings icon again, and click the toggle button next to Traffic plugin. Now you should see a red square width 100px x 100px dimension in the middle.

<img src="../imgs/red-square.png" style="width: 50%" alt="Red square" />

If you try to zoom in or zoom out, you will find out that the square would still keep the same size. This is useful for some cases like adding an arrow to indicate a position, you wouldn't want the arrow reduces or increases in size when the user zooms in or out.

However, imagine this red square represents an area with busy traffic, it needs to reduce or increase its size with the map tiles and zoom level as it represents the traffic of an absolute rectangle area `(x, y)` to `(x + width, y + height)`. The `width` and `height` defined above for the rectangle is always the width and height of the rectangle at zoom level 0 which is the largest zoom level possible in path advisor system.

To make it scale with zoom level, you can simply set `scaleDimension` to true while calling `setMapItems` for the item.

```javascript
  setMapItems([
    {
      id: 'testRect1',
      x: x - width / 2,
      y: y - height / 2,
      floor,
      scaleDimension: true, // make the dimension of the item scale with zoom level
      rect: {
        width,
        height,
        color: colors.red,
      },
    },
  ]);
```

Now you can see the red square scales with the zoom level.

Now when you toggle on the plugin, you can see the red square. However, when you toggle it off, you will find that the red square is still there visible on the map. This is because we haven't done any clean up work when the plugin is being removed.

You can do all the clean up work in a class function named `componentWillUnmount` which is one of the React component life cycle that will be called when the component is going to be removed from the rendering tree.

In `componentWillUnmount` we can call `removeMapItems` function to remove any item set in the map area, which we will need to put it in `connect` array before it is available to the component. `removeMapItems` take an array of ids to be removed. In our case, our red square has the id `testRect1`. So we can do `removeMapItems(['testRect1'])` to remove it.

```javascript
class Traffic extends Component {

  componentWillUnmount() {
    // remove any map item set when this component is being removed
    this.props.removeMapItems(['testRect1']);
  }

  componentDidUpdate() {
    const { x, y, floor, setMapItems } = this.props;

    const width = 100;
    const height = 100;

    setMapItems([
      {
        id: 'testRect1',
        x: x - width / 2,
        y: y - height / 2,
        floor,
        rect: {
          width,
          height,
          color: colors.red,
        },
        scaleDimension: true,
      },
    ]);
  }

  render() {
    return null;
  }
}

const MapCanvasPlugin = {
  Component: Traffic,
  connect: ['x', 'y', 'floor', 'setMapItems', 'removeMapItems'],
};
```

Now try to toggle the plugin on and off, you can see the red square is being rendered when the plugin is on and removed when it is off.

## Consuming APIs

We can now consume the mock API to get traffic data at different coordinates and draw a green tile if traffic is low, yellow tile if traffic is moderate and red tile if traffic is high at different positions.

We can use native [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) API to make API call to consume the traffic API. However, there is no support for `fetch` for any version of IE and early versions of Edge and path advisor system aims to support at least IE 11, therefore we need to add a `fetch` polyfill for this plugin so that it works on IE as well.

[`whatwg-fetch`](https://www.npmjs.com/package/whatwg-fetch) is a library from npm to polyfill `fetch`. In terminal at pathadvisor directory, we can do
`npx bolt w @ust-pathadvisor/traffic-example add whatwg-fetch` to install this dependency.

Now at the top of Traffic.js file, add this line

```javascript
import 'whatwg-fetch';
```

And now we are safe to use `fetch` API without worrying browser compatibility.

Assume you have get the [mock API up and running at localhost:8888](api.md), the following function takes coordinates `x`, `y`, `toX`, `toY` and `floor` and makes API request to mock traffic API to get back traffic data at this coordinates, add it to Traffic.js.

```javascript
async function getTraffic(x, y, toX, toY, floor) {
  const url = 'http://localhost:8888/traffic';
  const qs = `?x=${x}&y=${y}&toX=${toX}&toY=${toY}&floor=${encodeURIComponent(floor)}`;

  const response = await fetch(url + qs);
  return response.json();
}
```

If your plugin want to show air quality data instead, change the above url to

```javascript
  const url = 'http://localhost:8888/air-quality';
```

Now we have the ability to get traffic data at different tile position, we just need to know the current weight and height of the map (at zoom level 0) and the top left coordinates of the map, then we can make the API calls with these information and get back the traffic data within this area.

We can connect the following properties to get weight, height and left top coordinates of the map of the current visible area.

- `normalizedWidth` - width of the map at zoom level 0
- `normalizedHeight` - height of the map at zoom level 0
- `movingLeftX` - x coordinate of top left corner
- `movingTopY` - y coordinate of top left corner

Add these four properties in connect array in Traffic.js
```javascript
const MapCanvasPlugin = {
  Component: Traffic,
  connect: [
    'x',
    'y',
    'floor',
    'setMapItems',
    'removeMapItems',
    'normalizedWidth',
    'normalizedHeight',
    'movingLeftX',
    'movingTopY',
  ],
};
```

We then can use them to make API calls using `getTraffic` function we have implemented above.

Add more code to `componentDidUpdate` in Traffic.js
```javascript
  componentDidUpdate() {

    const { x, y, floor, setMapItems, normalizedWidth, normalizedHeight, movingLeftX, movingTopY } = this.props;

    console.log(
      'Make api calls for this area',
      floor,
      movingLeftX,
      movingTopY,
      movingLeftX + normalizedWidth,
      movingTopY + normalizedHeight,
    );
  }
```

Now try to run the pathadvisor system with this code, switch on your plugin and open your browser development console to inspect messages logged. You will find out every time you drag and drop the map, even just a slight movement produces large amount of messages. If we genuinely make API call instead of logging message, it means there are multiple API calls in short amount of time which is wasteful and is going to cause performance issue.

Therefore we need to throttle the number of calls, for example, we only allow once per second in this case. We can use [lodash.throttle](https://lodash.com/docs/4.17.15#throttle) library to help us to achieve this.

Do `npx bolt w @ust-pathadvisor/traffic-example add lodash.throttle` to install this library for our plugin.

Now add this line to the top of Traffic.js
```javascript
import throttle from 'lodash.throttle';
```

and change the `componentDidUpdate` to

```javascript
  throttledGetTraffic = throttle(() => {
    const { x, y, floor, setMapItems, normalizedWidth, normalizedHeight, movingLeftX, movingTopY } = this.props;
    console.log(
      'Make api calls for this area',
      floor,
      movingLeftX,
      movingTopY,
      movingLeftX + normalizedWidth,
      movingTopY + normalizedHeight,
    );
  }, 1000);

  componentDidUpdate() {
    this.throttledGetTraffic();
  }
```
Now try to switch on the plugin and browser development console then drag the map, you will see there will be at most one logged message per second.

Add the following function outside `Traffic` class to convert traffic value returned from API to color.

```javascript
function valueToColor(value) {
  if (value > 0.67) {
    return colors.red;
  }

  if (value > 0.33) {
    return colors.yellow;
  }

  return colors.green;
}
```
Then change `throttledGetTraffic` function to the following code which iterates the result from API call, then calls `setMapItems` to add colored map tile

```javascript
  throttledGetTraffic = throttle(async () => {
    const { floor, normalizedWidth, normalizedHeight, movingLeftX, movingTopY } = this.props;
    const trafficTiles = await getTraffic(
      movingLeftX,
      movingTopY,
      movingLeftX + normalizedWidth,
      movingTopY + normalizedHeight,
      floor,
    );

    const { setMapItems } = this.props;

    setMapItems(
      (trafficTiles || []).map(tile => {
        const { width, height, x, y, value, floor } = tile;

        return {
          id: `tile_${floor}_${x}_${y}`,
          x,
          y,
          floor,
          rect: {
            width,
            height,
            color: valueToColor(value),
          },
          scaleDimension: true,
        };
      }),
    );

  }, 1000);
```
Finally, update `componentDidUpdate` and add `componentDidMount` with the following code:

```javascript
  componentDidMount() {
    this.throttledGetTraffic();
  }

  componentDidUpdate() {
    this.throttledGetTraffic();
  }
```

You can consider `componentDidMount` is the function first called when the user toggle on the component, then when they update the map position, `componentDidUpdate` will be called. Technically there is no need to throttle for `componentDidMount` because it only happens once. You can refactor out the logic from `throttledGetTraffic` function as your own exercise.

## Cleaning up

Try to toggle off the plugin and you will still see those colored map tiles still rendered. It is because we haven't done any clean up work yet. As mentioned before, we add our clean up logic in `componentWillUnmount` class member function.

First we need to avoid the throttled function being invoked after it is toggle off. We cancel the invocation using `cancel()`.

```javascript
  componentWillUnmount() {
    this.throttledGetTraffic.cancel();
  }
```

Then we need to remove the colored map tiles. We will define an array and add tile ids into this array when we add call `setMapItem`. Then in `componentWillUnmount` function we can iterate this array and call `removeMapItems` one by one. You can also consider doing other optimization work like removing tiles when they are out of view port when user is moving the map.

Outside Traffic class:

```javascript
const tileIds = new Set();
```

In setMapItems:

```javascript
    setMapItems(
      (trafficTiles || []).map(tile => {
        const { width, height, x, y, value, floor } = tile;

        tileIds.add(`tile_${floor}_${x}_${y}`); // <- add the tile id to the set
        return {
          id: `tile_${floor}_${x}_${y}`,
          x,
          y,
          floor,
          rect: {
            width,
            height,
            color: valueToColor(value),
          },
          scaleDimension: true,
        };
      }),
    );
```

In componentWillUnmount:

```javascript
  componentWillUnmount() {
    this.throttledGetTraffic.cancel();
    this.props.removeMapItems([...tileIds]);
  }
```

Now we have the full working plugin implemented! You can find the completed source code [here](https://gitlab.com/thenrikie/pathadvisor-frontend/-/tree/develop/docs/pluginTutorial/src/Traffic).

<img src="../imgs/completed-heatmap.png" alt="Heat map screenshot" />