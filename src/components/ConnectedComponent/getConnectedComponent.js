import ConnectedComponent from './ConnectedComponent';

const cachedComponents = {};

function getConnectedComponent(id, instanceId, connect, component) {
  if (!cachedComponents[instanceId]) {
    cachedComponents[instanceId] = ConnectedComponent(id, connect)(component);
  }
  return cachedComponents[instanceId];
}

export default getConnectedComponent;
