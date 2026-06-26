package main

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// User represents the Postgres structure
type User struct {
	ID           string `json:"id"`
	Phone        string `json:"phone"`
	Email        string `json:"email"`
	PasswordHash string `json:"-"`
	Name         string `json:"name"`
	Role         string `json:"role"`
	IsVerified   bool   `json:"is_verified"`
}

// Job Workflow structure
type Job struct {
	ID               string    `json:"id"`
	CustomerID       string    `json:"customer_id"`
	FundiID          string    `json:"fundi_id,omitempty"`
	Title            string    `json:"title"`
	Description      string    `json:"description"`
	Category         string    `json:"category"`
	Workflow         string    `json:"workflow"` // instant, quotation
	Status           string    `json:"status"`   // pending, matching, accepted, en_route, started, completed
	Lat              float64   `json:"lat"`
	Lng              float64   `json:"lng"`
	Address          string    `json:"address"`
	ContractedAmount float64   `json:"contracted_amount"`
	EscrowStatus     string    `json:"escrow_status"` // unpaid, held, released, refunded
	CreatedAt        time.Time `json:"created_at"`
}

// WebSocket Hub
type Client struct {
	UserID string
	Conn   *websocket.Conn
	Send   chan []byte
}

type Hub struct {
	clients    map[string]*Client
	register   chan *Client
	unregister chan *Client
	mu         sync.Mutex
}

var hubInstance = Hub{
	clients:    make(map[string]*Client),
	register:   make(chan *Client),
	unregister: make(chan *Client),
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client.UserID] = client
			h.mu.Unlock()
			log.Printf("WS Connection Registered: User %s", client.UserID)
		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.UserID]; ok {
				delete(h.clients, client.UserID)
				close(client.Send)
			}
			h.mu.Unlock()
			log.Printf("WS Connection Deregistered: User %s", client.UserID)
		}
	}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow the cross-origin connection
	},
}

// Simple DB Mock in Go corresponding to Postgres seeds
var (
	users []User
	jobs  []Job
	mu    sync.Mutex
)

func init() {
	// Seed MANDATORY accounts
	users = append(users, User{
		ID:         "8eb107fa-3211-46ab-82cc-55270505291b",
		Email:      "admin@kazify.com",
		Name:       "System Administrator",
		Role:       "admin",
		IsVerified: true,
	})
	users = append(users, User{
		ID:         "7cb805bb-42df-4db2-943b-802af02f043e",
		Phone:      "+254700000001",
		Name:       "Asha Odhiambo",
		Role:       "customer",
		IsVerified: true,
	})
	users = append(users, User{
		ID:         "332c86b1-0988-466e-addd-4cb0cbf3737b",
		Phone:      "+254700000002",
		Name:       "Joseph Otieno",
		Role:       "fundi",
		IsVerified: true,
	})
}

func main() {
	go hubInstance.Run()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	r := gin.Default()

	// CORS Setup
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Endpoints
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "OK", "timestamp": time.Now()})
	})

	// Auth Login
	r.POST("/api/auth/login", func(c *gin.Context) {
		type LoginReq struct {
			Phone    string `json:"phone"`
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		var req LoginReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "bad request"})
			return
		}

		mu.Lock()
		defer mu.Unlock()

		var matched *User
		if req.Email != "" {
			for _, u := range users {
				if u.Email == req.Email {
					matched = &u
					break
				}
			}
		} else {
			for _, u := range users {
				if u.Phone == req.Phone {
					matched = &u
					break
				}
			}
		}

		if matched == nil {
			c.JSON(401, gin.H{"error": "Unauthorized user"})
			return
		}

		// Simple Token derivation
		tokenBytes := make([]byte, 16)
		rand.Read(tokenBytes)
		token := base64.StdEncoding.EncodeToString(tokenBytes)

		c.JSON(200, gin.H{
			"token": token,
			"user":  matched,
		})
	})

	// Service request creations
	r.POST("/api/jobs", func(c *gin.Context) {
		var job Job
		if err := c.ShouldBindJSON(&job); err != nil {
			c.JSON(400, gin.H{"error": "invalid model"})
			return
		}

		mu.Lock()
		job.ID = fmt.Sprintf("job_%d", time.Now().UnixNano())
		job.CreatedAt = time.Now()
		job.EscrowStatus = "unpaid"
		if job.Workflow == "instant" {
			job.Status = "matching"
		} else {
			job.Status = "pending"
		}
		jobs = append(jobs, job)
		mu.Unlock()

		// Broadcast new list update to all connected sockets
		log.Printf("New Service Dispatch posted: %s, Category: %s", job.Title, job.Category)
		c.JSON(201, job)
	})

	r.GET("/api/jobs", func(c *gin.Context) {
		mu.Lock()
		defer mu.Unlock()
		c.JSON(200, jobs)
	})

	// WebSocket handler endpoint
	r.GET("/ws", func(c *gin.Context) {
		userID := c.Query("user_id")
		if userID == "" {
			c.JSON(400, gin.H{"error": "user_id query required"})
			return
		}

		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Println("WebSocket Upgrade Failure:", err)
			return
		}

		cRef := &Client{
			UserID: userID,
			Conn:   conn,
			Send:   make(chan []byte, 256),
		}

		hubInstance.register <- cRef

		// KeepAlive / Read loop
		go func() {
			defer func() {
				hubInstance.unregister <- cRef
				conn.Close()
			}()
			for {
				_, _, err := conn.ReadMessage()
				if err != nil {
					break
				}
			}
		}()
	})

	// M-Pesa Simulated endpoints
	r.POST("/api/mpesa/stkpush", func(c *gin.Context) {
		type STKReq struct {
			Phone  string  `json:"phone_number"`
			Amount float64 `json:"amount"`
			JobID  string  `json:"job_id"`
		}
		var req STKReq
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(400, gin.H{"error": "bad request"})
			return
		}

		checkoutID := fmt.Sprintf("ws_CO_%d", time.Now().Unix())

		// Update Go state in background
		go func() {
			time.Sleep(3 * time.Second)
			mu.Lock()
			for i, j := range jobs {
				if j.ID == req.JobID {
					jobs[i].EscrowStatus = "held"
					log.Printf("M-Pesa STK Push Complete: Job %s escrow set to held successfully.", req.JobID)
				}
			}
			mu.Unlock()
		}()

		c.JSON(200, gin.H{
			"MerchantRequestID":   "KAZIFY-GO-MPESA",
			"CheckoutRequestID":   checkoutID,
			"ResponseDescription": "Success",
			"ResponseCode":        "0",
		})
	})

	log.Printf("Go Fiber/Gin Microservice launched on Port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Network host binding failed: %v", err)
	}
}
