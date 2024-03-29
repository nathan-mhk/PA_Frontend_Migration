import get from 'lodash.get';
import throttle from 'lodash.throttle';
import without from 'lodash.without';
import omit from 'lodash.omit';
import isNil from 'lodash.isnil';

import calculateTextDimension from './calculateTextDimension';
import stableSort from './stableSort';
import addTouchEventHandler from './addTouchEventHandler';
import watchPinchEvent from './watchPinchEvent';
import * as hitTest from './hitTest';

const DEFAULT_LISTENER_ID = 'default';
const DEVICE_PIXEL_RATIO = window.devicePixelRatio || 1;
const DEFAULT_LINE_HIT_TEST_ERROR_MARGIN = 6;

/**
 * @typedef TextElement
 * @property {string} style
 * @property {number} [strokeWidth]
 * @property {string} [strokeStyle]
 * @property {string} color
 * @property {string} text
 * @property {number} maxLineWidth
 * @property {number} lineHeight
 * @property {array} lines
 */
/**
 * @typedef Circle
 * @property {number} radius
 * @property {string} color
 * @property {string} borderColor
 */
/**
 * @typedef Line
 * @property {array} coordinates
 * @property {string} [strokeStyle]
 * @property {string} [cap]
 * @property {number} [width]
 * @property {number} [hitErrorMargin]
 */
/**
 * @typedef Shape
 * @property {array} coordinates
 * @property {string} [fillStyle]
 * @property {string} [strokeStyle]
 * @property {string} [cap]
 * @property {number} [width]
 */
/**
 * @typedef Rect
 * @property {number} width
 * @property {number} height
 * @property {string} color
 * @property {string} borderColor
 */
/**
 * @typedef CanvasItem
 * @property {string} id
 * @property {number} x
 * @property {number} y
 * @property {number} offsetX
 * @property {number} offsetY
 * @property {number} width
 * @property {number} height
 * @property {number} zIndex
 * @property {number} opacity
 * @property {number} hitX
 * @property {number} hitY
 * @property {number} hitWidth
 * @property {number} hitHeight
 * @property {number} [customHitX]
 * @property {number} [customHitY]
 * @property {number} [customHitWidth]
 * @property {number} [customHitHeight]
 * @property {string} floor
 * @property {boolean} [scalePosition]
 * @property {boolean} [scaleDimension]
 * @property {boolean} [center]
 * @property {boolean} [hidden]
 * @property {HTMLImageElement} [image]
 * @property {TextElement} [textElement]
 * @property {Line} [line]
 * @property {Shape} [shape]
 * @property {mapItemListener} [onClick]
 * @property {mapItemListener} [onMouseOver]
 * @property {mapItemListener} [onMouseOut]
 * @property {mapItemListener} [onMouseMove]
 * @property {mapItemListener} [onDrag]
 * @property {mapItemListener} [onDragEnd]
 * @property {Circle} [circle]
 * @property {Rect} [rect]
 * @property {{}} [others] - additional data for plugins to attach
 */

/**
 * reverse forEach array
 * @param {array} array
 * @param {function} callback
 */
function revForEach(array, callback) {
  for (let i = array.length - 1; i >= 0; i -= 1) {
    const { breakIteration } = callback(array[i], i, array);
    if (breakIteration) {
      break;
    }
  }
}

/**
 * Create a promise and resolve when image is loaded
 * @param {HTMLImageElement} img
 * @return {Promise<HTMLImageElement>} Loaded image element
 */
async function createImageLoadPromise(img) {
  return new Promise((resolve, reject) => {
    img.addEventListener('load', () => {
      resolve(img);
    });

    img.addEventListener('error', () => {
      reject(img);
    });
  });
}

function imageNotLoaded(image) {
  return (
    image instanceof HTMLImageElement &&
    !(image.complete && image.naturalWidth && image.naturalHeight)
  );
}

function setCanvasItemHitArea(canvasItem, x, y, width, height) {
  const hitArea = { x, y, width, height };
  [
    { custom: 'customHitX', target: 'hitX', replace: 'x' },
    { custom: 'customHitY', target: 'hitY', replace: 'y' },
    { custom: 'customHitWidth', target: 'hitWidth', replace: 'width' },
    { custom: 'customHitHeight', target: 'hitHeight', replace: 'height' },
  ].forEach(({ custom, target, replace }) => {
    if (canvasItem[custom] === null) {
      /* eslint no-param-reassign: [0] */
      canvasItem[target] = hitArea[replace];
      return;
    }
    canvasItem[target] = canvasItem[custom];
  });
}

class CanvasHandler {
  layers = {
    mapTiles: { id: 'mapTiles', hidden: false },
    mapItems: { id: 'mapItems', hidden: false },
  };

  // left to right rendering
  layerIds = ['mapTiles', 'mapItems'];

  /** @type {Object.<string, CanvasItem>} - map tiles dict */
  mapTiles = {};

  mapTileIds = [];

  /** @type {Object.<string, CanvasItem>} - map items dict */
  mapItems = {};

  mapItemIds = [];

  preventCanvasMouseMoveEvent = false;

  /** @type {Object.<string, Boolean>} - map items currently in mouse over event */
  mapItemsMouseOvering = {};

  /** @type {Object.<string, Boolean>} - map items currently in mouse down event */
  mapItemsMouseDown = {};

  /** @type {Object.<string, Boolean>} - map items currently in mouse drag event */
  mapItemsDrag = {};

  /** @type {number} - map coordinate x at then center of the canvas element */
  x = 0;

  /** @type {number} - map coordinate y at then center of the canvas element */
  y = 0;

  /** @type {string} - current floor displaying */
  floor = null;

  /** @type {number} - current level  */
  level = 0;

  levelToScale = [];

  /** @type {function[]} - canvas mouse move listeners */
  mouseMoveListeners = [];

  /** @type {function[]} - canvas mouse up listeners */
  mouseUpListeners = [];

  /** @type {function[]} - canvas wheel listeners */
  wheelListeners = [];

  /** @type {function[]} - canvas wheel listeners */
  contextMenuListeners = [];

  /** @type {function[]} - canvas position changed listeners */
  positionChangeListeners = [];

  /** @type {function[]} - pinch event end listeners */
  pinchEndListeners = [];

  /** @type {function[]} - listeners to be triggered when an click event didn't hit anything */
  clickAwayListeners = [];

  /** @typedef {Object.<string, Object.<string, mapItemListener>>} listenerGroup */
  /** @type {Object.<string, listenerGroup>} - map items listeners grouped by id */
  mapItemListeners = {
    click: {},
    mouseover: {},
    mouseout: {},
    mousemove: {},
    drag: {},
    dragend: {},
  };

  /** @type {Object.<string, Object.<string, string[]>>} */
  mapItemListenerIds = {
    click: {},
    mouseover: {},
    mouseout: {},
    mousemove: {},
    drag: {},
    dragend: {},
  };

  width = 0;

  height = 0;

  nearestLevel(capScale) {
    if (capScale >= this.levelToScale[0]) {
      return 0;
    }

    let nearestLevel = 0;
    let lastDiff = this.levelToScale[nearestLevel] - capScale;

    this.levelToScale.some((scale, level) => {
      const diff = scale - capScale;
      // eslint-disable-next-line
      if (diff > 0 !== lastDiff > 0) {
        nearestLevel = Math.abs(diff) < Math.abs(lastDiff) ? level : nearestLevel;
        return true;
      }
      lastDiff = diff;
      nearestLevel = level;
      return false;
    });

    return nearestLevel;
  }

  getCanvasItems(key) {
    switch (key) {
      case 'mapTiles':
        return this.mapTileIds.map(id => this.mapTiles[id]);
      case 'mapItems':
        return this.mapItemIds.map(id => this.mapItems[id]);
      default:
        return [];
    }
  }

  constructor() {
    this.canvas = document.createElement('canvas');
    addTouchEventHandler(this.getCanvas());
    this.setUpCanvasListeners();
    ['mousedown', 'mouseup', 'mousemove'].forEach(event => this.setUpListener(event));
  }

  updateDimension(width, height) {
    this.canvas.width = width * DEVICE_PIXEL_RATIO;
    this.canvas.height = height * DEVICE_PIXEL_RATIO;
    this.width = width;
    this.height = height;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    const ctx = this.canvas.getContext('2d');
    ctx.setTransform(DEVICE_PIXEL_RATIO, 0, 0, DEVICE_PIXEL_RATIO, 0, 0);

    if (DEVICE_PIXEL_RATIO % 1 === 0) {
      ctx.imageSmoothingEnabled = false;
      ctx.webkitImageSmoothingEnabled = false;
      ctx.mozImageSmoothingEnabled = false;
      ctx.msImageSmoothingEnabled = false;
      ctx.oImageSmoothingEnabled = false;
    }

    this.render();

    this.positionChangeListeners.forEach(listener => {
      listener(this.getListenerParamObject());
    });
  }

  updateLevelToScale(levelToScale) {
    this.levelToScale = levelToScale;
  }

  updatePosition(x, y, floor = this.floor, level = this.level) {
    if (
      isNil(x) ||
      Number.isNaN(x) ||
      isNil(y) ||
      Number.isNaN(y) ||
      isNil(floor) ||
      isNil(level) ||
      Number.isNaN(level)
    ) {
      throw new TypeError(
        `updatePosition got invalid parameters x=${x}, y=${y}, floor=${floor}, level=${level}`,
      );
    }
    if (this.x === x && this.y === y && this.floor === floor && this.level === level) {
      console.log('no op');
      return;
    }

    this.x = x;
    this.y = y;
    this.floor = floor;
    this.level = level;

    this.render();

    this.positionChangeListeners.forEach(listener => {
      listener(this.getListenerParamObject());
    });
  }

  /**
   * @typedef CanvasEvent
   * @property {{}} [originalEvent]
   * @property {number} x
   * @property {number} y
   * @property {number} leftX
   * @property {number} topY
   * @property {number} rightX
   * @property {number} bottomY
   * @property {number} level
   * @property {number} width
   * @property {number} height
   * @property {number} floor
   * @property {number} scaledX
   * @property {number} scaledY
   * @property {number} normalizedWidth
   * @property {number} normalizedHeight
   * @property {number} screenLeftX
   * @property {number} screenTopY
   * @property {number} screenRightX
   * @property {number} screenBottomY
   * @property {number} [wheelDelta]
   * @property {number} nextLevel
   * @property {number} previousLevel
   * @property {number} [newX]
   * @property {number} [newY]
   * @property {number} [newLeftX]
   * @property {number} [newTopY]
   * @property {number} [clientX]
   * @property {number} [clientY]
   * @property {number} [clientMapX]
   * @property {number} [clientMapY]
   */

  /**
   * @callback canvasListener
   * @param {CanvasEvent} event
   */

  /**
   * @typedef Coordinate
   * @property {number} x
   * @property {number} y
   */

  /**
   * @typedef CanvasItemMouseEvent
   * @property {Coordinate} [mouse]
   *
   * @typedef {CanvasItem & CanvasItemMouseEvent & {stopPropagation: Function}} CanvasItemEvent
   */

  /**
   * @callback mapItemListener
   * @param {CanvasItemEvent} event
   */

  /**
   * add user defined mousemove listeners
   * @param {canvasListener} listener
   */
  addMouseMoveListener(listener) {
    this.mouseMoveListeners.push(listener);
  }

  /**
   * remove a user defined mousemove listeners
   * @param {function} listener
   * @return {boolean} True is removed otherwise false
   */
  removeMouseMoveListener(listener) {
    const listenerIndex = this.mouseMoveListeners.indexOf(listener);
    if (listenerIndex !== -1) {
      this.mouseMoveListeners.splice(listenerIndex, 1);
    }

    return listenerIndex !== -1;
  }

  /**
   * add user defined mouseup listeners
   * @param {canvasListener} listener
   */
  addMouseUpListener(listener) {
    this.mouseUpListeners.push(listener);
  }

  /**
   * remove a user defined mouseup listeners
   * @param {function} listener
   * @return {boolean} True is removed otherwise false
   */
  removeMouseUpListener(listener) {
    const listenerIndex = this.mouseUpListeners.indexOf(listener);
    if (listenerIndex !== -1) {
      this.mouseUpListeners.splice(listenerIndex, 1);
    }

    return listenerIndex !== -1;
  }

  /**
   * add user defined wheel listeners
   * @param {canvasListener} listener
   */
  addWheelListener(listener) {
    this.wheelListeners.push(listener);
  }

  /**
   * add user defined context menu listeners
   * @param {canvasListener} listener
   */
  addContextMenuListener(listener) {
    this.contextMenuListeners.push(listener);
  }

  /**
   * remove a user defined wheel listeners
   * @param {function} listener
   * @return {boolean} True is removed otherwise false
   */
  removeWheelListener(listener) {
    const listenerIndex = this.wheelListeners.indexOf(listener);
    if (listenerIndex !== -1) {
      this.wheelListeners.splice(listenerIndex, 1);
    }

    return listenerIndex !== -1;
  }

  /**
   * add user defined position change listeners
   * @param {canvasListener} listener
   */
  addPositionChangeListener(listener) {
    this.positionChangeListeners.push(listener);
  }

  /**
   * add user defined pinch end listeners
   */
  addPinchEndListener(listener) {
    this.pinchEndListeners.push(listener);
  }

  /**
   * remove a user defined position change listener
   * @param {function} listener
   * @return {boolean} True is removed otherwise false
   */
  removePositionChangeListener(listener) {
    const listenerIndex = this.positionChangeListeners.indexOf(listener);
    if (listenerIndex !== -1) {
      this.positionChangeListeners.splice(listenerIndex, 1);
    }

    return listenerIndex !== -1;
  }

  /**
   * add clickAway listeners
   * @param {canvasListener} listener
   */
  addClickAwayListener(listener) {
    this.clickAwayListeners.push(listener);
  }

  /**
   * remove a user defined clickAway listeners
   * @param {function} listener
   * @return {boolean} True is removed otherwise false
   */
  removeClickAwayListener(listener) {
    const listenerIndex = this.clickAwayListeners.indexOf(listener);
    if (listenerIndex !== -1) {
      this.clickAwayListeners.splice(listenerIndex, 1);
    }

    return listenerIndex !== -1;
  }

  /**
   * add map item listener
   * @param {string} event
   * @param {string} id listener id
   * @param {string} mapItemId
   * @param {mapItemListener} listener
   * @param {boolean} [isPrepend]
   */
  addMapItemListener(event, id, mapItemId, listener, isPrepend = false) {
    if (!Object.keys(this.mapItemListeners).includes(event)) {
      throw new Error(`Event ${event} not supported`);
    }

    const listeners = this.mapItemListeners[event];
    const listenerIds = this.mapItemListenerIds[event];

    if (!listeners[mapItemId]) {
      listeners[mapItemId] = {};
      listenerIds[mapItemId] = [];
    }

    const isNew = !listeners[mapItemId][id];
    listeners[mapItemId][id] = listener;

    if (!isNew) {
      return;
    }

    if (isPrepend) {
      listenerIds[mapItemId].unshift(id);
      return;
    }

    listenerIds[mapItemId].push(id);
  }

  /**
   * remove map item listener
   * @param {string} event
   * @param {string} id
   * @param {string} mapItemId
   * @return {boolean} True is removed otherwise false
   */
  removeMapItemListener(event, id, mapItemId) {
    const mapItemListenerIds = this.mapItemListenerIds[event][mapItemId] || [];
    const listenerIndex = mapItemListenerIds.indexOf(id);
    if (listenerIndex !== -1) {
      mapItemListenerIds.splice(listenerIndex, 1);
      delete this.mapItemListeners[event][mapItemId][id];
      return true;
    }
    return false;
  }

  getListenerParamObject(props = {}) {
    return {
      nextLevel: this.getNextLevel(),
      previousLevel: this.getPreviousLevel(),
      level: this.level,
      width: this.getWidth(),
      height: this.getHeight(),
      normalizedWidth: this.getNormalizedWidth(),
      normalizedHeight: this.getNormalizedHeight(),
      floor: this.floor,
      x: this.x,
      y: this.y,
      scaledX: this.getScaledX(),
      scaledY: this.getScaledY(),
      leftX: this.getLeftX(),
      topY: this.getTopY(),
      rightX: this.getRightX(),
      bottomY: this.getBottomY(),
      screenLeftX: this.getScreenLeftX(),
      screenRightX: this.getScreenRightX(),
      screenTopY: this.getScreenTopY(),
      screenBottomY: this.getScreenBottomY(),
      ...props,
    };
  }

  setUpCanvasListeners() {
    document.addEventListener('mousedown', e => {
      const { clientX: downX, clientY: downY, target, relatedTarget, button } = e;

      if (button !== 0 || (target !== this.getCanvas() && relatedTarget !== this.getCanvas())) {
        return;
      }
      const { x: prevX, y: prevY } = this;

      const mouseMoveListener = mouseMoveEvent => {
        const { clientX: currentX, clientY: currentY } = mouseMoveEvent;
        let newX = prevX + this.normalizeCoordinate(downX - currentX);
        let newY = prevY + this.normalizeCoordinate(downY - currentY);

        if (this.preventCanvasMouseMoveEvent) {
          return;
        }

        this.mouseMoveListeners.forEach(listener => {
          const [clientX, clientY] = this.getCanvasXYFromMouseXY(
            mouseMoveEvent.clientX,
            mouseMoveEvent.clientY,
          );
          [newX, newY] = listener(
            this.getListenerParamObject({
              originalEvent: mouseMoveEvent,
              clientX,
              clientY,
              newX,
              newY,
              newLeftX: newX - this.getNormalizedWidth() / 2,
              newTopY: newY - this.getNormalizedHeight() / 2,
            }) || [newX, newY],
          );
        });

        this.updatePosition(newX, newY);
      };

      const mouseUpListener = mouseUpEvent => {
        document.removeEventListener('mousemove', mouseMoveListener);
        document.removeEventListener('mouseup', mouseUpListener);
        this.mouseUpListeners.forEach(listener => {
          const [clientX, clientY] = this.getCanvasXYFromMouseXY(
            mouseUpEvent.clientX,
            mouseUpEvent.clientY,
          );

          const clientMapX = this.normalizeCoordinate(clientX) + this.getLeftX();
          const clientMapY = this.normalizeCoordinate(clientY) + this.getTopY();
          listener(
            this.getListenerParamObject({
              originalEvent: mouseUpEvent,
              clientX,
              clientY,
              clientMapX,
              clientMapY,
            }),
          );
        });
      };

      document.addEventListener('mousemove', mouseMoveListener);
      document.addEventListener('mouseup', mouseUpListener);
    });

    this.canvas.addEventListener('wheel', e => {
      this.wheelListeners.forEach(listener => {
        const wheelDelta = Math.sign(e.deltaY);
        const [clientX, clientY] = this.getCanvasXYFromMouseXY(e.clientX, e.clientY);
        const clientMapX = this.normalizeCoordinate(clientX) + this.getLeftX();
        const clientMapY = this.normalizeCoordinate(clientY) + this.getTopY();
        listener(
          this.getListenerParamObject({
            originalEvent: e,
            wheelDelta,
            clientX,
            clientY,
            clientMapX,
            clientMapY,
          }),
        );
      });
    });

    this.canvas.addEventListener('contextmenu', e => {
      this.contextMenuListeners.forEach(listener => {
        const [clientX, clientY] = this.getCanvasXYFromMouseXY(e.clientX, e.clientY);
        const clientMapX = this.normalizeCoordinate(clientX) + this.getLeftX();
        const clientMapY = this.normalizeCoordinate(clientY) + this.getTopY();
        listener(
          this.getListenerParamObject({
            originalEvent: e,
            clientX,
            clientY,
            clientMapX,
            clientMapY,
          }),
        );
      });
    });

    watchPinchEvent(this.getCanvas(), {
      moving: (e, pinScale) => {
        const capScale = pinScale * this.levelToScale[this.level];

        const maxScale = this.levelToScale[0];
        const minScale = this.levelToScale[this.levelToScale.length - 1];

        if (capScale >= minScale && capScale <= maxScale) {
          this.getCanvas().style.transform = `scale(${pinScale})`;
        }
      },
      end: (e, pinScale) => {
        const capScale = pinScale * this.levelToScale[this.level];
        this.pinchEndListeners.forEach(listener => {
          listener({
            level: this.nearestLevel(capScale),
          });
        });

        this.getCanvas().style.transform = `scale(1)`;
      },
    });
  }

  getNextLevel() {
    const previousLevel = this.level - 1;
    const minLevel = 0;
    return previousLevel > minLevel ? previousLevel : minLevel;
  }

  getPreviousLevel() {
    const nextLevel = this.level + 1;
    const maxLevel = this.levelToScale.length - 1;
    return nextLevel > maxLevel ? maxLevel : nextLevel;
  }

  /**
   * Get mouse x, y coordinates relative to the canvas area
   * - i.e. clicking top-left point of canvas returns (0, 0)
   * - clicking bottom-right point of canvas returns (width of canvas, height of canvas)
   */
  getCanvasXYFromMouseXY(mouseX, mouseY) {
    const canvasCoordinate = this.canvas.getBoundingClientRect();
    return [mouseX - canvasCoordinate.left, mouseY - canvasCoordinate.top];
  }

  setUpListener(event) {
    let lastClientCoordinates = [];

    if (event === 'mouseup') {
      this.getCanvas().addEventListener('mousedown', e => {
        if (e.button !== 0) {
          return;
        }

        const { clientX, clientY } = e;
        lastClientCoordinates = [clientX, clientY];
      });
    }

    this.getCanvas().addEventListener(
      event,
      throttle(e => {
        const { clientX, clientY, button } = e;

        if (button !== 0) {
          return;
        }

        let [x, y] = this.getCanvasXYFromMouseXY(clientX, clientY);
        x += this.getScreenLeftX();
        y += this.getScreenTopY();

        const [lastClientX, lastClientY] = lastClientCoordinates;

        const visitedItemIds = new Set();
        let anyItemClicked = false;

        // freeze floor value as it may be changed while triggering listeners
        const floor = this.floor;
        const cursorIsSamePosition = clientX === lastClientX && clientY === lastClientY;

        revForEach(this.mapItemIds, id => {
          const mapItem = this.mapItems[id];

          if (!mapItem) {
            return {};
          }

          const { renderedX, renderedY, scaledWidth, scaledHeight } = this.getMapItemRenderedInfo(
            mapItem,
          );
          if (
            mapItem.floor !== floor ||
            !this.inViewport(renderedX, renderedY, scaledWidth, scaledHeight)
          ) {
            return {};
          }

          visitedItemIds.add(id);

          const mapItemEvents = [];
          const {
            hitX,
            hitY,
            hitWidth,
            hitHeight,
            scaleDimension,
            scalePosition,
            offsetX,
            offsetY,
            shape,
            line,
            onDrag,
          } = mapItem;

          let itemHit = false;
          let lineIndex = null;

          switch (true) {
            case Boolean(shape):
              itemHit = hitTest.polygon(
                x,
                y,
                shape.coordinates
                  .map(([a, b]) => [a + hitX, b + hitY])
                  .map(([a, b]) =>
                    scalePosition ? [this.scaleCoordinate(a), this.scaleCoordinate(b)] : [a, b],
                  ),
              );
              break;
            case Boolean(line):
              lineIndex = hitTest.lineSection(
                x,
                y,
                line.hitErrorMargin || DEFAULT_LINE_HIT_TEST_ERROR_MARGIN,
                line.coordinates.map(([a, b]) =>
                  scalePosition ? [this.scaleCoordinate(a), this.scaleCoordinate(b)] : [a, b],
                ),
              );
              itemHit = lineIndex !== -1;
              break;
            default:
              itemHit = hitTest.rect(
                x,
                y,
                (scalePosition ? this.scaleCoordinate(hitX) : hitX) + offsetX,
                (scalePosition ? this.scaleCoordinate(hitY) : hitY) + offsetY,
                scaleDimension ? this.scaleCoordinate(hitWidth) : hitWidth,
                scaleDimension ? this.scaleCoordinate(hitHeight) : hitHeight,
              );
          }

          switch (event) {
            case 'mousedown': {
              if (itemHit) {
                this.mapItemsMouseDown[id] = true;
              }
              break;
            }

            case 'mouseup': {
              this.preventCanvasMouseMoveEvent = false;
              delete this.mapItemsMouseDown[id];

              if (this.mapItemsDrag[id]) {
                mapItemEvents.push('dragend');
                delete this.mapItemsDrag[id];
              }

              if (!itemHit) {
                break;
              }

              mapItemEvents.push('mouseup');

              if (itemHit && cursorIsSamePosition) {
                mapItemEvents.push('click');
                anyItemClicked = true;
              }

              break;
            }

            case 'mousemove':
              if (itemHit) {
                mapItemEvents.push('mousemove');
              }

              if (itemHit && !this.mapItemsMouseOvering[id]) {
                mapItemEvents.push('mouseover');
                this.mapItemsMouseOvering[id] = true;
              }

              if (!itemHit && this.mapItemsMouseOvering[id]) {
                mapItemEvents.push('mouseout');
                delete this.mapItemsMouseOvering[id];
              }

              if (this.mapItemsMouseDown[id] && onDrag) {
                this.mapItemsDrag[id] = true;
                this.preventCanvasMouseMoveEvent = true;
                mapItemEvents.push('drag');
              }

              break;
            default:
          }

          let breakIteration = false;

          if (mapItemEvents.length) {
            mapItemEvents.forEach(mapItemEvent => {
              if (breakIteration) {
                return;
              }

              (get(this.mapItemListenerIds[mapItemEvent], id) || []).some(
                listenerId =>
                  this.mapItemListeners[mapItemEvent][id][listenerId]({
                    ...this.mapItems[id],
                    mouse: {
                      x,
                      y,
                      mapX: this.normalizeCoordinate(x),
                      mapY: this.normalizeCoordinate(y),
                    },
                    ...(lineIndex !== null ? { lineIndex } : {}),
                    stopPropagation: () => {
                      breakIteration = true;
                    },
                  }) === false,
              );
            });
          }

          return { breakIteration };
        });

        if (!anyItemClicked && cursorIsSamePosition) {
          this.clickAwayListeners.forEach(listener => {
            listener();
          });
        }

        // For map items disappeared in this render, trigger mouseout if they were in mouseover state
        Object.keys(this.mapItemsMouseOvering).forEach(mapItemId => {
          if (!visitedItemIds.has(mapItemId)) {
            (get(this.mapItemListenerIds.mouseout, mapItemId) || []).some(
              listenerId =>
                this.mapItemListeners.mouseout[mapItemId][listenerId]({
                  ...this.mapItems[mapItemId],
                  mouse: {
                    x,
                    y,
                    mapX: this.normalizeCoordinate(x),
                    mapY: this.normalizeCoordinate(y),
                  },
                  // can't stop propagation for a non-rendered item
                  stopPropagation: () => {},
                }) === false,
            );
            delete this.mapItemsMouseOvering[mapItemId];
          }
        });
      }, 30),
    );
  }

  scaleCoordinate(v) {
    return Math.round(v * this.levelToScale[this.level]);
  }

  // get coordinate value in zoom level=1 coordinate space
  normalizeCoordinate(v) {
    return Math.round(v / this.levelToScale[this.level]);
  }

  getWidth() {
    return this.width;
  }

  getHeight() {
    return this.height;
  }

  getNormalizedWidth() {
    return this.normalizeCoordinate(this.width);
  }

  getNormalizedHeight() {
    return this.normalizeCoordinate(this.height);
  }

  getScaledX() {
    return this.scaleCoordinate(this.x);
  }

  getScaledY() {
    return this.scaleCoordinate(this.y);
  }

  getLeftX() {
    return this.x - Math.round(this.getNormalizedWidth() / 2);
  }

  getTopY() {
    return this.y - Math.round(this.getNormalizedHeight() / 2);
  }

  getRightX() {
    return this.x + Math.round(this.getNormalizedWidth() / 2);
  }

  getBottomY() {
    return this.y + Math.round(this.getNormalizedHeight() / 2);
  }

  getScreenLeftX() {
    return this.getScaledX() - Math.round(this.getWidth() / 2);
  }

  getScreenTopY() {
    return this.getScaledY() - Math.round(this.getHeight() / 2);
  }

  getScreenRightX() {
    return this.getScaledX() + Math.round(this.getWidth() / 2);
  }

  getScreenBottomY() {
    return this.getScaledY() + Math.round(this.getHeight() / 2);
  }

  /**
   * @param {CanvasItem[]} mapTiles
   */
  async addMapTiles(mapTiles) {
    const asyncMapTiles = [];

    mapTiles.forEach(({ id, floor, x, y, image, width = null, height = null, hidden = false }) => {
      if (!id) {
        throw new Error('id is required for canvas item');
      } else if (this.mapTiles[id]) {
        return;
      }

      const mapTile = {
        id,
        floor,
        x,
        y,
        offsetX: null,
        offsetY: null,
        width,
        height,
        hitX: x,
        hitY: y,
        hitWidth: null,
        hitHeight: null,
        opacity: null,
        zIndex: 0,
        hidden,
        image,
        scaleDimension: false,
        scalePosition: false,
        others: {},
      };

      this.mapTiles[id] = mapTile;
      this.mapTileIds.push(id);

      if (imageNotLoaded(image)) {
        asyncMapTiles.push(
          createImageLoadPromise(image)
            .then(() => {
              mapTile.width = image.width;
              mapTile.height = image.height;
              setCanvasItemHitArea(mapTile, x, y, mapTile.width, mapTile.height);
              this.render();
            })
            .catch(err => {
              console.log(err);
            }),
        );
      } else {
        mapTile.width = image.width;
        mapTile.height = image.height;
        setCanvasItemHitArea(mapTile, x, y, mapTile.width, mapTile.height);
      }

      this.render();
    });

    await Promise.all(asyncMapTiles);
    return mapTiles;
  }

  removeAllMapTiles() {
    this.mapTileIds = [];
    this.mapTiles = {};
  }

  /**
   * @param {CanvasItem[]} mapItems
   */
  async setMapItems(mapItems, { merge = true, partial = true } = {}) {
    if (!Array.isArray(mapItems)) {
      throw new Error(
        'setMapItems only accept an array of map items, if you have only one map item, please wrap it into an array',
      );
    }

    if (!merge) {
      this.mapItemIds = [];
      this.mapItems = {};
      this.mapItemListeners = {
        click: {},
        mouseover: {},
        mouseout: {},
        mousemove: {},
        drag: {},
        dragend: {},
      };
      this.mapItemListenerIds = {
        click: {},
        mouseover: {},
        mouseout: {},
        mousemove: {},
        drag: {},
        dragend: {},
      };
    }

    const asyncMapItems = [];
    // use this set default value from existing map item, and therefore support updating a map item with partial information
    const getDefault = (id, prop, defaultValue) =>
      partial ? get(this.mapItems[id], prop, defaultValue) : defaultValue;

    mapItems.forEach(
      ({
        id,
        floor = getDefault(id, 'floor', null),
        x = getDefault(id, 'x', null),
        y = getDefault(id, 'y', null),
        offsetX = getDefault(id, 'offsetX', null),
        offsetY = getDefault(id, 'offsetY', null),
        width = getDefault(id, 'width', null),
        height = getDefault(id, 'height', null),
        zIndex = getDefault(id, 'zIndex', 0),
        opacity = getDefault(id, 'opacity', null),
        image = getDefault(id, 'image', null),
        textElement = getDefault(id, 'textElement', null),
        circle = getDefault(id, 'circle', null),
        rect = getDefault(id, 'rect', null),
        line = getDefault(id, 'line', null),
        shape = getDefault(id, 'shape', null),
        others = getDefault(id, 'others', {}),
        center = getDefault(id, 'center', false),
        hidden = getDefault(id, 'hidden', false),
        onClick = getDefault(id, 'onClick', null),
        onMouseOver = getDefault(id, 'onMouseOver', null),
        onMouseOut = getDefault(id, 'onMouseOut', null),
        onMouseMove = getDefault(id, 'onMouseMove', null),
        onDrag = getDefault(id, 'onDrag', null),
        onDragEnd = getDefault(id, 'onDragEnd', null),
        customHitX = getDefault(id, 'customHitX', null),
        customHitY = getDefault(id, 'customHitY', null),
        customHitWidth = getDefault(id, 'customHitWidth', null),
        customHitHeight = getDefault(id, 'customHitHeight', null),
        scalePosition = getDefault(id, 'scalePosition', true),
        scaleDimension = getDefault(id, 'scaleDimension', false),
      }) => {
        if (!id) {
          throw new Error('id is required for canvas item');
        } else if (!this.mapItems[id]) {
          this.mapItemIds.push(id);
        }

        if (!floor) {
          throw new Error('floor is required for canvas item');
        }

        const mapItem = {
          id,
          floor,
          x,
          y,
          offsetX,
          offsetY,
          hitX: null,
          hitY: null,
          hitWidth: null,
          hitHeight: null,
          customHitX,
          customHitY,
          customHitWidth,
          customHitHeight,
          scalePosition,
          scaleDimension,
          width,
          height,
          opacity,
          zIndex,
          image,
          textElement,
          line,
          shape,
          circle,
          rect,
          others,
          center,
          hidden,
          onClick,
          onMouseOver,
          onMouseOut,
          onMouseMove,
          onDrag,
          onDragEnd,
        };

        this.mapItems[id] = mapItem;

        if (onClick) {
          this.addMapItemListener('click', DEFAULT_LISTENER_ID, id, onClick);
        }

        if (onMouseOver) {
          this.addMapItemListener('mouseover', DEFAULT_LISTENER_ID, id, onMouseOver);
        }

        if (onMouseOut) {
          this.addMapItemListener('mouseout', DEFAULT_LISTENER_ID, id, onMouseOut);
        }

        if (onMouseMove) {
          this.addMapItemListener('mousemove', DEFAULT_LISTENER_ID, id, onMouseMove);
        }

        if (onDrag) {
          this.addMapItemListener('drag', DEFAULT_LISTENER_ID, id, onDrag);
        }

        if (onDragEnd) {
          this.addMapItemListener('dragend', DEFAULT_LISTENER_ID, id, onDragEnd);
        }

        switch (true) {
          case Boolean(textElement): {
            const { style, text, maxLineWidth } = textElement;
            const dimension = calculateTextDimension(style, text);
            mapItem.width = dimension.width;
            mapItem.height = dimension.height;
            mapItem.textElement.lineHeight = dimension.height;

            if (maxLineWidth && dimension.width > maxLineWidth) {
              const lines = [];

              let currentLine;
              let computedMaxLineWidth = 0;

              textElement.text.split(' ').forEach(word => {
                if (
                  currentLine &&
                  calculateTextDimension(style, currentLine.join(' ')).width +
                    calculateTextDimension(style, `${word} `).width <
                    maxLineWidth
                ) {
                  currentLine.push(word);
                } else {
                  currentLine = [word];
                  lines.push(currentLine);
                }

                computedMaxLineWidth = Math.max(
                  computedMaxLineWidth,
                  calculateTextDimension(style, currentLine.join(' ')).width,
                );
              });

              mapItem.width = computedMaxLineWidth;
              mapItem.height = lines.length * dimension.height;
              mapItem.textElement.lines = lines;
            }
            break;
          }
          case Boolean(line): {
            const { coordinates } = line;
            const coorXs = coordinates.map(([v]) => v);
            const coorYs = coordinates.map(([, v]) => v);
            const minX = Math.min(...coorXs);
            const minY = Math.min(...coorYs);
            const maxX = Math.max(...coorXs);
            const maxY = Math.max(...coorYs);
            mapItem.x = minX;
            mapItem.y = minY;
            mapItem.width = maxX - minX + line.width;
            mapItem.height = maxY - minY + line.width;
            break;
          }
          case Boolean(shape): {
            const { coordinates } = shape;
            const coorXs = coordinates.map(([v]) => v);
            const coorYs = coordinates.map(([, v]) => v);
            const minX = Math.min(...coorXs);
            const minY = Math.min(...coorYs);
            const maxX = Math.max(...coorXs);
            const maxY = Math.max(...coorYs);
            mapItem.width = maxX - minX + (shape.width || 0);
            mapItem.height = maxY - minY + (shape.width || 0);
            break;
          }
          case Boolean(image): {
            // extra async work for unloaded image
            if (imageNotLoaded(image)) {
              // wait for img data to load completely before rendering
              asyncMapItems.push(
                createImageLoadPromise(image)
                  .then(() => {
                    mapItem.width = mapItem.width ? mapItem.width : image.width;
                    mapItem.height = mapItem.height ? mapItem.height : image.height;
                    this.render();
                  })
                  .catch(err => {
                    console.log(err);
                  }),
              );
              break;
            }

            mapItem.width = mapItem.width ? mapItem.width : image.width;
            mapItem.height = mapItem.height ? mapItem.height : image.height;

            break;
          }
          case Boolean(circle): {
            mapItem.width = circle.radius * 2;
            mapItem.height = circle.radius * 2;
            break;
          }
          case Boolean(rect): {
            mapItem.width = rect.width;
            mapItem.height = rect.height;
            break;
          }
          default:
        }
      },
    );

    // sort by zIndex
    stableSort(this.mapItemIds, (a, b) => this.mapItems[a].zIndex - this.mapItems[b].zIndex);
    // render all sync map items first
    this.render();

    // only resolve if every async map items are loaded, to let the caller know the op is done.
    await Promise.all(asyncMapItems);

    return mapItems;
  }

  /**
   * @param {string} mapItemId
   * @returns {boolean} true if map item found and deleted, false otherwise
   */
  removeMapItem(mapItemId) {
    if (!this.mapItems[mapItemId]) {
      return false;
    }

    this.removeMapItems([mapItemId]);

    return true;
  }

  /**
   * @param {array} mapItemIds
   */
  removeMapItems(mapItemIds) {
    if (!Array.isArray(mapItemIds)) {
      throw new Error('removeMapItems only accept an array of map item ids.');
    }

    this.mapItemIds = without(this.mapItemIds, ...mapItemIds);
    this.mapItems = omit(this.mapItems, mapItemIds);
    this.mapItemListeners.click = omit(this.mapItemListeners.click, mapItemIds);
    this.mapItemListeners.mouseover = omit(this.mapItemListeners.mouseover, mapItemIds);
    this.mapItemListeners.mouseout = omit(this.mapItemListeners.mouseout, mapItemIds);
    this.mapItemListeners.mousemove = omit(this.mapItemListeners.mousemove, mapItemIds);
    this.mapItemListeners.drag = omit(this.mapItemListeners.drag, mapItemIds);
    this.mapItemListeners.dragend = omit(this.mapItemListeners.dragend, mapItemIds);
    this.mapItemListenerIds.click = omit(this.mapItemListenerIds.click, mapItemIds);
    this.mapItemListenerIds.mouseover = omit(this.mapItemListenerIds.mouseover, mapItemIds);
    this.mapItemListenerIds.mouseout = omit(this.mapItemListenerIds.mouseout, mapItemIds);
    this.mapItemListenerIds.mousemove = omit(this.mapItemListenerIds.mousemove, mapItemIds);
    this.mapItemListenerIds.drag = omit(this.mapItemListenerIds.drag, mapItemIds);
    this.mapItemListenerIds.dragend = omit(this.mapItemListenerIds.dragend, mapItemIds);

    this.render();
  }

  inViewport(leftX, topY, width, height) {
    const rightX = leftX + width;
    const bottomY = topY + height;

    const screenLeftX = this.getScreenLeftX();
    const screenRightX = this.getScreenRightX();
    const screenTopY = this.getScreenTopY();
    const screenBottomY = this.getScreenBottomY();

    const xInRange =
      [leftX, rightX].some(x => screenLeftX <= x && x <= screenRightX) ||
      (leftX < screenLeftX && screenRightX < rightX);

    const yInRange =
      [topY, bottomY].some(y => screenTopY <= y && y <= screenBottomY) ||
      (topY < screenTopY && screenBottomY < bottomY);

    return xInRange && yInRange;
  }

  getMapItemRenderedInfo(mapItem) {
    const {
      x,
      y,
      offsetX,
      offsetY,
      scalePosition,
      scaleDimension,
      width,
      height,
      center,
    } = mapItem;

    let renderedX = scalePosition ? this.scaleCoordinate(x) : x;
    let renderedY = scalePosition ? this.scaleCoordinate(y) : y;
    const scaledWidth = scaleDimension ? this.scaleCoordinate(width) : width;
    const scaledHeight = scaleDimension ? this.scaleCoordinate(height) : height;

    if (offsetX) {
      renderedX += offsetX;
    }

    if (offsetY) {
      renderedY += offsetY;
    }

    if (center) {
      renderedX -= scaledWidth / 2;
      renderedY -= scaledHeight / 2;
    }

    const centeredX = x - scaledWidth / 2;
    const centeredY = y - scaledHeight / 2;

    return { renderedX, renderedY, scaledWidth, scaledHeight, centeredX, centeredY };
  }

  render = () => {
    if (!this.renderRequest) {
      setTimeout(() => {
        // eslint-disable-next-line no-underscore-dangle
        this._render();
        this.renderRequest = false;
      });
    }

    this.renderRequest = true;
  };

  // eslint-disable-next-line no-underscore-dangle
  _render() {
    const ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const screenLeftX = this.getScreenLeftX();
    const screenTopY = this.getScreenTopY();

    this.layerIds.forEach(key => {
      if (this.layers[key].hidden) {
        return;
      }
      // Render each canvas items in this layer
      this.getCanvasItems(key).forEach(mapItem => {
        const {
          x,
          y,
          floor,
          image,
          textElement,
          line,
          shape,
          hidden,
          circle,
          rect,
          width,
          height,
          scalePosition,
          scaleDimension,
          center,
          opacity,
        } = mapItem;

        if (opacity === null) {
          ctx.globalAlpha = 1;
        } else {
          ctx.globalAlpha = opacity;
        }

        const {
          renderedX,
          renderedY,
          scaledWidth,
          scaledHeight,
          centeredX,
          centeredY,
        } = this.getMapItemRenderedInfo(mapItem);

        setCanvasItemHitArea(
          mapItem,
          center ? centeredX : x,
          center ? centeredY : y,
          width,
          height,
        );

        if (
          hidden ||
          floor !== this.floor ||
          !this.inViewport(renderedX, renderedY, scaledWidth, scaledHeight)
        ) {
          return;
        }

        switch (true) {
          case Boolean(circle): {
            const { radius, color, borderColor } = circle;
            ctx.beginPath();
            ctx.arc(
              renderedX - screenLeftX + scaledWidth / 2,
              renderedY - screenTopY + scaledHeight / 2,
              radius,
              0,
              Math.PI * 2,
            );
            ctx.lineWidth = 1;
            if (color) {
              ctx.fillStyle = color;
              ctx.fill();
            }

            if (borderColor) {
              ctx.strokeStyle = borderColor;
              ctx.stroke();
            }
            break;
          }
          case Boolean(rect): {
            const { color, borderColor } = rect;
            if (color) {
              ctx.fillStyle = color;
              ctx.fillRect(
                renderedX - screenLeftX,
                renderedY - screenTopY,
                scaledWidth,
                scaledHeight,
              );
            }

            if (borderColor) {
              ctx.strokeStyle = borderColor;
              ctx.strokeRect(
                renderedX - screenLeftX,
                renderedY - screenTopY,
                scaledWidth,
                scaledHeight,
              );
            }
            break;
          }
          case Boolean(image):
            try {
              ctx.drawImage(image, renderedX - screenLeftX, renderedY - screenTopY, width, height);
            } catch (e) {
              console.error('Image cannot be drawn', e, image);
            }
            break;
          case Boolean(textElement): {
            const { style, color, text, lines, lineHeight, strokeWidth, strokeStyle } = textElement;
            ctx.fillStyle = color;
            ctx.font = style;
            ctx.textBaseline = 'top';
            if (lines) {
              lines.forEach((textLine, i) => {
                ctx.fillText(
                  textLine.join(' '),
                  renderedX - screenLeftX,
                  renderedY + lineHeight * i - screenTopY,
                );
              });
            } else {
              ctx.fillText(text, renderedX - screenLeftX, renderedY - screenTopY);
            }

            if (strokeWidth && strokeStyle) {
              ctx.strokeStyle = strokeStyle;
              ctx.lineWidth = strokeWidth;
              ctx.strokeText(text, renderedX - screenLeftX, renderedY - screenTopY);
            }

            break;
          }
          case Boolean(line):
            {
              const { strokeStyle, width: lineWidth, cap, coordinates } = line;

              ctx.beginPath();

              coordinates.forEach(([lineX, lineY], i) => {
                const op = i === 0 ? 'moveTo' : 'lineTo';
                const scaledX = scalePosition ? this.scaleCoordinate(lineX) : lineX;
                const scaledY = scalePosition ? this.scaleCoordinate(lineY) : lineY;
                ctx[op](scaledX - screenLeftX, scaledY - screenTopY);
              });

              if (strokeStyle) {
                ctx.lineCap = cap;
                ctx.lineWidth = lineWidth;
                ctx.strokeStyle = strokeStyle;
                ctx.stroke();
              }
            }
            break;
          case Boolean(shape):
            {
              const { strokeStyle, fillStyle, width: lineWidth, cap, coordinates } = shape;

              ctx.beginPath();

              coordinates.forEach(([lineX, lineY], i) => {
                const op = i === 0 ? 'moveTo' : 'lineTo';
                const scaledX = scaleDimension ? this.scaleCoordinate(lineX) : lineX;
                const scaledY = scaleDimension ? this.scaleCoordinate(lineY) : lineY;
                ctx[op](scaledX - screenLeftX + renderedX, scaledY - screenTopY + renderedY);
              });

              if (fillStyle) {
                ctx.fillStyle = fillStyle;
                ctx.fill();
              }

              if (strokeStyle) {
                ctx.lineCap = cap;
                ctx.lineWidth = lineWidth;
                ctx.strokeStyle = strokeStyle;
                ctx.stroke();
              }
            }
            break;
          default:
        }
      });
    });
  }

  /**
   * @return {HTMLCanvasElement}
   */
  getCanvas() {
    return this.canvas;
  }

  /**
   * Helper function to export these to pass via props to react component
   */
  helperProps = {
    addMapTiles: args => this.addMapTiles(args),
    setMapItems: args => this.setMapItems(args),
    removeMapItem: args => this.removeMapItem(args),
    removeMapItems: args => this.removeMapItems(args),
    removeAllMapTiles: () => this.removeAllMapTiles(),
    updateDimension: (...args) => this.updateDimension(...args),
    updateLevelToScale: args => this.updateLevelToScale(args),
    calculateTextDimension,
    // map item listeners
    addMapItemClickListener: (id, mapItemId, listener, isPrepend) =>
      this.addMapItemListener('click', id, mapItemId, listener, isPrepend),
    addMapItemMouseOverListener: (id, mapItemId, listener, isPrepend) =>
      this.addMapItemListener('mouseover', id, mapItemId, listener, isPrepend),
    addMapItemMouseOutListener: (id, mapItemId, listener, isPrepend) =>
      this.addMapItemListener('mouseout', id, mapItemId, listener, isPrepend),
    addMapItemMouseMoveListener: (id, mapItemId, listener, isPrepend) =>
      this.addMapItemListener('mousemove', id, mapItemId, listener, isPrepend),
    addMapItemDragListener: (id, mapItemId, listener, isPrepend) =>
      this.addMapItemListener('drag', id, mapItemId, listener, isPrepend),
    addMapItemDragEndListener: (id, mapItemId, listener, isPrepend) =>
      this.addMapItemListener('dragend', id, mapItemId, listener, isPrepend),
    removeMapItemClickListener: (id, mapItemId) =>
      this.removeMapItemListener('click', id, mapItemId),
    removeMapItemMouseOverListener: (id, mapItemId) =>
      this.removeMapItemListener('mouseover', id, mapItemId),
    removeMapItemMouseOutListener: (id, mapItemId) =>
      this.removeMapItemListener('mouseout', id, mapItemId),
    removeMapItemMouseMoveListener: (id, mapItemId) =>
      this.removeMapItemListener('mousemove', id, mapItemId),
    removeMapItemDragListener: (id, mapItemId) => this.removeMapItemListener('drag', id, mapItemId),
    removeMapItemDragEndListener: (id, mapItemId) =>
      this.removeMapItemListener('dragend', id, mapItemId),
    // canvas root element listener
    addCanvasMouseUpListener: listener => this.addMouseUpListener(listener),
    addCanvasMouseMoveListener: listener => this.addMouseMoveListener(listener),
    addCanvasContextMenuListener: listener => this.addContextMenuListener(listener),
    addWheelListener: listener => this.addWheelListener(listener),
  };

  getProps() {
    return this.helperProps;
  }
}

export default CanvasHandler;
