export interface Option {
  id: number;
  poll_id: number;
  text: string;
  votes: number;
}

export interface Poll {
  id: number;
  title: string;
  description: string;
  options: Option[];
  deadline: string;
  created_at: string;
  total_votes: number;
}

export interface PollDetail extends Poll {
  has_voted: boolean;
  is_closed: boolean;
}

export interface CreatePollRequest {
  title: string;
  description: string;
  options: { text: string }[];
  deadline: string;
}

export interface VoteRequest {
  option_id: number;
}

export interface ErrorResponse {
  error: string;
}

export interface SuccessResponse {
  message: string;
}
