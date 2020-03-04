import React, { Component } from 'react';
import 'whatwg-fetch';

const name = 'Room Air Quality & Traffic';

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

const shapeIds = new Set();

class MapCanvas extends Component {
  componentDidMount() {
    this.injectPeopleAndAirQualityData();
  }

  componentDidUpdate(prevProps) {
    this.injectPeopleAndAirQualityData(prevProps);
  }

  componentWillUnmount() {
    const { clearPluginMapItemsHandler, removeMapItems } = this.props;
    // clean up injected map item data when plugin is being turned off
    clearPluginMapItemsHandler();
    // remove colored shape drawn on map area
    removeMapItems([...shapeIds]);
  }

  async injectPeopleAndAirQualityData(prevProps) {
    const { success, mapItems } = this.props.mapItemStore;
    const { enhanceMapItemsHandler, setMapItems } = this.props;

    // Only inject data if data is ready or incoming data changed
    if ((prevProps && !prevProps.mapItemStore.loading) || !success) {
      return;
    }

    const roomsByName = await getRoomInfo();
    const enhancedMapItems = [];
    const airQualityMapItems = [];

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
      setMapItems(airQualityMapItems);
    }
  }

  // MapCanvas plugin here just exists to inject data to map item and doesn't render any react or intrinsic elements
  render() {
    return null;
  }
}

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

const OverlayContentPlugin = {
  Component: MapItemPanel,
};

const MobileOverlayContentPlugin = {
  Component: withColor('white')(MapItemPanel),
};

const defaultOff = false;

export { name, defaultOff, OverlayContentPlugin, MobileOverlayContentPlugin, MapCanvasPlugin };
