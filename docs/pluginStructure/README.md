# Plugin structure

## File structure

All plugins lives under the root `plugins` folder and each plugin will have their own folder containing all their assets inside. Inside their own folders, there should be at least one `.js` file which its filename should be the same as the plugin folder's name and one other file named `package.json` defining this plugin's name and dependencies. All plugin folder name should be in camel case.
For example, if you want to build a hello world plugin, you will need to create a folder named `HelloWorld` under plugins folder. Inside `HelloWorld` folder, there should be a `HelloWorld.js` and a `package.json` file.

```
...
src
└── plugins/
    └── HelloWorld/
        ├──  package.json
        └──  HelloWorld.js
...
```

Finally, in order to include your plugin, you need to edit `plugins/index.js` file to include `HelloWorld.js` file.

plugins/index.js

```javascript
import * as FooBar from './FooBar/FooBar';
import * as HelloWorld from './HelloWorld/HelloWorld';

export [FooBar, HelloWorld];
```


## Package.json

The full specification of a package.json can be found here [https://docs.npmjs.com/files/package.json](https://docs.npmjs.com/files/package.json)

Your plugin `package.json` should include at least the following content.

```json
{
  "name": "@ust-pathadvisor/my-first-plugin",
  "version": "0.0.0",
  "private": true
}
```

The `name` field should always starts with `@ust-pathadvisor/` followed by your plugin name in kebab case (lower case and words separated by dash) format.


You can use libraries found from http://npmjs.com repo and import them to use in your plugin, but you must define these dependencies in `package.json` file so that the build script know what libraries to be included during build time.

If you plugin, for example, want to use the library [lodash.get](https://www.npmjs.com/package/lodash.get), you can run the command in project directory `npx bolt w @ust-pathadvisor/my-first-plugin add lodash.get`.

After running the command, it will update your plugin's `package.json` automatically with the following content.

```json
{
  "name": "@ust-pathadvisor/my-first-plugin",
  "version": "0.0.0",
  "private": true,
  "dependencies": {
    "lodash.get": "^4.4.2"
  }
}
```

and then you can start using this library in your plugin:

```javascript
import get from 'lodash.get';
```

## Entry point file

The plugin entry point file `HelloWorld.js` will have the following format:

```javascript

function HelloWorldPrimaryPanel() {
  return <div> Hello World in PrimaryPanel </div>;
}

function HelloWorldMapCanvas() {
  return <div> Hello World in MapCanvas </div>;
}

function HelloWorldOverlayHeader() {
  return <div> Hello World in OverlayHeader </div>;
}

function HelloWorldOverlayContent() {
  return <div> Hello World in OverlayContent </div>;
}

function HelloWorldMobileOverlayHeader() {
  return <div> Hello World in MobileOverlayHeader </div>;
}

function HelloWorldMobileOverlayContent() {
  return <div> Hello World in MobileOverlayContent </div>;
}

const PrimaryPanelPlugin = { Component: HelloWorldPrimaryPanel, connect: [] };
const MapCanvasPlugin = { Component: HelloWorldMapCanvas, connect: [] };
const OverlayHeaderPlugin = { Component: HelloWorldOverlayHeader, connect: [] };
const OverlayContentPlugin = { Component: HelloWorldOverlayContent, connect: [] };
const MobileOverlayHeaderPlugin = { Component: HelloWorldMobileOverlayHeader, connect: [] };
const MobileOverlayContentPlugin = { Component: HelloWorldMobileOverlayContent, connect: [] };

const name = "Hello World";
const defaultOff = true;
const platform = ['DESKTOP'];
const core = false;

export {
  name,
  defaultOff,
  platform,
  core,
  PrimaryPanelPlugin,
  MapCanvasPlugin,
  OverlayHeaderPlugin,
  OverlayContentPlugin,
  MobileOverlayHeaderPlugin,
  MobileOverlayContentPlugin
};
```

`name` - The name of your plugin. It will be used to identify your plugin in plugin toggle panel.

`defaultOff` - Boolean value to define whether your plugin will be off by default, the users can switch it on and off in the plugin toggle panel, default to true if not provided.

`platform` - An array of platforms your plugin supports. Default to all platforms if not provided. Available value for platform item is DESKTOP, MOBILE.

`core` - Reserved to ITSC PathAdvisor team and default to false. Third party plugin must not set this property to true. Core plugin ignore defaultOff and won't be shown in toggle plugin panel as they can't be switched off.

`PrimaryPanelPlugin`, `MapCanvasPlugin`, `OverlayHeaderPlugin`, `OverlayContentPlugin`,`MobileOverlayHeaderPlugin`,
  `MobileOverlayContentPlugin` - There are six different types of plugin you can define, you can find the document for each type [here](typesOfPlugins/README.md).


![Plugin toggle panel](../images/pluginPanel.png)
_Plugin toggle panel showing the on/off status of the plugins_


Note that if your plugin only contains one plugin type, for example, if your plugin only add new features to `PrimaryPanelPlugin`, you don't need to export all the other types. i.e.

```javascript
function HelloWorld() {
  return <h1> Hello World </h1>;
}

const PrimaryPanelPlugin = { Component: HelloWorld, connect: [] };

const name = "Hello World";

export { name, PrimaryPanelPlugin }; // <-- only need to export the plugin type you implemented
```

## Component and connected properties

Each plugin type can be defined in the following structure:

```javascript
const PrimaryPanelPlugin = { Component: null, connect: [] };
```

There are two properties for a plugin you will need to define `Component` and `connect`.

`Component` is the actual plugin component, it can be a plain javascript function or a class extending
[React.Component](https://reactjs.org/docs/glossary.html#components) or [React.PureComponent](https://reactjs.org/docs/react-api.html#reactpurecomponent)

`connect` is an array of property names that will be passed to the Component.

For example, if your component need the current `floor`, `x` and `y` coordinate values, you need to define them in the `connect` array in order to use them in the component.

Note that connected property can be a string, a number or a function. In this case, `floor` is string and `x` and `y` are numbers.

For `OverlayHeaderPlugin` and `OverlayContentPlugin`, the connect array will be ignored. They will always receive four fixed properties: `name`, `photo`, `url` and `others`.

** Functional plugin version **

```javascript
function HelloWorld({ x, y, floor }) {
  return (
    <h1>
      I am now at floor {floor} at ({x},{y}) position.
    </h1>
  );
}

const PrimaryPanelPlugin = {
  Component: HelloWorld,
  connect: ["x", "y", "floor"]
};

const name = "Hello World";
const defaultOff = true;

export { name, defaultOff, PrimaryPanelPlugin };
```

** Class plugin version **

```javascript
class HelloWorld extends React.Component {
  render() {
    const { x, y, floor } = this.props;
    return (
      <h1>
        I am now at floor {floor} at ({x},{y}) position.
      </h1>
    );
  }
}

const PrimaryPanelPlugin = {
  Component: HelloWorld,
  connect: ["x", "y", "floor"]
};

const name = "Hello World";

export { name, PrimaryPanelPlugin };
```

For each plugin type you can connect different types of properties, they are described in [Types of plugin]() section.

## Updating and rendering

Each time the connected properties are updated, the plugin function, or the render method of the plugin if you define your plugin as a class, will be called.

Also if your plugin only exists to call some functions and do not render any HTML DOM elements and therefore there is nothing to return then you must return `null`. An error will be thrown if a plugin does not return anything.

** function plugin **

```javascript
function HelloWorld() {
  console.log("Hello world plugin");
  return null;
}
```

** class plugin **

```javascript
class HelloWorld extends React.Component {
  render() {
    console.log("Hello world plugin");
    return null;
  }
}
```

It is likely to be the case for `MapCanvasPlugin`, where you call `setMapItems` to add items into map canvas directly instead of returning them from the render function. You should therefore return null in the render function unless you are returning some elements to be rendered on top of the map canvas.

The rule of thumb is your plugin should always have a return statement returning something.
