export const GET_EDGES = 'GET_EDGES';
export const GET_EDGES_SUCCESS = 'GET_EDGES_SUCCESS';
export const GET_EDGES_FAILURE = 'GET_EDGES_FAILURE';

/**
 * @param {string} floor
 * @param {number[]} coordinates
 * @param {number} width
 * @param {number} height
 * @return {object}
 */
export function getEdgesAction(floor, coordinates, width, height) {
  return {
    type: GET_EDGES,
    payload: { floor, coordinates, width, height },
  };
}

export function getEdgesSuccessAction(edges) {
  return {
    type: GET_EDGES_SUCCESS,
    payload: { edges },
  };
}

export function getEdgesFailureAction() {
  return {
    type: GET_EDGES_FAILURE,
  };
}

const initialState = {
  loading: false,
  success: false,
  failure: false,
  edges: [],
};

const edges = (state = initialState, { type, payload }) => {
  switch (type) {
    case GET_EDGES:
      return {
        ...initialState,
        loading: true,
      };
    case GET_EDGES_SUCCESS:
      return {
        ...state,
        loading: false,
        success: true,
        failure: false,
        edges: payload.edges,
      };
    case GET_EDGES_FAILURE:
      return {
        ...state,
        loading: false,
        success: false,
        failure: true,
      };
    default:
      return state;
  }
};

export default edges;
