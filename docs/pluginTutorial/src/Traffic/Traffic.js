import 'whatwg-fetch';

import { Component } from 'react';
import throttle from 'lodash.throttle';

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

async function getTraffic(x, y, toX, toY, floor) {
  const url = 'http://localhost:8888/traffic';
  const qs = `?x=${x}&y=${y}&toX=${toX}&toY=${toY}&floor=${encodeURIComponent(floor)}`;

  const response = await fetch(url + qs);
  return response.json();
}

const tileIds = new Set();
class Traffic extends Component {
  throttledGetTraffic = throttle(async () => {
    const {
      floor,
      normalizedWidth,
      normalizedHeight,
      movingLeftX,
      movingTopY,
      setMapItems,
    } = this.props;

    const trafficTiles = await getTraffic(
      movingLeftX,
      movingTopY,
      movingLeftX + normalizedWidth,
      movingTopY + normalizedHeight,
      floor,
    );

    setMapItems(
      (trafficTiles || []).map(tile => {
        const { width, height, x, y, value, floor } = tile;

        tileIds.add(`tile_${floor}_${x}_${y}`);
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

  componentDidMount() {
    this.throttledGetTraffic();
  }

  componentDidUpdate() {
    this.throttledGetTraffic();
  }

  componentWillUnmount() {
    this.throttledGetTraffic.cancel();
    this.props.removeMapItems([...tileIds]);
  }

  render() {
    return null;
  }
}

const MapCanvasPlugin = {
  Component: Traffic,
  connect: [
    'floor',
    'setMapItems',
    'removeMapItems',
    'normalizedWidth',
    'normalizedHeight',
    'movingLeftX',
    'movingTopY',
  ],
};

const name = 'Traffic Heat Map';

export { name, MapCanvasPlugin };
