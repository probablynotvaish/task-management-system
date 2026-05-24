package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
)

// exchangeEntry holds a JWT and the time it was inserted.
type exchangeEntry struct {
	jwt       string
	expiresAt time.Time
}

// tokenStore is a simple, goroutine-safe in-memory store that maps a
// short-lived opaque code to a JWT. Each code is single-use and expires
// after ttl. This avoids ever sending the JWT as a URL query parameter.
type tokenStore struct {
	mu    sync.Mutex
	store map[string]exchangeEntry
	ttl   time.Duration
}

var exchangeStore = &tokenStore{
	store: make(map[string]exchangeEntry),
	ttl:   60 * time.Second,
}

// put stores jwt under a freshly generated random code and returns the code.
func (s *tokenStore) put(jwt string) (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	code := hex.EncodeToString(b)

	s.mu.Lock()
	s.store[code] = exchangeEntry{jwt: jwt, expiresAt: time.Now().Add(s.ttl)}
	s.mu.Unlock()

	// Schedule cleanup so the map doesn't grow unboundedly.
	go func() {
		time.Sleep(s.ttl)
		s.mu.Lock()
		delete(s.store, code)
		s.mu.Unlock()
	}()

	return code, nil
}

// redeem returns the JWT for code and deletes the entry (single-use).
func (s *tokenStore) redeem(code string) (string, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	entry, ok := s.store[code]
	if !ok || time.Now().After(entry.expiresAt) {
		delete(s.store, code) // clean up expired entry
		return "", false
	}
	delete(s.store, code) // single-use
	return entry.jwt, true
}
