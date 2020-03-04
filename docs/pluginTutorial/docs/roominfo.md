# Number of people and air quality of a room

We will build a plugin for showing the number of people and air quality when clicking on one of the room above and also color the room on top of the floor plan to indicate their air quality.

We will use the mock API `http://localhost:8888/rooms/info` to get the data. The API has hard coded values for

- Barn B
- Barn C
- LTA
- LTB
- and Passion cafe

Before we start,

1. it is advised that you should read [documentation - things to avoid](https://pathadvisor.ust.hk/docs/#/thingsToAvoid/README) first so that we can have these principles in our mind when we are developing the plugin.

2. [PathAdvisor frontend running locally](setup.md)

3. [Make sure you have the mock API server started and working](api.md)

## Number of people plugin

This tutorial assumed you have all the knowledge from [Heat map plugin](heat-map.md).

Currently if you click on room numbers / names on the map in the PathAdvisor system, if a room has property `photo`, `url` or `others` defined, it will show the information on the left hand side panel, or it will pop up an overlay screen on mobile platform. If a room has no information to show, clicking on it will not show anything except this room number or name will be filled in the "From" input field. This logic is coded in another core component based on data in `mapItemStore`. You can find more about `mapItemStore` schema [here](https://pathadvisor.ust.hk/docs/#/typesOfPlugins/README?id=mapitemstore)


## Basic plugin files

To create a plugin, we first need to create the following files in `plugin` folder in your forked repository.

```text
src
└── plugins/
    └── RoomInfo/
        ├──  package.json
        └──  RoomInfo.js
```

content for **package.json**
```json
{
  "name": "@ust-pathadvisor/room-info",
  "version": "0.0.0",
  "private": true,
  "dependencies": {
    "react": "^16.4.1"
  }
}
```

Run the following command to install dependency:

`npx bolt w @ust-pathadvisor/room-info add whatwg-fetch`

content for **RoomInfo.js**
```javascript
import 'whatwg-fetch';

const colors = {
  green: 'rgba(99, 214, 104, 0.4)',
  yellow: 'rgba(255, 151, 17, 0.4)',
  red: 'rgba(242, 60, 50, 0.4)',
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

function valueToText(value) {
  if (value > 0.67) {
    return 'bad';
  }

  if (value > 0.33) {
    return 'moderate';
  }

  return 'good';
}

async function getRoomInfo() {
  const url = 'http://localhost:8888/rooms/info';

  const response = await fetch(url);
  const data = await response.json();

  // return room data map with name as map key.
  return (data || []).reduce(
    (agg, currItem) => ({
      ...agg,
      [currItem.name]: currItem,
    }),
    {},
  );
}

const name = 'Room people count';
export { name };
```

Import the plugin in `src/plugins/index.js` file so that it is actually loaded when the app start.

At the top of `index.js` file, add
```javascript
import * as Traffic from './RoomInfo/RoomInfo';
```

And at the end, add `RoomInfo` to the array
```javascript
export default [
  ...,
  RoomInfo, // <- Add traffic route plugin to the end
];
```

For our plugin, we need to do a few things:

- Task 1. Clicking the rooms listed above should open a panel on the left or an overlay on mobile platform.

Currently without doing anything, this is already the behavior for Barn B, Barn C, LTA and LTB because they all have a photo and/or a url attached to it. However for passion cafe there isn't any information attached to it so on clicking it won't show anything.

- Task 2. The panel shown after clicking the room should include number of people and air quality information alongside with any existing information like photo or url inside the panel.


## Inject extra data to mapItemStore

If you click on a map item on the map and if the map item has `photo`, `url` or `others` properties defined, then `OverlayHeaderPlugin` and `OverlayContentPlugin` or `MobileOverlayHeaderPlugin` and `MobileOverlayContentPlugin` will be be shown on the left hand side panel. `photo`, `url` or `others` will be made available to these plugins as well.

To achieve task 1, we can use `enhanceMapItemsHandler` to inject data to the above rooms. For example, let's assign a fake people count to `others` properties to passion cafe map item so that passion cafe will become clickable and on clicking it should now show an empty left UI panel with only the header showing the name of the map item. You can find more details about `enhanceMapItemsHandler` [here](https://pathadvisor.ust.hk/docs/#/typesOfPlugins/README?id=enhancemapitemshandler)

In RoomInfo.js, add:
```javascript
class MapCanvas extends Component {

  componentDidMount() {
    this.injectPeopleAndAirQualityData();
  }

  componentDidUpdate(prevProps) {
    this.injectPeopleAndAirQualityData(prevProps);
  }

  componentWillUnmount() {
    const { clearPluginMapItemsHandler } = this.props;
    // clean up injected map item data when plugin is being turned off
    clearPluginMapItemsHandler();
  }

  async injectPeopleAndAirQualityData(prevProps) {
    const { success, mapItems } = this.props.mapItemStore;
    const { enhanceMapItemsHandler } = this.props;

    // Only inject data if data is ready or incoming data changed
    if ((prevProps && !prevProps.mapItemStore.loading) || !success) {
      return;
    }

    let roomId;

    // find room id for passion cafe, if we already knew the room id, we can skip this step.
    mapItems.forEach(({ id, name }) => {
      if (name === 'Passion') {
        roomId = id;
      }
    });

    if (roomId) {
      enhanceMapItemsHandler({
        [roomId]: {
          others: { numOfPeople: 99, airQuality: 'good' },
        },
      });
    }
  }

  // MapCanvas plugin here just exists to inject data to map item and doesn't render any react or intrinsic elements
  render() {
    return null;
  }
}

const defaultOff = false;

const MapCanvasPlugin = {
  Component: MapCanvas,
  connect: ['mapItemStore', 'enhanceMapItemsHandler', 'clearPluginMapItemsHandler'],
};

export { name, defaultOff, MapCanvasPlugin };
```

Note that we have also added `defaultOff` and set it to false. This is just to make the plugin turn on by default since this plugin does not draw anything distracting (like the heat map and walking paths in our previous plugins) on map canvas and therefore it causes no distraction to the users visually.

Now you should able to click on passion cafe and an empty left UI panel should show.

<img src="../imgs/passion-empty-panel.png" alt="left UI panel" />


## Add content to left panel

We can define `OverlayContentPlugin` and `MobileOverlayContentPlugin` to add section to the left UI panel to show number of people for the room. You can find more details about `OverlayContentPlugin` and `MobileOverlayContentPlugin` [here](https://pathadvisor.ust.hk/docs/#/typesOfPlugins/README).

The `others` property will be available to `OverlayContentPlugin` and `MobileOverlayContentPlugin`, so we can use it to display number in the panel.

In RoomInfo.js, add:
```javascript
function MapItemPanel({ color, others }) {
  if (!others || !Object.prototype.hasOwnProperty.call(others, 'numOfPeople')) {
    return null;
  }

  return (
    <div
      style={{
        padding: '10px',
        fontSize: '14px',
        marginBottom: '15px',
        color,
      }}
    >
      <div>People count: {others.numOfPeople}</div>
      <div>Air quality: {valueToText(others.airQuality)}</div>
    </div>
  );
}

function withColor(color) {
  return Component => {
    function WithColor(props) {
      return <Component {...props} color={color} />;
    }
    return WithColor;
  };
}

const OverlayContentPlugin = {
  Component: MapItemPanel,
};

// Use same UI for mobile platform expect changing the font color to white.
const MobileOverlayContentPlugin = {
  Component: withColor('white')(MapItemPanel),
};

const defaultOff = false;

export { name, defaultOff, MapCanvasPlugin, OverlayContentPlugin, MobileOverlayContentPlugin };
```

Now if you click on Passion cafe again, you can see the people count and air quality information in the panel.

Now update `injectPeopleAndAirQualityData` function in MapCanvas class so that it gets data from the mock API and injects people count and air quality data to respective rooms.

In RoomInfo.js, update MapCanvas:
```javascript
  async injectPeopleAndAirQualityData(prevProps) {
    const { success, mapItems } = this.props.mapItemStore;
    const { enhanceMapItemsHandler, setMapItems } = this.props;

    // Only inject data if data is ready or incoming data changed
    if ((prevProps && !prevProps.mapItemStore.loading) || !success) {
      return;
    }

    const roomsByName = await getRoomInfo();
    const enhancedMapItems = [];

    mapItems.forEach(item => {
      if (!roomsByName[item.name]) {
        return;
      }

      enhancedMapItems.push({
        id: item.id,
        others: {
          numOfPeople: roomsByName[item.name].numOfPeople,
          airQuality: roomsByName[item.name].airQuality,
        },
      });
    });

    if (enhancedMapItems.length) {
      enhanceMapItemsHandler(enhancedMapItems);
    }
  }
```

Now if you click on any rooms that has people count and air quality data returned from our mock API,
i.e.

- Barn B
- Barn C
- LTA
- LTB
- and Passion cafe

You should able to see people count message and air quality data from the mock API in the left panel alongside with other existing sections.

<img src="../imgs/lta-desktop.png" alt="left UI panel" width="50%" />

_People count of LTA on desktop platform_

<img src="../imgs/lta-mobile.png" alt="left UI panel" width="50%" />

_People count of LTA on mobile platform_


## Color the rooms according to air quality

The last feature of this plugin is to color the rooms according to the air qualities from the mock API. To do this we can add this logic to `injectPeopleAndAirQualityData` where we get the air quality data of the rooms. We can also get map item coordinates data from `mapItemStore` as well. Then we call `setMapItems` to draw colored shapes, the color is defined by calling `valueToColor` with air quality as the input value and the shape is defined by the `geoLoc` coordinates of the room from `mapItemStore`. You can find more about `mapItemStore` schema [here](https://pathadvisor.ust.hk/docs/#/typesOfPlugins/README?id=mapitemstore) and  `setMapItems` usage [here](https://pathadvisor.ust.hk/docs/#/typesOfPlugins/README?id=setmapitems).


Add `shapeIds` at top level of RoomInfo.js for keeping track of shapes added:
```javascript
const shapeIds = new Set();
```

Add setMapItems and removeMapItems to connect array:
```javascript
const MapCanvasPlugin = {
  Component: MapCanvas,
  connect: [
    'mapItemStore',
    'enhanceMapItemsHandler',
    'clearPluginMapItemsHandler',
    'setMapItems',
    'removeMapItems',
  ],
};
```

Updated `injectPeopleAndAirQualityData` function:
```javascript
  async injectPeopleAndAirQualityData(prevProps) {
    const { success, mapItems } = this.props.mapItemStore;
    const { enhanceMapItemsHandler, setMapItems } = this.props;

    // Only inject data if data is ready or incoming data changed
    if ((prevProps && !prevProps.mapItemStore.loading) || !success) {
      return;
    }

    const roomsByName = await getRoomInfo();
    const enhancedMapItems = [];
    const airQualityMapItems = []; // <-- colored shape map items to be drawn

    mapItems.forEach(item => {
      if (!roomsByName[item.name]) {
        return;
      }

      enhancedMapItems.push({
        id: item.id,
        others: {
          numOfPeople: roomsByName[item.name].numOfPeople,
          airQuality: roomsByName[item.name].airQuality,
        },
      });

      if (!item.geoLocs || !item.geoLocs.coordinates) {
        return;
      }

      const [[rect]] = item.geoLocs.coordinates;
      const [firstCoor] = rect;

      // Add colored shapes based on the air quality and the coordinates of the room
      airQualityMapItems.push({
        id: `${item.id}_air-quality-color`,
        floor: item.floor,
        x: firstCoor[0],
        y: firstCoor[1],
        scaleDimension: true,
        shape: {
          coordinates: rect.map(([x, y]) => [x - firstCoor[0], y - firstCoor[1]]),
          fillStyle: valueToColor(roomsByName[item.name].airQuality),
        },
      });

      shapeIds.add(`${item.id}_air-quality-color`);
    });

    if (enhancedMapItems.length) {
      enhanceMapItemsHandler(enhancedMapItems);
    }

    if (airQualityMapItems.length) {
      // Draw the shapes
      setMapItems(airQualityMapItems);
    }
  }
```

And don't forget to clean up the shapes when the plugin is being turn off:
```javascript
  componentWillUnmount() {
    const { clearPluginMapItemsHandler, removeMapItems } = this.props;
    // clean up injected map item data when plugin is being turned off
    clearPluginMapItemsHandler();
    // remove colored shapes drawn on map area
    removeMapItems([...shapeIds]);
  }
```

<img src="../imgs/air-quality-rooms.png" alt="Colored rooms indicating air quality" />

_Colored rooms indicating air quality_

Now we have the full working plugin implemented! You can find the completed source code [here](https://gitlab.com/thenrikie/pathadvisor-frontend/-/tree/develop/docs/pluginTutorial/src/RoomInfo).