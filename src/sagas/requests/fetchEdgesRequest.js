import axios from 'axios';
import { APIEndpoint } from '../../config/config';

export default function fetchEdgesRequest(floor, [startX, startY], width, height) {
  return axios
    .get(
      `${APIEndpoint()}/floors/${encodeURIComponent(floor)}/edges?boxCoordinates=${[
        startX,
        startY,
        startX + width,
        startY + height,
      ].join(',')}`,
    )
    .then(response => ({
      ...response,
      data: (response.data.data || []).map(
        ({
          _id,
          fromNodeId,
          toNodeId,
          weightType,
          floorId,
          fromNodeCoordinates,
          toNodeCoordinates,
          weight,
        }) => ({
          id: _id,
          fromNodeId,
          toNodeId,
          weightType,
          floor: floorId,
          fromNodeCoordinates,
          toNodeCoordinates,
          weight,
        }),
      ),
    }));
}
