package database

import (
	"context"
	"voting-system/config"
	"voting-system/models"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Database struct {
	pool *pgxpool.Pool
}

func New(cfg *config.Config) (*Database, error) {
	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		return nil, err
	}

	if err := pool.Ping(context.Background()); err != nil {
		return nil, err
	}

	db := &Database{pool: pool}
	if err := db.Migrate(); err != nil {
		return nil, err
	}

	return db, nil
}

func (db *Database) Migrate() error {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS polls (
			id SERIAL PRIMARY KEY,
			title VARCHAR(200) NOT NULL,
			description TEXT,
			poll_type VARCHAR(20) NOT NULL DEFAULT 'single',
			max_choices INTEGER NOT NULL DEFAULT 1,
			deadline TIMESTAMP NOT NULL,
			created_at TIMESTAMP NOT NULL DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS options (
			id SERIAL PRIMARY KEY,
			poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
			text VARCHAR(200) NOT NULL,
			votes INTEGER NOT NULL DEFAULT 0
		)`,
		`CREATE TABLE IF NOT EXISTS votes (
			id SERIAL PRIMARY KEY,
			poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
			voter_id VARCHAR(255) NOT NULL,
			option_id INTEGER NOT NULL REFERENCES options(id) ON DELETE CASCADE,
			created_at TIMESTAMP NOT NULL DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_votes_poll_voter ON votes(poll_id, voter_id)`,
		`CREATE INDEX IF NOT EXISTS idx_options_poll ON options(poll_id)`,
	}

	for _, query := range queries {
		_, err := db.pool.Exec(context.Background(), query)
		if err != nil {
			return err
		}
	}

	migrationQueries := []string{
		`ALTER TABLE polls ADD COLUMN IF NOT EXISTS poll_type VARCHAR(20) NOT NULL DEFAULT 'single'`,
		`ALTER TABLE polls ADD COLUMN IF NOT EXISTS max_choices INTEGER NOT NULL DEFAULT 1`,
		`ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_poll_id_voter_id_key`,
	}

	for _, query := range migrationQueries {
		_, err := db.pool.Exec(context.Background(), query)
		if err != nil {
		}
	}

	return nil
}

func (db *Database) CreatePoll(poll *models.Poll) error {
	tx, err := db.pool.Begin(context.Background())
	if err != nil {
		return err
	}
	defer tx.Rollback(context.Background())

	err = tx.QueryRow(
		context.Background(),
		`INSERT INTO polls (title, description, poll_type, max_choices, deadline) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
		poll.Title, poll.Description, poll.PollType, poll.MaxChoices, poll.Deadline,
	).Scan(&poll.ID, &poll.CreatedAt)
	if err != nil {
		return err
	}

	for i := range poll.Options {
		err = tx.QueryRow(
			context.Background(),
			`INSERT INTO options (poll_id, text) VALUES ($1, $2) RETURNING id, votes`,
			poll.ID, poll.Options[i].Text,
		).Scan(&poll.Options[i].ID, &poll.Options[i].Votes)
		if err != nil {
			return err
		}
		poll.Options[i].PollID = poll.ID
	}

	return tx.Commit(context.Background())
}

func (db *Database) GetAllPolls() ([]models.Poll, error) {
	rows, err := db.pool.Query(
		context.Background(),
		`SELECT p.id, p.title, p.description, p.poll_type, p.max_choices, p.deadline, p.created_at, 
		       COALESCE(SUM(o.votes), 0) as total_votes,
		       COALESCE((SELECT COUNT(DISTINCT voter_id) FROM votes WHERE poll_id = p.id), 0) as total_voters
		 FROM polls p
		 LEFT JOIN options o ON p.id = o.poll_id
		 GROUP BY p.id
		 ORDER BY p.created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	polls := []models.Poll{}
	for rows.Next() {
		var poll models.Poll
		if err := rows.Scan(&poll.ID, &poll.Title, &poll.Description, &poll.PollType, &poll.MaxChoices, &poll.Deadline, &poll.CreatedAt, &poll.TotalVotes, &poll.TotalVoters); err != nil {
			return nil, err
		}
		polls = append(polls, poll)
	}

	return polls, nil
}

func (db *Database) GetPollByID(id int) (*models.Poll, error) {
	poll := models.Poll{
		Options: []models.Option{},
	}
	err := db.pool.QueryRow(
		context.Background(),
		`SELECT p.id, p.title, p.description, p.poll_type, p.max_choices, p.deadline, p.created_at,
		       COALESCE(SUM(o.votes), 0) as total_votes,
		       COALESCE((SELECT COUNT(DISTINCT voter_id) FROM votes WHERE poll_id = p.id), 0) as total_voters
		 FROM polls p
		 LEFT JOIN options o ON p.id = o.poll_id
		 WHERE p.id = $1
		 GROUP BY p.id`,
		id,
	).Scan(&poll.ID, &poll.Title, &poll.Description, &poll.PollType, &poll.MaxChoices, &poll.Deadline, &poll.CreatedAt, &poll.TotalVotes, &poll.TotalVoters)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	rows, err := db.pool.Query(
		context.Background(),
		`SELECT id, poll_id, text, votes FROM options WHERE poll_id = $1 ORDER BY id`,
		id,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var option models.Option
		if err := rows.Scan(&option.ID, &option.PollID, &option.Text, &option.Votes); err != nil {
			return nil, err
		}
		poll.Options = append(poll.Options, option)
	}

	return &poll, nil
}

func (db *Database) HasVoted(pollID int, voterID string) (bool, error) {
	var exists bool
	err := db.pool.QueryRow(
		context.Background(),
		`SELECT EXISTS(SELECT 1 FROM votes WHERE poll_id = $1 AND voter_id = $2)`,
		pollID, voterID,
	).Scan(&exists)
	return exists, err
}

func (db *Database) Vote(pollID int, optionIDs []int, voterID string) error {
	tx, err := db.pool.Begin(context.Background())
	if err != nil {
		return err
	}
	defer tx.Rollback(context.Background())

	for _, optionID := range optionIDs {
		var validOption bool
		err = tx.QueryRow(
			context.Background(),
			`SELECT EXISTS(SELECT 1 FROM options WHERE id = $1 AND poll_id = $2)`,
			optionID, pollID,
		).Scan(&validOption)
		if err != nil || !validOption {
			return err
		}

		_, err = tx.Exec(
			context.Background(),
			`INSERT INTO votes (poll_id, voter_id, option_id) VALUES ($1, $2, $3)`,
			pollID, voterID, optionID,
		)
		if err != nil {
			return err
		}

		_, err = tx.Exec(
			context.Background(),
			`UPDATE options SET votes = votes + 1 WHERE id = $1`,
			optionID,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit(context.Background())
}

func (db *Database) Close() {
	db.pool.Close()
}
