import React, { Component } from 'react';
import classnames from 'classnames';
import buttonImg from './button.png';
import buttonGo from './button_go.png';
import style from './DefectReport.module.css';

// testing
class DefectReport extends Component {
  componentDidUpdate(prevProps) {
    const { x, y, movingX, movingY, floor, enhanceMapItemsHandler } = this.props;
    const { success, mapItems } = this.props.mapItemStore;

    if ((prevProps && !prevProps.mapItemStore.loading) || !success) {
      return;
    }

    const reportId = 'Defect Report';

    enhanceMapItemsHandler([
      {
        id: reportId,
        others: { xLoc: x, yLoc: y, xMoving: movingX, yMoving: movingY, locFloor: floor, state:true},
      },
    ]);

    console.log(x+' '+y);
  }

  componentWillUnmount() {
    const { clearPluginMapItemsHandler } = this.props;
    clearPluginMapItemsHandler();
  }

  render() {
    const { platform, openOverlayHandler } = this.props;
    const buttonClassName = classnames({
      [style.buttonImage]: platform !== 'MOBILE',
      [style.buttonImageMobile]: platform === 'MOBILE',
    });

    return (
      <div className={style.body}>
        <button
          className={style.button}
          type="button"
          onClick={() => openOverlayHandler('Defect Report')}
        >
          <img className={buttonClassName} src={buttonImg} alt="Defect Report" />
        </button>
      </div>
    );
  }
}

function ReportUI({name,others}) {
  if(name!=='Defect Report')
    return null;
  let x = others.xLoc, y = others.yLoc,
    movingX = others.xMoving, movingY = others.yMoving,
    floor = others.locFloor;

  return (
    <div>
      <div style={{marginTop: "20px"}}>Defect Location:  </div>
      <div style={{marginTop: "20px"}}>
        <table>
          <tr>
            <th>
              <input type="text"></input>
            </th>
            <th>
              <button
                className={style.button}
                type="button"
              >
                <img className={style.goButtonImage} src={buttonGo} alt="GO button" />
              </button>
            </th>
          </tr>
        </table>
      </div>
      <div className={style.topMagrin}>
      <button
          className={style.button}
          type="button"
         onClick={()=>window.open('https://maximo.ust.hk/maximo','_blank')}
        ><img className={style.buttonImage} src={buttonImg} alt="Defect Report" /></button>
      </div>
    </div>

  );
}

const defaultOff = false;
const name = 'Defect Report';
const core = false;

const MapCanvasPlugin = {
  Component: DefectReport,
  connect: [
    'x',
    'y',
    'movingX',
    'movingY',
    'floor',
    'platform',
    'openOverlayHandler',
    'clearPluginMapItemsHandler',
    'enhanceMapItemsHandler',
    'mapItemStore',
  ],
};

const OverlayContentPlugin = {
  Component: ReportUI,
};

export { name, defaultOff, core, MapCanvasPlugin, OverlayContentPlugin };
