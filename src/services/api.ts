import axios from 'axios';
import { EventPayload } from '../types';

const API_URL = 'http://localhost:3000';

export const api = {
  sendEvent: async (event: EventPayload) => {
    console.log('>>>>> API:', event);
    const response = await axios.post(`${API_URL}/event`, event);
    console.log('>>>>> response:', response.data);
    return response.data;
  },
  

  
  getHealth: async () => {
    const response = await axios.get(`${API_URL}/health`);
    return response.data;
  }
};
