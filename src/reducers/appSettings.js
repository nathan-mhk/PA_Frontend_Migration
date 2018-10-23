const initialState = {
  loading: false,
  failure: false,
  success: true,
  // levelToScale: [1.0, 0.85, 0.6, 0.5, 0.4],
  levelToScale: [1.0, 0.85, 0.6],
  meterPerPixel: 0.0455,
  minutesPerMeter: 0.015,
  defaultPosition: {
    floor: 'Overall',
    x: 936,
    y: 654,
    level: 2,
  },
  mobileDefaultPosition: {
    floor: 'G',
    x: 2182,
    y: 2343,
    level: 0,
  },
};

const appSettings = (state = initialState, { type, payload }) => {
  switch (type) {
    default:
      return state;
  }
};

export default appSettings;
