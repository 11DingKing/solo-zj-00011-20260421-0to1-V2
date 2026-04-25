package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strconv"
	"time"
	"voting-system/database"
	"voting-system/models"

	"github.com/go-playground/validator/v10"
	"github.com/labstack/echo/v4"
)

type Handler struct {
	db        *database.Database
	validator *validator.Validate
}

func New(db *database.Database) *Handler {
	return &Handler{
		db:        db,
		validator: validator.New(),
	}
}

func (h *Handler) GetPolls(c echo.Context) error {
	polls, err := h.db.GetAllPolls()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get polls"})
	}
	return c.JSON(http.StatusOK, polls)
}

func (h *Handler) GetPollByID(c echo.Context) error {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid poll ID"})
	}

	poll, err := h.db.GetPollByID(id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get poll"})
	}
	if poll == nil {
		return c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "Poll not found"})
	}

	voterID := h.getVoterID(c)
	hasVoted, _ := h.db.HasVoted(poll.ID, voterID)

	type PollResponse struct {
		*models.Poll
		HasVoted bool `json:"has_voted"`
		IsClosed bool `json:"is_closed"`
	}

	return c.JSON(http.StatusOK, PollResponse{
		Poll:     poll,
		HasVoted: hasVoted,
		IsClosed: time.Now().After(poll.Deadline),
	})
}

func (h *Handler) CreatePoll(c echo.Context) error {
	var poll models.Poll
	if err := c.Bind(&poll); err != nil {
		return c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request body"})
	}

	if err := h.validator.Struct(poll); err != nil {
		return c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Validation failed: " + err.Error()})
	}

	if poll.Deadline.Before(time.Now()) {
		return c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Deadline must be in the future"})
	}

	if len(poll.Options) < 2 || len(poll.Options) > 8 {
		return c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Must have between 2 and 8 options"})
	}

	if err := h.db.CreatePoll(&poll); err != nil {
		return c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to create poll"})
	}

	return c.JSON(http.StatusCreated, poll)
}

func (h *Handler) Vote(c echo.Context) error {
	pollIDStr := c.Param("id")
	pollID, err := strconv.Atoi(pollIDStr)
	if err != nil {
		return c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid poll ID"})
	}

	var req models.VoteRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Invalid request body"})
	}

	req.PollID = pollID

	if err := h.validator.Struct(req); err != nil {
		return c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Validation failed: " + err.Error()})
	}

	poll, err := h.db.GetPollByID(pollID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to get poll"})
	}
	if poll == nil {
		return c.JSON(http.StatusNotFound, models.ErrorResponse{Error: "Poll not found"})
	}

	if time.Now().After(poll.Deadline) {
		return c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Poll is closed"})
	}

	req.VoterID = h.getVoterID(c)

	hasVoted, err := h.db.HasVoted(pollID, req.VoterID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to check vote status"})
	}
	if hasVoted {
		return c.JSON(http.StatusBadRequest, models.ErrorResponse{Error: "Already voted"})
	}

	if err := h.db.Vote(pollID, req.OptionID, req.VoterID); err != nil {
		return c.JSON(http.StatusInternalServerError, models.ErrorResponse{Error: "Failed to vote"})
	}

	return c.JSON(http.StatusOK, models.SuccessResponse{Message: "Vote recorded successfully"})
}

func (h *Handler) getVoterID(c echo.Context) string {
	ip := c.RealIP()
	userAgent := c.Request().UserAgent()
	combined := ip + "|" + userAgent

	hash := sha256.Sum256([]byte(combined))
	return hex.EncodeToString(hash[:])
}
