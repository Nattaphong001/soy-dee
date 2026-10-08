// Command migrate manages schema migrations: status | up | down | baseline <version>.
package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strconv"

	"soydee-api/internal/config"
	"soydee-api/internal/database"
)

func main() {
	if len(os.Args) < 2 {
		log.Fatal("usage: migrate status | up | down | baseline <version>")
	}
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	// multiStatements lets one .sql file hold several statements.
	db, err := sql.Open("mysql", cfg.MySQLDSN()+"&multiStatements=true")
	if err != nil {
		log.Fatalf("open: %v", err)
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		log.Fatalf("ping: %v", err)
	}
	m, err := database.NewMigrator(db)
	if err != nil {
		log.Fatal(err)
	}

	switch os.Args[1] {
	case "status":
		lines, err := m.Status()
		check(err)
		for _, l := range lines {
			fmt.Println(l)
		}
	case "up":
		done, err := m.Up()
		for _, n := range done {
			fmt.Println("applied", n)
		}
		check(err)
		if len(done) == 0 {
			fmt.Println("nothing to apply")
		}
	case "down":
		name, err := m.Down()
		check(err)
		if name == "" {
			fmt.Println("nothing to revert")
		} else {
			fmt.Println("reverted", name)
		}
	case "baseline":
		if len(os.Args) < 3 {
			log.Fatal("usage: migrate baseline <version>")
		}
		v, err := strconv.Atoi(os.Args[2])
		check(err)
		check(m.Baseline(v))
		fmt.Println("baselined up to", v)
	default:
		log.Fatalf("unknown command %q", os.Args[1])
	}
}

func check(err error) {
	if err != nil {
		log.Fatal(err)
	}
}
