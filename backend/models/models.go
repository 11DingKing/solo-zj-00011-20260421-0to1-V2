package models

import (
	"time"
)

type Poll struct {
	ID          int       `json:"id"`
	Title       string    `json:"title" validate:"required,min=1,max=200"`
	Description string    `json:"description" validate:"max=1000"`
	Options     []Option  `json:"options" validate:"required,min=2,max=8,dive"`
	Deadline    time.Time `json:"deadline" validate:"required"`
	CreatedAt   time.Time `json:"created_at"`
	TotalVotes  int       `json:"total_votes"`
}

type Option struct {
	ID     int    `json:"id"`
	PollID int    `json:"poll_id"`
	Text   string `json:"text" validate:"required,min=1,max=200"`
	Votes  int    `json:"votes"`
}

type VoteRequest struct {
	PollID   int    `json:"poll_id" validate:"required"`
	OptionID int    `json:"option_id" validate:"required"`
	VoterID  string `json:"-"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

type SuccessResponse struct {
	Message string `json:"message"`
}
