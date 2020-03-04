import { put, takeLatest, call } from 'redux-saga/effects';
import fetchEdgesRequest from '../requests/fetchEdgesRequest';

import { GET_EDGES, getEdgesSuccessAction, getEdgesFailureAction } from '../../reducers/edges';

function* edgesRequestWorker({ payload: { floor, coordinates, width, height } }) {
  try {
    const { data } = yield call(fetchEdgesRequest, floor, coordinates, width, height);
    yield put(getEdgesSuccessAction(data));
  } catch (error) {
    console.error(error);
    yield put(getEdgesFailureAction());
  }
}

export default function* edgesRequestWatcher() {
  yield takeLatest(GET_EDGES, edgesRequestWorker);
}
