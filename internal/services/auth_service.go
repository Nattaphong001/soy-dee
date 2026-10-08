package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"soydee-api/internal/config"
	"soydee-api/internal/models"
	"soydee-api/internal/repositories"
	"soydee-api/pkg/utils"
)

const (
	RoleMember = "member"
	RoleAdmin  = "admin"

	tokenTypeAccess  = "access"
	tokenTypeRefresh = "refresh"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrTokenExpired       = errors.New("token expired")
	ErrTokenInvalid       = errors.New("token invalid")
)

// Claims is the JWT payload used for both member and admin sessions.
type Claims struct {
	UserID int    `json:"user_id"`
	Role   string `json:"role"`
	Type   string `json:"type"`
	jwt.RegisteredClaims
}

type AuthService struct {
	cfg        *config.Config
	memberRepo *repositories.MemberRepository
	systemRepo *repositories.SystemRepository
}

func NewAuthService(cfg *config.Config, memberRepo *repositories.MemberRepository, systemRepo *repositories.SystemRepository) *AuthService {
	return &AuthService{cfg: cfg, memberRepo: memberRepo, systemRepo: systemRepo}
}

type TokenPair struct {
	AccessToken  string
	RefreshToken string
	ExpiresIn    int64 // seconds, per API_SPEC.md §3.1
}

func (s *AuthService) LoginMember(ctx context.Context, username, password string) (*TokenPair, *models.MemberProfile, error) {
	member, err := s.memberRepo.FindByUsername(ctx, username)
	if errors.Is(err, repositories.ErrNotFound) {
		return nil, nil, ErrInvalidCredentials
	}
	if err != nil {
		return nil, nil, fmt.Errorf("find member by username: %w", err)
	}

	if !utils.CheckPassword(password, member.MbPasswordHash) {
		return nil, nil, ErrInvalidCredentials
	}

	pair, err := s.issueTokenPair(member.MbID, RoleMember)
	if err != nil {
		return nil, nil, err
	}
	return pair, member, nil
}

func (s *AuthService) LoginAdmin(ctx context.Context, username, password string) (*TokenPair, *models.SystemData, error) {
	admin, err := s.systemRepo.FindByUsername(ctx, username)
	if errors.Is(err, repositories.ErrNotFound) {
		return nil, nil, ErrInvalidCredentials
	}
	if err != nil {
		return nil, nil, fmt.Errorf("find admin by username: %w", err)
	}

	if !utils.CheckPassword(password, admin.SysPassword) {
		return nil, nil, ErrInvalidCredentials
	}

	pair, err := s.issueTokenPair(admin.SysID, RoleAdmin)
	if err != nil {
		return nil, nil, err
	}
	return pair, admin, nil
}

// Refresh validates a refresh token and issues a new access token.
func (s *AuthService) Refresh(refreshToken string) (*TokenPair, error) {
	claims, err := s.ParseToken(refreshToken)
	if err != nil {
		return nil, err
	}
	if claims.Type != tokenTypeRefresh {
		return nil, ErrTokenInvalid
	}
	return s.issueTokenPair(claims.UserID, claims.Role)
}

func (s *AuthService) issueTokenPair(userID int, role string) (*TokenPair, error) {
	access, err := s.generateToken(userID, role, tokenTypeAccess, s.cfg.JWTAccessTTL)
	if err != nil {
		return nil, fmt.Errorf("generate access token: %w", err)
	}
	refresh, err := s.generateToken(userID, role, tokenTypeRefresh, s.cfg.JWTRefreshTTL)
	if err != nil {
		return nil, fmt.Errorf("generate refresh token: %w", err)
	}
	return &TokenPair{
		AccessToken:  access,
		RefreshToken: refresh,
		ExpiresIn:    int64(s.cfg.JWTAccessTTL.Seconds()),
	}, nil
}

func (s *AuthService) generateToken(userID int, role, tokenType string, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID: userID,
		Role:   role,
		Type:   tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}

// ParseToken validates a token's signature/expiry and returns its claims.
// Exported so middleware can verify access tokens without depending on
// login business logic.
func (s *AuthService) ParseToken(tokenString string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		return []byte(s.cfg.JWTSecret), nil
	})

	if errors.Is(err, jwt.ErrTokenExpired) {
		return nil, ErrTokenExpired
	}
	if err != nil || !token.Valid {
		return nil, ErrTokenInvalid
	}
	return claims, nil
}
