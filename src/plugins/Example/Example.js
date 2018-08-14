import React, { Component } from 'react';

const pluginId = 'Example';
const PrimaryPanelPlugin = ({ place, helloWorld }) => (
  <div>
    <h1> Test Example Plugin, I am at {place}</h1>
    <button type="button" onClick={() => helloWorld(<b key="test2">Added by Example</b>)}>
      Add things
    </button>
  </div>
);
const MapCanvasPlugin = () => null;

export { pluginId, PrimaryPanelPlugin, MapCanvasPlugin };