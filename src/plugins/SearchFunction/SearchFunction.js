import React, { Component } from 'react';
import classnames from 'classnames';
import SearchArea from "../../components/SearchArea/SearchArea";
import SearchPrimaryPanelView from "../../components/SearchPrimaryPanelView/SearchPrimaryPanelView";

class SearchFunction extends Component {
  // Todo
}

const PrimaryPanelPlugin = {
  Component: SearchFunction,
  connect: [
    'search',
    'from'
  ],
};
