export type PollType = "single" | "multiple";

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
  poll_type: PollType;
  max_choices: number;
  deadline: string;
  created_at: string;
  total_votes: number;
  total_voters: number;
}

export interface PollDetail extends Poll {
  has_voted: boolean;
  is_closed: boolean;
}

export interface CreatePollRequest {
  title: string;
  description: string;
  options: { text: string }[];
  poll_type: PollType;
  max_choices: number;
  deadline: string;
}

export interface VoteRequest {
  option_ids: number[];
}

export interface ErrorResponse {
  error: string;
}

export interface SuccessResponse {
  message: string;
}
