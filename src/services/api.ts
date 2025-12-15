import axios from 'axios';
import { EventPayload } from '../types';

const API_URL = 'http://localhost:3000';



export const api = {
  sendEvent: async (event: EventPayload) => {
    const response = await axios.post(`${API_URL}/webhook/event`, event);
    return response.data;
  },
  
  getStats: async () => {
    const response = await axios.get(`${API_URL}/stats`);
    return response.data;
  },
  
  getHealth: async () => {
    const response = await axios.get(`${API_URL}/health`);
    return response.data;
  }
};
