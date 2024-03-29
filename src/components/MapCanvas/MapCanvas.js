import PropTypes from 'prop-types';
import classnames from 'classnames';
import React, { Component, createRef } from 'react';
import get from 'lodash.get';
import pick from 'lodash.pick';
import isNil from 'lodash.isnil';
import { connect } from 'react-redux';
import throttle from 'lodash.throttle';

import CanvasHandler from './CanvasHandler';
import { APIEndpoint } from '../../config/config';
import style from './MapCanvas.module.css';
import { propTypes as urlPropTypes } from '../Router/Url';
import getConnectedComponent from '../ConnectedComponent/getConnectedComponent';
import { getMapItemsAction } from '../../reducers/mapItems';
import { getEdgesAction } from '../../reducers/edges';
import { PLATFORM } from '../Main/detectPlatform';
import { TABS } from '../Suggestion/constants';
import { floorsPropType } from '../../reducers/floors';
import { appSettingsPropType } from '../../reducers/appSettings';
import PluginTogglePanel from '../PluginTogglePanel/PluginTogglePanel';
import { pluginSettingsPropType } from '../../reducers/pluginSettings';

class MapCanvas extends Component {
  canvasRootRef = createRef();

  canvasHandler = new CanvasHandler();

  static propTypes = {
    children: PropTypes.arrayOf(PropTypes.object),
    ...urlPropTypes,
    getMapItemsHandler: PropTypes.func.isRequired,
    getEdgesHandler: PropTypes.func.isRequired,
    floorStore: floorsPropType.isRequired,
    appSettingsStore: appSettingsPropType.isRequired,
    pluginSettingsStore: pluginSettingsPropType.isRequired,
    linkTo: PropTypes.func.isRequired,
    platform: PropTypes.oneOf(Object.values(PLATFORM)),
  };

  state = {
    width: null,
    height: null,
    normalizedWidth: null,
    normalizedHeight: null,
    movingX: null,
    movingY: null,
    movingScaledX: null,
    movingScaledY: null,
    movingLeftX: null,
    movingTopY: null,
    movingScreenLeftX: null,
    movingScreenTopY: null,
    nextLevel: null,
    previousLevel: null,
    pluginPanelClosed: true,
  };

  componentDidMount() {
    const { linkTo, getMapItemsHandler, getEdgesHandler } = this.props;

    this.canvasHandler.addMouseUpListener(({ x, y, floor, level }) => {
      // update position param if changed due to mouse event
      const isPositionReady = [x, y, level, floor].every(v => !isNil(v));
      if (isPositionReady) {
        linkTo({ floor, x, y, level });
      }
    });

    this.canvasHandler.addMouseMoveListener(props => this.restrictOutOfBoundary(props));

    this.canvasHandler.addWheelListener(
      throttle(({ wheelDelta, x, y, floor, nextLevel, previousLevel }) => {
        if (wheelDelta < 0) {
          linkTo({ floor, x, y, level: nextLevel });
        } else {
          linkTo({ floor, x, y, level: previousLevel });
        }
      }, 500),
    );

    this.canvasRootRef.current.prepend(this.canvasHandler.getCanvas());
    this.updateCanvasDimension();

    window.addEventListener('resize', throttle(this.updateCanvasDimension, 500));

    // if incoming coordinate is out of boundary, jump back to nearest position
    this.canvasHandler.addPositionChangeListener(params => {
      const {
        leftX,
        topY,
        normalizedWidth,
        normalizedHeight,
        x: _x,
        y: _y,
        floor: _floor,
      } = params;
      const [newX, newY] = this.restrictOutOfBoundary({
        newX: _x,
        newY: _y,
        newLeftX: leftX,
        newTopY: topY,
        normalizedHeight,
        normalizedWidth,
        floor: _floor,
      });

      if (_x !== newX || _y !== newY) {
        this.props.linkTo({ x: newX, y: newY }, 'replace');
      }
    });

    this.canvasHandler.addPositionChangeListener(
      throttle(
        ({ floor: _floor, leftX, topY, normalizedWidth: _width, normalizedHeight: _height }) => {
          const isPositionReady =
            [leftX, topY, _width, _height].every(v => !Number.isNaN(v)) && !isNil(_floor);

          if (isPositionReady) {
            [getMapItemsHandler, getEdgesHandler].forEach(callback => {
              callback(
                _floor,
                [parseInt(leftX, 10), parseInt(topY, 10)],
                parseInt(_width, 10),
                parseInt(_height, 10),
              );
            });
          }
        },
        1000,
        { leading: true },
      ),
    );

    this.canvasHandler.addPositionChangeListener(
      ({
        width,
        height,
        normalizedWidth,
        normalizedHeight,
        x: movingX,
        y: movingY,
        scaledX: movingScaledX,
        scaledY: movingScaledY,
        leftX: movingLeftX,
        topY: movingTopY,
        screenLeftX: movingScreenLeftX,
        screenTopY: movingScreenTopY,
        nextLevel,
        previousLevel,
      }) => {
        this.setState({
          width,
          height,
          normalizedWidth,
          normalizedHeight,
          movingX,
          movingY,
          movingScaledX,
          movingScaledY,
          movingLeftX,
          movingTopY,
          movingScreenLeftX,
          movingScreenTopY,
          nextLevel,
          previousLevel,
        });
      },
    );

    this.canvasHandler.addPinchEndListener(({ level: newLevel }) => {
      linkTo({ level: newLevel });
    });

    // init position param
    this.updatePosition();
  }

  componentDidUpdate(prevProps) {
    // sync react position to canvas if it is changed
    const { x, y, floor, level } = this.props;
    if (
      x !== prevProps.x ||
      y !== prevProps.y ||
      floor !== prevProps.floor ||
      level !== prevProps.level
    ) {
      this.updatePosition();
    }
  }

  getPosition = () => {
    const {
      width,
      height,
      normalizedWidth,
      normalizedHeight,
      x,
      y,
      floor,
      scaledX,
      scaledY,
      leftX,
      topY,
      screenLeftX,
      screenTopY,
      nextLevel,
      previousLevel,
    } = this.canvasHandler.getListenerParamObject();

    return {
      width,
      height,
      normalizedWidth,
      normalizedHeight,
      floor,
      movingX: x,
      movingY: y,
      movingScaledX: scaledX,
      movingScaledY: scaledY,
      movingLeftX: leftX,
      movingTopY: topY,
      movingScreenLeftX: screenLeftX,
      movingScreenTopY: screenTopY,
      nextLevel,
      previousLevel,
    };
  };

  updateCanvasDimension = () => {
    this.canvasHandler.updateLevelToScale(this.props.appSettingsStore.levelToScale);

    this.canvasHandler.updateDimension(
      this.canvasRootRef.current.offsetWidth,
      this.canvasRootRef.current.offsetHeight,
    );

    this.setState({
      width: this.canvasRootRef.current.offsetWidth,
      height: this.canvasRootRef.current.offsetHeight,
    });
  };

  hidePluginTogglePanel = () => {
    this.setState({
      pluginPanelClosed: true,
    });
  };

  showPluginTogglePanel = () => {
    this.setState({
      pluginPanelClosed: false,
    });
  };

  restrictOutOfBoundary({
    newLeftX = null,
    newTopY = null,
    newX = null,
    newY = null,
    normalizedWidth,
    normalizedHeight,
    floor,
  }) {
    const floorData = get(this.props.floorStore, `floors.${floor}`);
    if (!floorData) {
      return [this.props.x, this.props.y];
    }
    const { mapWidth, mapHeight, startX, startY } = floorData;

    return [
      [startX, newX, newLeftX, normalizedWidth, mapWidth],
      [startY, newY, newTopY, normalizedHeight, mapHeight],
    ]
      .map(
        ([
          startCoordinate,
          originalCoordinate,
          cornerCoordinate,
          normalizedDimension,
          totalDimension,
        ]) => {
          if (totalDimension <= normalizedDimension) {
            return normalizedDimension / 2 + startCoordinate;
          }

          if (cornerCoordinate < startCoordinate) {
            return normalizedDimension / 2 + startCoordinate;
          }

          if (cornerCoordinate + normalizedDimension > totalDimension + startCoordinate) {
            let restricted = totalDimension + startCoordinate - normalizedDimension / 2;
            restricted =
              restricted < startCoordinate ? normalizedDimension / 2 + startCoordinate : restricted;
            return restricted;
          }

          return originalCoordinate;
        },
      )
      .map(v => Math.round(v));
  }

  updatePosition() {
    const { x, y, floor, level } = this.props;
    const isPositionReady = [x, y, level, floor].every(v => !isNil(v));
    if (!isPositionReady) {
      return;
    }
    this.canvasHandler.updatePosition(x, y, floor, level);
  }

  render() {
    const {
      children,
      floor,
      linkTo,
      floorStore: { floors, buildings },
      pluginSettingsStore,
      platform,
    } = this.props;

    const { width, height, pluginPanelClosed } = this.state;

    const urlParams = pick(this.props, [
      'from',
      'to',
      'via',
      'x',
      'y',
      'level',
      'floor',
      'search',
      'suggestion',
      'suggestionX',
      'suggestionY',
    ]);

    const isDimensionReady = width && height;

    const isMobile = platform === PLATFORM.MOBILE;

    return (
      <div className={style.body}>
        {!isMobile ? (
          <div className={style.title}>
            <div className={style.floor}>
              {get(floors, `${floor}.name`)
                ? `Floor ${floors[floor].name} - ${buildings[floors[floor].buildingId].name}`
                : floor && `${buildings[floors[floor].buildingId].name}`}
            </div>
            <div className={style.buttons}>
              {children.map(({ id, MenuBarPlugin }) => {
                if (!MenuBarPlugin) {
                  return null;
                }

                const PluginComponent = getConnectedComponent(
                  id,
                  `mapCanvasMenuBar_${id}`,
                  MenuBarPlugin.connect,
                  MenuBarPlugin.Component,
                );

                return (
                  <PluginComponent
                    key={id}
                    {...pick(
                      {
                        canvas: this.canvasHandler.getCanvas(),
                        ...urlParams,
                        ...this.state,
                        ...this.canvasHandler.getProps(),
                        platform,
                        linkTo,
                        APIEndpoint,
                        getPosition: this.getPosition,
                      },
                      MenuBarPlugin.connect,
                    )}
                  />
                );
              })}
              <button
                className={style.button}
                type="button"
                onClick={() => {
                  linkTo({ suggestion: TABS.INDEX });
                }}
              >
                Suggestion
              </button>
              <button className={style.button} type="button" onClick={window.print}>
                Print
              </button>
            </div>
          </div>
        ) : null}
        <div
          className={classnames(style.canvasRoot, { [style['canvasRoot--mobile']]: isMobile })}
          ref={this.canvasRootRef}
        >
          {isDimensionReady &&
            children.map(({ id, MapCanvasPlugin }) => {
              if (!MapCanvasPlugin) {
                return null;
              }

              const PluginComponent = getConnectedComponent(
                id,
                `mapCanvas_${id}`,
                MapCanvasPlugin.connect,
                MapCanvasPlugin.Component,
              );

              return (
                <PluginComponent
                  key={id}
                  {...pick(
                    {
                      canvas: this.canvasHandler.getCanvas(),
                      ...urlParams,
                      ...this.state,
                      ...this.canvasHandler.getProps(),
                      platform,
                      linkTo,
                      APIEndpoint,
                      getPosition: this.getPosition,
                    },
                    MapCanvasPlugin.connect,
                  )}
                />
              );
            })}
          {pluginSettingsStore.ids.length ? (
            <button
              type="button"
              className={classnames(style.layerButton, {
                [style['layerButton--mobile']]: platform === 'MOBILE',
              })}
              onClick={this.showPluginTogglePanel}
            >
              <img src="/images/icons/settings.svg" alt="layers button" />
            </button>
          ) : null}
        </div>
        <PluginTogglePanel
          platform={platform}
          closed={pluginPanelClosed}
          onClose={this.hidePluginTogglePanel}
        />
      </div>
    );
  }
}

export default connect(
  state => ({
    appSettingsStore: state.appSettings,
    pluginSettingsStore: state.pluginSettings,
    floorStore: state.floors,
  }),
  dispatch => ({
    getMapItemsHandler: (floor, [startX, startY], width, height) => {
      dispatch(getMapItemsAction(floor, [startX, startY], width, height));
    },
    getEdgesHandler: (floor, [startX, startY], width, height) => {
      dispatch(getEdgesAction(floor, [startX, startY], width, height));
    },
  }),
)(MapCanvas);
