import { Poll, PollDetail, CreatePollRequest, ErrorResponse, SuccessResponse } from '../types';

const API_BASE = '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    throw new Error(error.error || '请求失败');
  }
  return response.json();
}

export const api = {
  async getPolls(): Promise<Poll[]> {
    const response = await fetch(`${API_BASE}/polls`);
    return handleResponse<Poll[]>(response);
  },

  async getPoll(id: number): Promise<PollDetail> {
    const response = await fetch(`${API_BASE}/polls/${id}`);
    return handleResponse<PollDetail>(response);
  },

  async createPoll(data: CreatePollRequest): Promise<Poll> {
    const response = await fetch(`${API_BASE}/polls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse<Poll>(response);
  },

  async vote(pollId: number, optionId: number): Promise<SuccessResponse> {
    const response = await fetch(`${API_BASE}/polls/${pollId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ option_id: optionId }),
    });
    return handleResponse<SuccessResponse>(response);
  },
};
