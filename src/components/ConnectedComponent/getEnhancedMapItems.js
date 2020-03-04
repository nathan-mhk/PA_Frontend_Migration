import { createSelector } from 'reselect';
import plugins from '../../utils/getPlugins';
import detectPlatform from '../Main/detectPlatform';

const platform = detectPlatform();

const getMapItems = state => state.mapItems;
const getPluginMapItems = state => state.pluginMapItems;
const getPluginSettings = state => state.pluginSettings;

const getEnhancedMapItems = createSelector(
  [getMapItems, getPluginMapItems, getPluginSettings],
  (mapItemStore, pluginMapItems, pluginSettings) => {
    const activePlugins = plugins.filter(plugin => {
      if (plugin.platform && !plugin.platform.includes(platform)) {
        return false;
      }

      if (!pluginSettings.data[plugin.id]) {
        return true;
      }

      return !pluginSettings.data[plugin.id].off;
    });

    if (!mapItemStore.success) {
      return mapItemStore;
    }

    let enhancedMapItems = [];

    activePlugins.forEach(({ id }) => {
      if (!pluginMapItems[id]) {
        return;
      }

      const pluginEnhancedMapItems = Object.entries(pluginMapItems[id]).reduce(
        (agg, [itemId, currItem]) => [
          ...agg,
          {
            id: itemId,
            ...currItem,
          },
        ],
        [],
      );

      enhancedMapItems = [...enhancedMapItems, ...pluginEnhancedMapItems];
    });

    if (!enhancedMapItems.length) {
      return mapItemStore;
    }

    const { mapItems } = mapItemStore;
    const mapItemId2Index = mapItems.reduce(
      (agg, currItem, currIndex) => ({
        ...agg,
        [currItem.id]: currIndex,
      }),
      {},
    );

    const updatedMapItems = [...mapItems];

    enhancedMapItems.forEach(({ id, ...item }) => {
      const index = mapItemId2Index[id];
      if (typeof index === 'undefined') {
        return;
      }

      updatedMapItems[index] = {
        ...mapItems[index],
        ...item,
        others: {
          ...mapItems[index].others,
          ...item.others,
        },
      };
    });

    return { ...mapItemStore, mapItems: updatedMapItems };
  },
);

export default getEnhancedMapItems;
