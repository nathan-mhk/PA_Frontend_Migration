import 'whatwg-fetch';
import lineIntersect from '@turf/line-intersect';
import { lineString, featureCollection } from '@turf/helpers';
import { Component } from 'react';

const colors = {
  green: 'rgba(99, 214, 104, 0.9)',
  yellow: 'rgba(255, 151, 17, 0.9)',
  red: 'rgba(242, 60, 50, 0.9)',
};

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
  edgeIds = new Set();

  componentDidMount() {
    this.drawEdges();
  }

  componentDidUpdate() {
    this.drawEdges();
  }

  componentWillUnmount() {
    this.props.removeMapItems([...this.edgeIds]);
  }

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

  render() {
    return null;
  }
}

const MapCanvasPlugin = {
  Component: TrafficRoute,
  connect: ['getPosition', 'edgeStore', 'setMapItems', 'removeMapItems'],
};

const name = 'Traffic Route';

export { name, MapCanvasPlugin };
