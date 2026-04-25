package models

import (
	"time"
)

type PollType string

const (
	PollTypeSingle   PollType = "single"
	PollTypeMultiple PollType = "multiple"
)

type Poll struct {
	ID          int       `json:"id"`
	Title       string    `json:"title" validate:"required,min=1,max=200"`
	Description string    `json:"description" validate:"max=1000"`
	Options     []Option  `json:"options" validate:"required,min=2,max=8,dive"`
	PollType    PollType  `json:"poll_type" validate:"required,oneof=single multiple"`
	MaxChoices  int       `json:"max_choices" validate:"min=1"`
	Deadline    time.Time `json:"deadline" validate:"required"`
	CreatedAt   time.Time `json:"created_at"`
	TotalVotes  int       `json:"total_votes"`
	TotalVoters int       `json:"total_voters"`
}

type Option struct {
	ID     int    `json:"id"`
	PollID int    `json:"poll_id"`
	Text   string `json:"text" validate:"required,min=1,max=200"`
	Votes  int    `json:"votes"`
}

type VoteRequest struct {
	PollID    int    `json:"poll_id"`
	OptionIDs []int  `json:"option_ids" validate:"required,min=1"`
	VoterID   string `json:"-"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

type SuccessResponse struct {
	Message string `json:"message"`
}
