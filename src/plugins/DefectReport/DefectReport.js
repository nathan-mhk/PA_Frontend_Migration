import React, { Component } from 'react';
import classnames from 'classnames';
import buttonImg from './button.png';
import buttonGo from './button_go.png';
import style from './DefectReport.module.css';
import FloorPrimaryPanelView from "../../components/FloorPrimaryPanelView/FloorPrimaryPanelView";
import Floor from "../../components/Floor/Floor";

class DefectReport extends Component {
  componentDidUpdate(prevProps) {
    const {
      x,
      y,
      level,
      floor,
      linkTo,
      movingX,
      movingY,
      enhanceMapItemsHandler
    } = this.props;

    const { success, mapItems } = this.props.mapItemStore;

    if ((prevProps && !prevProps.mapItemStore.loading) || !success) {
      return;
    }

    const reportId = 'Defect Report';

    enhanceMapItemsHandler([
      {
        id: reportId,
        others: {
          x: x,
          y: y,
          level: level,
          floor: floor,
          linkTo: linkTo,
          movingX: movingX,
          movingY: movingY,
          state: true,
        },
      },
    ]);

    console.log(x+' '+y);
  }

  componentWillUnmount() {
    const { clearPluginMapItemsHandler } = this.props;
    clearPluginMapItemsHandler();
  }

  render() {
    const {
      platform,
      openOverlayHandler,
    } = this.props;

    const buttonClassName = classnames({
      [style.buttonImage]: platform !== 'MOBILE',
      [style.buttonImageMobile]: platform === 'MOBILE',
    });

    return (
      <div className={style.body}>
        <button
          className={style.button}
          type="button"
          onClick={() => openOverlayHandler('Defect Report', null, null, null)}
        >
          <img className={buttonClassName} src={buttonImg} alt="Defect Report" />
        </button>
      </div>
    );
  }
}

class ReportUI extends Component {
  state = {
    selectedBuilding: 'academicBuilding',
  };

  selectBuildingAction = selectedBuilding => {
    this.setState({ selectedBuilding });
  };

  render() {
    if (name !== 'Defect Report')
      return null;

    const {
      x,
      y,
      level,
      floor,
      linkTo,
      movingX,
      movingY,
    } = this.props.others;

    const {
      selectedBuilding,
    } = this.state;

    return (
      <div>
        <div>
          <Floor
            selectedBuilding={selectedBuilding}
            selectedBuildingAction={this.selectBuildingAction}
            x={x}
            y={y}
            level={level}
            currentFloorId={floor}
            linkTo={linkTo}
            FloorView={FloorPrimaryPanelView}
          />
        </div>
        {/*<div style={{marginTop: "20px"}}>Defect Location:</div>*/}
        {/*<div style={{marginTop: "20px"}}>*/}
        {/*  <table>*/}
        {/*    <tr>*/}
        {/*      <th>*/}
        {/*        <input type="text"></input>*/}
        {/*      </th>*/}
        {/*      <th>*/}
        {/*        <button*/}
        {/*          className={style.button}*/}
        {/*          type="button"*/}
        {/*        >*/}
        {/*          <img className={style.goButtonImage} src={buttonGo} alt="GO button"/>*/}
        {/*        </button>*/}
        {/*      </th>*/}
        {/*    </tr>*/}
        {/*  </table>*/}
        {/*</div>*/}
        <div className={style.topMagrin}>
          <button
            className={style.button}
            type="button"
            onClick={() => window.open('https://maximo.ust.hk/maximo', '_blank')}
          ><img className={style.buttonImage} src={buttonImg} alt="Defect Report"/></button>
        </div>
      </div>

    );
  }
}

const defaultOff = false;
const name = 'Defect Report';
const core = false;

const MapCanvasPlugin = {
  Component: DefectReport,
  connect: [
    'x',
    'y',
    'level',
    'floor',
    'linkTo',
    'mapItemStore',
    'enhanceMapItemsHandler',
    'clearPluginMapItemsHandler',
    'openOverlayHandler',
    'platform',
    'movingX',
    'movingY',
  ],
};

const OverlayContentPlugin = {
  Component: ReportUI,
};

export { name, defaultOff, core, MapCanvasPlugin, OverlayContentPlugin };
