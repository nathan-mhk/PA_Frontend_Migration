import React, { Component } from 'react';
import { connect } from 'react-redux';
import isNil from 'lodash.isnil';

import ErrorBoundary from '../ErrorBoundary/ErrorBoundary';
import getEnhancedMapItems from './getEnhancedMapItems';
import { openOverlayAction } from '../../reducers/overlay';
import { updateLegendDisplayAction } from '../../reducers/legends';
import { getNearestMapItemAction } from '../../reducers/nearestMapItem';
import { setUserActivitiesAction } from '../../reducers/userActivities';
import { setPluginMapItemsAction, clearPluginMapItemsAction } from '../../reducers/pluginMapItems';

const paramStateMap = {
  legendStore: state => state.legends,
  mapItemStore: state => getEnhancedMapItems(state),
  floorStore: state => state.floors,
  searchNearestStore: state => state.searchNearest,
  searchShortestPathStore: state => state.searchShortestPath,
  appSettingStore: state => state.appSettings,
  overlayStore: state => state.overlay,
  searchMapItemStore: state => state.searchMapItem,
  nearestMapItemStore: state => state.nearestMapItem,
  userActivitiesStore: state => state.userActivities,
  edgeStore: state => state.edges,
};

const urlParams = ['place', 'from', 'to', 'via', 'x', 'y', 'level', 'floor', 'searchOptions'];
const canvasParams = [
  'canvas',
  'width',
  'height',
  'normalizedWidth',
  'normalizedHeight',
  'movingLeftX',
  'movingTopY',
  'movingScreenLeftX',
  'movingScreenTopY',
  'movingX',
  'movingY',
  'movingScaledX',
  'movingScaledY',
  'nextLevel',
  'previousLevel',
  'getPosition',
];

const paramDispatchMap = {
  openOverlayHandler: dispatch => (photo, url, name, others) => {
    dispatch(openOverlayAction(photo, url, name, others));
  },
  updateLegendDisplayHandler: dispatch => (legendType, display) => {
    dispatch(updateLegendDisplayAction(legendType, display));
  },
  getNearestMapItemHandler: dispatch => (floor, coordinates) => {
    dispatch(getNearestMapItemAction(floor, coordinates));
  },
  setUserActivitiesHandler: dispatch => payload => {
    dispatch(setUserActivitiesAction(payload));
  },
  enhanceMapItemsHandler: (dispatch, pluginId) => mapItems => {
    dispatch(setPluginMapItemsAction(pluginId, mapItems));
  },
  clearPluginMapItemsHandler: (dispatch, pluginId) => () => {
    dispatch(clearPluginMapItemsAction(pluginId));
  },
};

/* eslint no-param-reassign: [0] */
const ConnectedComponent = (pluginId, connectParams) => PluginComponent => {
  if (!PluginComponent) {
    throw new Error(
      'You must wrap you plugin component in an object { Component: <Your plugin component>, connect: [<param1>, <param2>, ..., <paramN>] }',
    );
  }
  if (!Array.isArray(connectParams)) {
    throw new Error(
      'You must provide connect value in plugin object, if you do not wish to connect any param, pass empty array []',
    );
  }

  if (connectParams.includes('searchOptionsStore')) {
    /* backward compatible for deprecated searchOptionsStore */
    connectParams.push('searchOptions');
  }

  class ProxyComponent extends Component {
    shouldComponentUpdate(nextProps) {
      return connectParams.some(
        param =>
          (canvasParams.includes(param) || urlParams.includes(param) || paramStateMap[param]) &&
          this.props[param] !== nextProps[param],
      );
    }

    render() {
      const derivedProps = {};

      const isPositionSubscribedAndReady = !['x', 'y', 'level', 'floor'].some(
        param => connectParams.includes(param) && isNil(this.props[param]),
      );

      if (!isPositionSubscribedAndReady) {
        return null;
      }

      /* backward compatible for deprecated searchOptionsStore */
      if (connectParams.includes('searchOptionsStore')) {
        derivedProps.searchOptionsStore = {
          ...this.props.searchOptions,
          ...this.props.userActivitiesStore,
        };
      }
      return (
        <ErrorBoundary>
          <PluginComponent {...this.props} {...derivedProps} />
        </ErrorBoundary>
      );
    }
  }

  return connect(
    state =>
      connectParams.reduce((connectedState, param) => {
        /* backward compatible for deprecated searchOptionsStore */
        if (param === 'searchOptionsStore') {
          param = 'userActivitiesStore';
        }

        if (paramStateMap[param]) {
          connectedState[param] = paramStateMap[param](state);
        }

        return connectedState;
      }, {}),
    dispatch =>
      connectParams.reduce((connectedDispatch, param) => {
        if (paramDispatchMap[param]) {
          connectedDispatch[param] = paramDispatchMap[param](dispatch, pluginId);
        }
        return connectedDispatch;
      }, {}),
  )(ProxyComponent);
};

export default ConnectedComponent;
