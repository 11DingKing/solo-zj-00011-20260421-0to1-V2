package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"time"
	"voting-system/config"
	"voting-system/database"
	"voting-system/handlers"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	cfg := config.Load()

	db, err := database.New(cfg)
	if err != nil {
		panic("Failed to connect to database: " + err.Error())
	}
	defer db.Close()

	h := handlers.New(db)

	e := echo.New()

	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins: []string{"*"},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete},
	}))

	api := e.Group("/api")
	{
		api.GET("/polls", h.GetPolls)
		api.POST("/polls", h.CreatePoll)
		api.GET("/polls/:id", h.GetPollByID)
		api.POST("/polls/:id/vote", h.Vote)
	}

	go func() {
		if err := e.Start(":" + cfg.Port); err != nil && err != http.ErrServerClosed {
			e.Logger.Fatal("Shutting down the server")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := e.Shutdown(ctx); err != nil {
		e.Logger.Fatal(err)
	}
}
