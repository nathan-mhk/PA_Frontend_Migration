import React, {Component} from 'react';
import classnames from 'classnames';
import buttonImg from './button.png';
import style from './DefectReport.module.css';


class DefectReport extends Component{

  componentWillUnmount() {
    const { clearPluginMapItemsHandler } = this.props;
    clearPluginMapItemsHandler();
  }

  componentDidUpdate(prevProps) {
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
          <img className={buttonClassName} src={buttonImg} alt='Defect Report'/>
        </button>
      </div>
    )
  }

}

function ReportUI({x,y,moveingX,movingY,floor,name}){
  // if(name!=='Report Defect')return null;
  // return <h1>OUO</h1>
  return null;
}



const defaultOff = false;
const name = 'Defect Report';
const core = false;


const MapCanvasPlugin = {
  Component: DefectReport,
  connect: ['x', 'y', 'movingX', 'movingY', 'floor', 'platform', 'openOverlayHandler', 'clearPluginMapItemsHandler',]
}

const OverlayContentPlugin = {
  Component: ReportUI,
}

export{
  name,
  defaultOff,
  core,
  MapCanvasPlugin,
  OverlayContentPlugin,
};


