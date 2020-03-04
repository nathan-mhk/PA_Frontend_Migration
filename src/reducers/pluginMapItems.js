import omit from 'lodash.omit';
import isDev from '../utils/isDev';

const isNull = v => v === null;
isNull.toString = () => 'null';

const isObject = v => v && Object.getPrototypeOf(v) === Object.prototype;
isObject.toString = () => 'string';

const immutableProperties = ['floor', 'connectorId'];

const mapItemsProperties = [
  ['name', ['string']],
  ['coordinates', [Array.isArray]],
  ['type', ['string']],
  ['photo', ['string', isNull]],
  ['panorama', ['string', isNull]],
  ['url', ['string']],
  ['geoLocs', [isObject]],
  ['others', [isObject]],
];

function checkMapItemsProps(mapItems) {
  Object.entries(mapItems).forEach(([, item]) => {
    immutableProperties.forEach(prop => {
      if (Object.prototype.hasOwnProperty.call(item, prop)) {
        throw new Error(`Attempt to change immutable map item property ${prop}`);
      }
    });

    mapItemsProperties.forEach(([prop, types]) => {
      if (!Object.prototype.hasOwnProperty.call(item, prop)) {
        return;
      }

      const isValidTypes = types.some(type => {
        if (typeof type === 'function') {
          return type(item[prop]);
        }

        // eslint-disable-next-line valid-typeof
        return type === typeof item[prop];
      });

      if (!isValidTypes) {
        throw new TypeError(
          `Map item property ${prop} must be ${types.join(' or ')}, <value: ${
            item[prop]
          }, type: ${typeof item[prop]}> got`,
        );
      }
    });
  });
}

export const SET_PLUGIN_MAP_ITEMS = 'SET_PLUGIN_MAP_ITEMS';
export const CLEAR_PLUGIN_MAP_ITEMS = 'CLEAR_PLUGIN_MAP_ITEMS';

export function setPluginMapItemsAction(pluginId, mapItems) {
  return {
    type: SET_PLUGIN_MAP_ITEMS,
    payload: { pluginId, mapItems },
  };
}

export function clearPluginMapItemsAction(pluginId) {
  return {
    type: CLEAR_PLUGIN_MAP_ITEMS,
    payload: { pluginId },
  };
}

const initialState = {};

const pluginMapItems = (state = initialState, { type, payload: { pluginId, mapItems } = {} }) => {
  switch (type) {
    case SET_PLUGIN_MAP_ITEMS: {
      if (isDev) {
        checkMapItemsProps(mapItems);
      }

      return {
        ...state,
        [pluginId]: mapItems,
      };
    }

    case CLEAR_PLUGIN_MAP_ITEMS: {
      return {
        ...omit(state, pluginId),
      };
    }

    default:
      return state;
  }
};

export default pluginMapItems;
